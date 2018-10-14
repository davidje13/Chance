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

const PROG_FACE_FRAG_HELPER = `
	uniform sampler2D atlas;
	uniform sampler2D normalMap;
	uniform lowp float dotOpacity;
	uniform lowp float maxDepth;

	const lowp int depthSteps = 4;
	const lowp int depthTuneSteps = 2;
	const lowp vec2 regionSize = vec2(0.25, 0.25);

	lowp float depthAt(in lowp vec2 uv) {
		return texture2D(normalMap, uv).w * maxDepth;
	}

	lowp vec3 normalAt(in lowp vec2 uv) {
		return texture2D(normalMap, uv).xyz * 2.0 - 1.0;
	}

	lowp vec4 colourAt(in lowp vec2 uv) {
		return texture2D(atlas, uv);
	}

	lowp float intersectionX(lowp float x1, lowp float x2, lowp float y1, lowp float y2) {
		// returns intersection with line y = x
		return (x2 * y1 - x1 * y2) / (x2 - x1 + y1 - y2);
	}

	lowp float depthAt(in lowp vec2 uv, in lowp vec2 duv) {
		// thanks, http://apoorvaj.io/exploring-bump-mapping-with-webgl.html
		lowp float lastD = 0.0;
		lowp float nextD;
		lowp float lastDPos = 0.0;
		lowp float nextDPos = 0.0;
		lowp float depthScale = maxDepth / float(depthSteps - 1);
		for (lowp int i = 0; i < depthSteps; ++ i) {
			nextD = depthAt(uv + duv * nextDPos);
			if (nextD <= nextDPos) {
				break;
			}
			lastD = nextD;
			lastDPos = nextDPos;
			nextDPos += depthScale;
		}
		if (nextDPos == lastDPos) {
			return nextDPos;
		}
		// lastD * (1 - a) + nextD * a = lastDPos * (1 - a) + nextDPos * a
		// a = (lastD - lastDPos) / (nextDPos - nextD + lastD - lastDPos)
		// depth = lastDPos + (nextDPos - lastDPos) * a
		for (lowp int i = 0; i < depthTuneSteps; ++ i) {
			lowp float d = intersectionX(lastDPos, nextDPos, lastD, nextD);
			lowp float curD = depthAt(uv + duv * nextDPos);
			if (curD <= d) {
				nextDPos = d;
				nextD = curD;
			} else {
				lastDPos = d;
				lastD = curD;
			}
		}
		return intersectionX(lastDPos, nextDPos, lastD, nextD);
	}

	lowp vec2 getCubeUV(in lowp vec3 pos, out lowp mat3 faceD) {
		lowp vec2 region;
		lowp vec3 pp = abs(pos);
		if (pp.x > pp.y && pp.x > pp.z) {
			region = vec2(0.5, pos.x);
			faceD[0] = vec3(0.0, 1.0, 0.0);
			faceD[1] = vec3(0.0, 0.0, sign(pos.x));
		} else if (pp.y > pp.z) {
			region = vec2(1.5, pos.y);
			faceD[0] = vec3(0.0, 0.0, 1.0);
			faceD[1] = vec3(sign(pos.y), 0.0, 0.0);
		} else {
			region = vec2(2.5, pos.z);
			faceD[0] = vec3(1.0, 0.0, 0.0);
			faceD[1] = vec3(0.0, sign(pos.z), 0.0);
		}
		faceD[2] = cross(faceD[0], faceD[1]);
		region.y = step(0.0, region.y) + 0.5;
		return (region + (pos * faceD).xy * 0.5) * regionSize;
	}

	lowp vec4 applyFace(inout lowp vec3 pos, inout lowp vec3 norm, in lowp vec3 ray) {
		lowp mat3 faceD;
		lowp vec2 uv = getCubeUV(pos, faceD);
		lowp vec3 texSpaceRay = ray * faceD;
		lowp float zmult = -1.0 / texSpaceRay.z;
		lowp vec2 duv = texSpaceRay.xy * regionSize * 0.5 * zmult;

		lowp float depth = depthAt(uv, duv);
		pos += ray * depth * zmult;
		uv += duv * depth;

		faceD[2] = norm;
		norm = faceD * normalAt(uv);

		return colourAt(uv) * dotOpacity;
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
		lowp vec3 pos = p;
		lowp vec3 ray = normalize(p - eye);
		lowp vec3 norm = normalize(n);

		lowp vec4 faceTex = applyFace(pos, norm, ray);
		lowp vec3 matt = faceTex.rgb + baseColAt(pos) * (1.0 - faceTex.a);
		gl_FragColor = applyLighting(matt, rot * norm, rot * reflect(ray, norm));
	}
`;

const PROG_TRUNC_BALL_FRAG = `
	uniform lowp mat3 rot;
	uniform highp vec3 eye;
	uniform lowp float radius;
	uniform lowp float invFaceRad;
	uniform lowp float rounding;
	varying lowp vec3 p;
	varying lowp vec3 n;

	void main() {
		lowp vec3 ray = normalize(p - eye);
		lowp float lo = -dot(ray, eye);
		lowp float root = lo * lo + radius * radius - dot(eye, eye);
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
			if (any(greaterThan(pos * sign(ray), vec3(1.0)))) {
				discard;
			}
		}
		lowp vec3 norm = normalize(mix(
			n,
			pos,
			smoothstep(1.0 - rounding, 1.0 + rounding, length(pos - n) * invFaceRad)
		));

		lowp vec4 faceTex = applyFace(pos, norm, ray);
		lowp vec3 matt = faceTex.rgb + baseColAt(pos) * (1.0 - faceTex.a);
		gl_FragColor = applyLighting(matt, rot * norm, rot * reflect(ray, norm));
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

		const maxDepth = 0.1;
		const worldFaceWidth = 2.0;
		const normalMapFaceWidth = 0.25;
		const normalMapFaceDepth = maxDepth * normalMapFaceWidth / worldFaceWidth;

		this.atlas = new Texture2D(gl, {
			[gl.TEXTURE_MAG_FILTER]: gl.LINEAR,
			[gl.TEXTURE_MIN_FILTER]: gl.LINEAR,
			[gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
			[gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE,
		});
		this.atlas.setSolid(0, 0, 0, 0);
		this.atlas.loadImage('resources/dice/atlas.png');

		this.normalMap = new Texture2D(gl, {
			[gl.TEXTURE_MAG_FILTER]: gl.LINEAR,
			[gl.TEXTURE_MIN_FILTER]: gl.LINEAR,
			[gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
			[gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE,
		});
		this.normalMap.setSolid(0.5, 0.5, 1.0, 1.0);
		this.normalMap.generateNormalMap('resources/dice/depth.png', normalMapFaceDepth);

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
			'maxDepth': maxDepth,
		};

		this.shapes = new Map();
		this.materials = new Map();
		this.programs = new Map();

		this.shapes.set('cube', {
			prog: 'shape',
			geom: new Cube({rounding: 0.05, segmentation: 2}),
		});
		this.shapes.set('cube-fillet', {
			prog: 'shape',
			geom: new Cube({rounding: 0.2, segmentation: 8}),
		});
		this.shapes.set('cube-clipped', {
			prog: 'rounded',
			geom: new Cube(),
			props: {
				'radius': 1.5,
				'invFaceRad': 1 / Math.sqrt(1.5 * 1.5 - 1),
				'rounding': 0.02,
			},
		});
		this.shapes.set('cube-rounded', {
			prog: 'rounded',
			geom: new Cube(),
			props: {
				'radius': 1.37,
				'invFaceRad': 1 / Math.sqrt(1.37 * 1.37 - 1),
				'rounding': 0.05,
			},
		});

		this.materials.set('wood', {prog: 'grain', props: {
			'textureVolumeTransform': texVolumeTransform,
			'ambientCol': [0.6, 0.6, 0.6],
			'lightCol': [0.35, 0.35, 0.35],
			'shineCol': [0, 0, 0, 0],
			'dotOpacity': 0.9,
		}});

		this.materials.set('wood-varnished', {prog: 'grain', props: {
			'textureVolumeTransform': texVolumeTransform,
			'ambientCol': [0.5, 0.5, 0.5],
			'lightCol': [0.5, 0.5, 0.5],
			'shineCol': [1.0, 1.0, 0.95, 0.1],
			'dotOpacity': 0.9,
		}});

		this.materials.set('metal', {prog: 'flat', props: {
			'matt': [0.96, 0.98, 1.0],
			'ambientCol': [0.1, 0.1, 0.1],
			'lightCol': [0.6, 0.6, 0.6],
			'shineCol': [1.0, 1.0, 1.0, 0.8],
			'dotOpacity': 0.0,
		}});

		this.materials.set('plastic', {prog: 'flat', props: {
			'matt': [0.95, 0.95, 0.97],
			'ambientCol': [0.6, 0.6, 0.6],
			'lightCol': [0.4, 0.4, 0.4],
			'shineCol': [1.0, 1.0, 1.0, 0.3],
			'dotOpacity': 1.0,
		}});

		this.materials.set('plastic-red', {prog: 'flat', props: {
			'matt': [0.8, 0.2, 0.1],
			'ambientCol': [0.6, 0.6, 0.6],
			'lightCol': [0.4, 0.4, 0.4],
			'shineCol': [1.0, 0.9, 0.8, 0.2],
			'dotOpacity': 1.0,
		}});

		const vertShader = new VertexShader(gl, PROG_SHAPE_VERT);

		this.programs.set('shape grain', new Program(gl, [
			vertShader,
			new FragmentShader(gl,
				PROG_FACE_FRAG_HELPER +
				PROG_GLOSS_FRAG_HELPER +
				PROG_GRAIN_FRAG_HELPER +
				PROG_SHAPE_FRAG
			),
		]));

		this.programs.set('rounded grain', new Program(gl, [
			vertShader,
			new FragmentShader(gl,
				PROG_FACE_FRAG_HELPER +
				PROG_GLOSS_FRAG_HELPER +
				PROG_GRAIN_FRAG_HELPER +
				PROG_TRUNC_BALL_FRAG
			),
		]));

		this.programs.set('shape flat', new Program(gl, [
			vertShader,
			new FragmentShader(gl,
				PROG_FACE_FRAG_HELPER +
				PROG_GLOSS_FRAG_HELPER +
				PROG_FLAT_FRAG_HELPER +
				PROG_SHAPE_FRAG
			),
		]));

		this.programs.set('rounded flat', new Program(gl, [
			vertShader,
			new FragmentShader(gl,
				PROG_FACE_FRAG_HELPER +
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
			mView.translate(die.position.x, die.position.y, die.position.z - 15);

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
				'atlas': this.atlas,
				'normalMap': this.normalMap,
			}, this.worldProps, shape.props, material.props));
			shape.geom.render(gl);
		}
	}

	dom() {
		return this.canvas.dom();
	}
};
