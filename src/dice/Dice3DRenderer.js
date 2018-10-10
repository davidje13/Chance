import Canvas from '../3d/Canvas.js';
import Program from '../3d/Program.js';
import {VertexShader, FragmentShader} from '../3d/Shader.js';
import {Texture2D} from '../3d/Texture.js';
import ScreenQuad from '../3d/ScreenQuad.js';
import {M4} from '../math/Matrix.js';

import RoundedCube from './RoundedCube.js';

const PROG_SHAPE_VERT = `
	uniform mat4 projview;
	uniform mat3 rot;
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

		this.shapeProg = new Program(gl, [
			new VertexShader(gl, PROG_SHAPE_VERT),
			new FragmentShader(gl, PROG_SHAPE_FRAG),
		]);
	}

	resize(width, height) {
		this.canvas.resize(width, height);
	}

	render(dice) {
		const gl = this.canvas.gl;
		gl.clear(gl.COLOR_BUFFER_BIT);

		const mProj = M4.perspective(0.6, this.canvas.width() / this.canvas.height(), 1.0, 100.0);

		this.shape.bind(gl);
		this.shapeProg.use();
		this.shapeProg.vertexAttribPointer({
			'pos': {size: 3, type: gl.FLOAT, stride: this.shape.stride * 4, offset: 0 * 4},
			'norm': {size: 3, type: gl.FLOAT, stride: this.shape.stride * 4, offset: 3 * 4},
		});

		for (const die of dice) {
			const mView = M4.fromQuaternion(die.rotation);
			mView.translate(die.position.x, die.position.y, die.position.z - 10);

			this.shapeProg.uniform({
				'projview': mView.mult(mProj),
				'rot': mView.as3(),
			});
			this.shape.render(gl);
		}
	}

	dom() {
		return this.canvas.dom();
	}
};
