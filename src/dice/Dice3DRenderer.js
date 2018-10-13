import Canvas from '../3d/Canvas.js';
import Program from '../3d/Program.js';
import {VertexShader, FragmentShader} from '../3d/Shader.js';
import {Texture2D} from '../3d/Texture.js';
import Cube from '../3d/Cube.js';
import {M4} from '../math/Matrix.js';
import Quaternion from '../math/Quaternion.js';

const PROG_GLOSS_FRAG_HELPER = `
	uniform lowp vec3 ambientCol;
	uniform lowp vec3 lightCol;
	uniform lowp vec4 shineCol;

	uniform lowp vec3 lightDir;
	uniform lowp vec3 shineDir;

	lowp vec4 applyLighting(
		in lowp vec3 matt,
		in lowp vec3 norm,
		in lowp vec3 ref
	) {
		return vec4(
			mix(
				matt * (ambientCol + lightCol * dot(norm, lightDir)),
				shineCol.rgb,
				smoothstep(0.49, 0.51, dot(ref, shineDir)) * shineCol.a
			),
			1.0
		);
	}
`;

const PROG_GRAIN_FRAG_HELPER = `
	uniform lowp mat4 textureVolumeTransform;

	lowp vec3 baseColAt(in lowp vec3 pos) {
		lowp vec4 woodPos = textureVolumeTransform * vec4(pos, 1.0);
		lowp float wood = fract(length(woodPos.xy));
		return mix(vec3(0.88, 0.66, 0.48), vec3(0.86, 0.62, 0.44), wood);
	}
`;

const PROG_FLAT_FRAG_HELPER = `
	uniform lowp vec3 matt;

	lowp vec3 baseColAt(in lowp vec3 pos) {
		return matt;
	}
`;

const PROG_SHAPE_VERT = `
	uniform lowp mat4 projview;
	attribute vec4 pos;
	attribute vec3 norm;
	varying lowp vec3 p;
	varying lowp vec3 n;
	void main() {
		p = pos.xyz;
		n = norm;
		gl_Position = projview * pos;
	}
`;

const PROG_SHAPE_FRAG = `
	uniform lowp mat3 rot;
	uniform highp vec3 eye;
	varying lowp vec3 p;
	varying lowp vec3 n;

	void main() {
		lowp vec3 ray = normalize(p - eye);
		gl_FragColor = applyLighting(baseColAt(p), rot * n, rot * reflect(ray, n));
	}
`;

const PROG_TRUNC_BALL_FRAG = `
	uniform lowp mat3 rot;
	uniform highp vec3 eye;
	varying lowp vec3 p;
	varying lowp vec3 n;

	const lowp float r = 1.37;
	const lowp float faceR = 1.0;
	const lowp float rounding = 0.05;

	const lowp float invFaceRad = inversesqrt(r * r - faceR * faceR);

	void main() {
		lowp vec3 ray = normalize(p - eye);
		lowp float lo = -dot(ray, eye);
		lowp float root = lo * lo + r * r - dot(eye, eye);
		if (root < 0.0) {
			discard;
		}
		root = sqrt(root);
		highp float dSphereNear = lo - root;
		highp float dShapeNear = dot(p - eye, ray);
		mediump vec3 pos;
		if (dShapeNear > dSphereNear) {
			highp float dSphereFar = lo + root;
			if (dShapeNear > dSphereFar) {
				discard;
			}
			pos = p;
		} else {
			pos = eye + ray * dSphereNear;
			if (any(greaterThan(abs(pos - n), vec3(faceR)))) {
				discard;
			}
		}
		lowp vec3 norm = normalize(mix(
			n,
			pos,
			smoothstep(1.0 - rounding, 1.0 + rounding, length(pos - n * faceR) * invFaceRad)
		));
		gl_FragColor = applyLighting(baseColAt(pos), rot * norm, rot * reflect(ray, norm));
	}
`;

function normalize(v) {
	const m = 1 / Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
	return [v[0] * m, v[1] * m, v[2] * m];
}

export default class Dice3DRenderer {
	constructor() {
		this.canvas = new Canvas(1, 1, {
			alpha: true,
			antialias: true,
			depth: false,
			powerPreference: 'low-power',
			premultipliedAlpha: true,
			preserveDrawingBuffer: false,
			stencil: false,
		});
		this.canvas.dom().className = 'render';

		const gl = this.canvas.gl;

		gl.clearColor(0, 0, 0, 0);
		gl.cullFace(gl.BACK);
		gl.enable(gl.CULL_FACE);

		const texVolumeTransform = M4.fromQuaternion(Quaternion.fromRotation({
			x: 0.2,
			y: 0.8,
			z: 0.3,
			angle: 0.8,
		}));
		texVolumeTransform.translate(1.0, -2.0, 0.5);
		texVolumeTransform.scale(5.0);

		this.worldProps = {
			'lightDir': normalize([0.0, 0.5, 1.0]),
			'shineDir': normalize([0.0, 2.0, 1.0]),
		};

		this.shapes = new Map();
		this.materials = new Map();
		this.programs = new Map();

		this.shapes.set('cube', {
			prog: 'shape',
			geom: new Cube({rounding: 0.03, segmentation: 2}),
		});
		this.shapes.set('cube-fillet', {
			prog: 'shape',
			geom: new Cube({rounding: 0.15, segmentation: 8}),
		});
		this.shapes.set('cube-rounded', {
			prog: 'rounded',
			geom: new Cube(),
		});

		this.materials.set('wood', {prog: 'grain', props: {
			'textureVolumeTransform': texVolumeTransform,
			'ambientCol': [0.5, 0.5, 0.5],
			'lightCol': [0.5, 0.5, 0.5],
			'shineCol': [1.0, 1.0, 0.95, 0.1],
		}});

		this.materials.set('plastic', {prog: 'flat', props: {
			'matt': [0.95, 0.95, 0.97],
			'ambientCol': [0.6, 0.6, 0.6],
			'lightCol': [0.4, 0.4, 0.4],
			'shineCol': [1.0, 1.0, 1.0, 0.4],
		}});

		this.materials.set('plastic-red', {prog: 'flat', props: {
			'matt': [0.8, 0.2, 0.1],
			'ambientCol': [0.6, 0.6, 0.6],
			'lightCol': [0.4, 0.4, 0.4],
			'shineCol': [1.0, 0.9, 0.8, 0.4],
		}});

		const vertShader = new VertexShader(gl, PROG_SHAPE_VERT);

		this.programs.set('shape grain', new Program(gl, [
			vertShader,
			new FragmentShader(gl,
				PROG_GLOSS_FRAG_HELPER +
				PROG_GRAIN_FRAG_HELPER +
				PROG_SHAPE_FRAG
			),
		]));

		this.programs.set('rounded grain', new Program(gl, [
			vertShader,
			new FragmentShader(gl,
				PROG_GLOSS_FRAG_HELPER +
				PROG_GRAIN_FRAG_HELPER +
				PROG_TRUNC_BALL_FRAG
			),
		]));

		this.programs.set('shape flat', new Program(gl, [
			vertShader,
			new FragmentShader(gl,
				PROG_GLOSS_FRAG_HELPER +
				PROG_FLAT_FRAG_HELPER +
				PROG_SHAPE_FRAG
			),
		]));

		this.programs.set('rounded flat', new Program(gl, [
			vertShader,
			new FragmentShader(gl,
				PROG_GLOSS_FRAG_HELPER +
				PROG_FLAT_FRAG_HELPER +
				PROG_TRUNC_BALL_FRAG
			),
		]));
	}

	resize(width, height) {
		this.canvas.resize(width, height);
	}

	render(dice) {
		const gl = this.canvas.gl;
		gl.clear(gl.COLOR_BUFFER_BIT);

		const mProj = M4.perspective(0.6, this.canvas.width() / this.canvas.height(), 1.0, 100.0);

		for (const die of dice) {
			const mView = M4.fromQuaternion(die.rotation);
			mView.translate(die.position.x, die.position.y, die.position.z - 10);

			const shape = this.shapes.get(die.style.shape);
			const material = this.materials.get(die.style.material);

			const prog = this.programs.get(shape.prog + ' ' + material.prog);

			shape.geom.bind(gl);
			prog.use(Object.assign({
				'projview': mView.mult(mProj),
				'eye': mView.invert().apply3([0, 0, 0]),
				'rot': mView.as3(),
				'pos': shape.geom.boundVertices(),
				'norm': shape.geom.boundNormals(),
			}, this.worldProps, material.props));
			shape.geom.render(gl);
		}
	}

	dom() {
		return this.canvas.dom();
	}
};
