import Canvas from '../3d/Canvas.js';
import Program from '../3d/Program.js';
import {VertexShader, FragmentShader} from '../3d/Shader.js';
import {Texture2D} from '../3d/Texture.js';
import ScreenQuad from '../3d/ScreenQuad.js';
import {M4} from '../math/Matrix.js';

import RoundedCube from './RoundedCube.js';

const PROG_SHAPE_VERT = `
	uniform lowp mat4 projview;
	uniform lowp mat3 rot;
	attribute vec4 pos;
	attribute vec3 norm;
	varying lowp vec3 n;
	void main() {
		gl_Position = projview * pos;
		n = rot * norm;
	}
`;

const PROG_SHAPE_FRAG = `
	varying lowp vec3 n;

	const lowp vec3 light = vec3(0.0, 0.0, 1.0);
	const lowp float ambient = 0.5;
	const lowp vec3 matt = vec3(0.95, 0.95, 0.95);

	void main() {
		gl_FragColor = vec4(matt * mix(ambient, 1.0, dot(n, light)), 1.0);
	}
`;

const PROG_RAY_VERT = `
	uniform lowp mat4 invprojview;
	uniform lowp float near;
	uniform lowp float far;
	attribute vec2 pos;
	varying lowp vec3 o;
	varying lowp vec3 ray;
	void main() {
		gl_Position = vec4(pos, 0.0, 1.0);
		o = (invprojview * vec4(pos, -1.0, 1.0) * near).xyz;
		ray = (invprojview * vec4(pos * (far - near), far + near, far - near)).xyz;
	}
`;

const PROG_RAY_BALL_FRAG = `
	uniform lowp mat3 rot;
	varying lowp vec3 o;
	varying lowp vec3 ray;

	const lowp vec3 light = vec3(0.0, 0.0, 1.0);
	const lowp float ambient = 0.5;
	const lowp vec3 matt = vec3(0.95, 0.95, 0.95);
	const lowp float r = 1.37;
	const lowp float faceR = 1.0;

	void main() {
		lowp vec3 l = normalize(ray);
		lowp float lo = dot(l, o);
		lowp float root = lo * lo + r * r - dot(o, o);
		if (root < 0.0 || lo > 0.0 || root > lo * lo) {
			discard;
		}
		lowp float d = -lo - sqrt(root);
		lowp vec3 pos = o + l * d;
		lowp vec3 n;
		if (pos.x > faceR) {
			d = (faceR - o.x) / l.x;
			n = vec3(1.0, 0.0, 0.0);
		} else if (pos.y > faceR) {
			d = (faceR - o.y) / l.y;
			n = vec3(0.0, 1.0, 0.0);
		} else if (pos.z > faceR) {
			d = (faceR - o.z) / l.z;
			n = vec3(0.0, 0.0, 1.0);
		} else if (pos.x < -faceR) {
			d = (-faceR - o.x) / l.x;
			n = vec3(-1.0, 0.0, 0.0);
		} else if (pos.y < -faceR) {
			d = (-faceR - o.y) / l.y;
			n = vec3(0.0, -1.0, 0.0);
		} else if (pos.z < -faceR) {
			d = (-faceR - o.z) / l.z;
			n = vec3(0.0, 0.0, -1.0);
		} else {
			n = pos / r;
		}
		pos = o + l * d;
		if (dot(pos, pos) > r * r + 0.0001) {
			discard;
		}
		n = rot * n;
		gl_FragColor = vec4(matt * mix(ambient, 1.0, dot(n, light)), 1.0);
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

		this.shape = new RoundedCube({rounding: 0.15, segmentation: 8});
		this.screenQuad = new ScreenQuad();

		this.shapeProg = new Program(gl, [
			new VertexShader(gl, PROG_SHAPE_VERT),
			new FragmentShader(gl, PROG_SHAPE_FRAG),
		]);

		this.rayBallProg = new Program(gl, [
			new VertexShader(gl, PROG_RAY_VERT),
			new FragmentShader(gl, PROG_RAY_BALL_FRAG),
		]);
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

		this.shape.bind(gl);
		this.shapeProg.use();
		this.shapeProg.vertexAttribPointer({
			'pos': {size: 3, type: gl.FLOAT, stride: this.shape.stride * 4, offset: 0 * 4},
			'norm': {size: 3, type: gl.FLOAT, stride: this.shape.stride * 4, offset: 3 * 4},
		});

		for (const die of dice) {
			if (die.style.shape !== 'cube') {
				continue;
			}
			const mView = M4.fromQuaternion(die.rotation);
			mView.translate(die.position.x, die.position.y, die.position.z - 10);

			this.shapeProg.uniform({
				'projview': mView.mult(mProj),
				'rot': mView.as3(),
			});
			this.shape.render(gl);
		}

		this.screenQuad.bind(gl);
		this.rayBallProg.use();
		this.rayBallProg.vertexAttribPointer({
			'pos': {size: 2, type: gl.FLOAT, stride: this.screenQuad.stride * 4},
		});

		for (const die of dice) {
			if (die.style.shape !== 'rounded') {
				continue;
			}
			const mView = M4.fromQuaternion(die.rotation);
			mView.translate(die.position.x, die.position.y, die.position.z - 10);

			this.rayBallProg.uniform({
				'invprojview': mView.mult(mProj).invert(),
				'near': near,
				'far': far,
				'rot': mView.as3(),
			});
			this.screenQuad.render(gl);
		}
	}

	dom() {
		return this.canvas.dom();
	}
};
