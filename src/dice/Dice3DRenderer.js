import Canvas from '../3d/Canvas.js';
import Program from '../3d/Program.js';
import {VertexShader, FragmentShader} from '../3d/Shader.js';
import {Texture2D} from '../3d/Texture.js';
import ScreenQuad from '../3d/ScreenQuad.js';
import {M4} from '../math/Matrix.js';
import Quaternion from '../math/Quaternion.js';

import RoundedCube from './RoundedCube.js';

const PROG_WOOD_FRAG_HELPER = `
	uniform lowp mat4 textureVolumeTransform;

	const lowp vec3 light = normalize(vec3(0.0, 0.5, 1.0));
	const lowp vec3 shine = normalize(vec3(0.0, 2.0, 1.0));
	const lowp vec3 ambientCol = vec3(0.5);
	const lowp vec3 lightCol = vec3(0.5);
	const lowp vec4 shineCol = vec4(1.0, 1.0, 0.95, 0.1);

	lowp vec4 baseColAt(in lowp vec3 pos, in lowp vec3 norm, in lowp vec3 ref) {
		lowp vec4 woodPos = textureVolumeTransform * vec4(pos, 1.0);
		lowp float wood = fract(length(woodPos.xy));
		lowp vec3 matt = mix(vec3(0.88, 0.66, 0.48), vec3(0.86, 0.62, 0.44), wood);
		return vec4(
			mix(
				matt * (ambientCol + lightCol * dot(norm, light)),
				shineCol.rgb,
				smoothstep(0.49, 0.51, dot(ref, shine)) * shineCol.a
			),
			1.0
		);
	}
`;

const PROG_PLASTIC_FRAG_HELPER = `
	const lowp vec3 light = normalize(vec3(0.0, 0.5, 1.0));
	const lowp vec3 shine = normalize(vec3(0.0, 2.0, 1.0));
	const lowp vec3 ambientCol = vec3(0.6);
	const lowp vec3 lightCol = vec3(0.4);
	const lowp vec4 shineCol = vec4(1.0, 1.0, 1.0, 0.4);
	const lowp vec3 matt = vec3(0.95, 0.95, 0.97);

	lowp vec4 baseColAt(in lowp vec3 pos, in lowp vec3 norm, in lowp vec3 ref) {
		return vec4(
			mix(
				matt * (ambientCol + lightCol * dot(norm, light)),
				shineCol.rgb,
				smoothstep(0.49, 0.51, dot(ref, shine)) * shineCol.a
			),
			1.0
		);
	}
`;

const PROG_SHAPE_VERT = `
	uniform lowp mat4 projview;
	uniform lowp mat3 rot;
	attribute vec4 pos;
	attribute vec3 norm;
	varying lowp vec3 p;
	varying lowp vec3 n;
	void main() {
		p = pos.xyz;
		n = rot * norm;
		gl_Position = projview * pos;
	}
`;

const PROG_SHAPE_FRAG = `
	varying lowp vec3 p;
	varying lowp vec3 n;

	void main() {
		gl_FragColor = baseColAt(p, n, vec3(0.0));
	}
`;

const PROG_RAY_VERT = `
	uniform lowp mat4 invprojview;
	uniform lowp float near;
	uniform lowp float far;
	attribute vec2 pos;
	varying highp vec3 o;
	varying highp vec3 ray;
	void main() {
		gl_Position = vec4(pos, 0.0, 1.0);
		o = (invprojview * vec4(pos, -1.0, 1.0) * near).xyz;
		ray = (invprojview * vec4(pos * (far - near), far + near, far - near)).xyz;
	}
`;

const PROG_RAY_BALL_FRAG = `
	uniform lowp mat3 rot;
	varying highp vec3 o;
	varying highp vec3 ray;

	const lowp float r = 1.4;
	const lowp float faceR = 1.0;
	const lowp float rounding = 0.1;

	const lowp float invFaceR = 0.5 / faceR;
	const lowp float faceRad = sqrt(r * r - faceR * faceR);

	void main() {
		lowp vec3 l = normalize(ray);
		lowp float lo = -dot(l, o);
		lowp float root = lo * lo + r * r - dot(o, o);
		if (root < 0.0 || lo < 0.0 || root > lo * lo) {
			discard;
		}
		root = sqrt(root);
		highp float d = lo - root;
		mediump vec3 pos = o + l * d;
		lowp vec3 n = sign(floor(pos * invFaceR + 0.5));
		if (dot(n, n) > 0.0) {
			lowp float ln = dot(l, n);
			d = (faceR - dot(o, n)) / ln;
			if (ln >= 0.0 || d > lo + root) {
				discard;
			}
			pos = o + l * d;
			n = normalize(mix(
				n,
				pos,
				smoothstep(1.0 - rounding, 1.0, length(pos - n * faceR) / faceRad)
			));
		} else {
			n = pos / r;
		}
		gl_FragColor = baseColAt(pos, rot * n, rot * reflect(l, n));
	}
`;

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

		this.roundedCube = new RoundedCube({rounding: 0.15, segmentation: 8});
		this.raytraceQuad = new ScreenQuad();

		this.programs = new Map();

		this.programs.set('cube wood', new Program(gl, [
			new VertexShader(gl, PROG_SHAPE_VERT),
			new FragmentShader(gl, PROG_WOOD_FRAG_HELPER + PROG_SHAPE_FRAG),
		]));

		this.programs.set('rounded wood', new Program(gl, [
			new VertexShader(gl, PROG_RAY_VERT),
			new FragmentShader(gl, PROG_WOOD_FRAG_HELPER + PROG_RAY_BALL_FRAG),
		]));

		this.programs.set('cube plastic', new Program(gl, [
			new VertexShader(gl, PROG_SHAPE_VERT),
			new FragmentShader(gl, PROG_PLASTIC_FRAG_HELPER + PROG_SHAPE_FRAG),
		]));

		this.programs.set('rounded plastic', new Program(gl, [
			new VertexShader(gl, PROG_RAY_VERT),
			new FragmentShader(gl, PROG_PLASTIC_FRAG_HELPER + PROG_RAY_BALL_FRAG),
		]));

		this.texVolumeTransform = M4.fromQuaternion(Quaternion.fromRotation({
			x: 0.2,
			y: 0.8,
			z: 0.3,
			angle: 0.8,
		}));
		this.texVolumeTransform.translate(1.0, -2.0, 0.5);
		this.texVolumeTransform.scale(5.0);
	}

	resize(width, height) {
		this.canvas.resize(width, height);
	}

	render(dice) {
		const gl = this.canvas.gl;
		gl.clear(gl.COLOR_BUFFER_BIT);

		const near = 1.0;
		const far = 100.0;

		const mProj = M4.perspective(0.6, this.canvas.width() / this.canvas.height(), near, far);

		for (const die of dice) {
			const mView = M4.fromQuaternion(die.rotation);
			mView.translate(die.position.x, die.position.y, die.position.z - 10);
			const mProjView = mView.mult(mProj);

			const prog = this.programs.get(die.style.shape + ' ' + die.style.material);
			const shape = (die.style.shape === 'cube') ? this.roundedCube : this.raytraceQuad;

			shape.bind(gl);
			prog.use({
				'textureVolumeTransform': this.texVolumeTransform,
				'projview': mProjView,
				'invprojview': mProjView.invert(),
				'rot': mView.as3(),
				'pos': shape.boundVertices(),
				'norm': shape.boundNormals(),
				'near': near,
				'far': far,
			});
			shape.render(gl);
		}
	}

	dom() {
		return this.canvas.dom();
	}
};
