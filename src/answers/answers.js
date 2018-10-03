import Program from './Program.js';
import {VertexShader, FragmentShader} from './Shader.js';
import {Texture2D} from './Texture.js';
import Icosahedron from './Icosahedron.js';
import {M4} from './Matrix.js';
import Quaternion from './Quaternion.js';

const BALL_SIZE = 350;
const HOLE_SIZE = 180;
const CHAMFER_SIZE = 3;

function make(tag, className) {
	const o = document.createElement(tag);
	o.className = className;
	return o;
}

function setSize(o, size) {
	o.style.width = `${size}px`;
	o.style.height = `${size}px`;
	o.style.marginLeft = `${-size / 2}px`;
	o.style.marginTop = `${-size / 2}px`;
}

const LETTER_DEPTH = 0.03;

const PROG_ICO_VERT = `
	uniform mat4 projview;
	attribute vec4 pos;
	attribute vec4 tex;
	varying highp vec2 t1;
	varying highp vec2 t2;
	varying lowp float dp;
	void main() {
		gl_Position = projview * pos;
		dp = gl_Position.z;
		t1 = tex.xy;
		t2 = tex.zw;
	}
`;

const PROG_ICO_FRAG = `
	uniform sampler2D atlas;
	uniform sampler2D tiles;
	varying highp vec2 t1;
	varying highp vec2 t2;
	varying lowp float dp;
	void main() {
		if(dp > 0.5) {
			discard;
		}
		gl_FragColor = vec4(
			mix(
				texture2D(atlas, t1).xyz,
				mix(
					vec3(0.0, 0.3, 0.9),
					vec3(0.0, 0.0, 0.0),
					max(dp, 0.0) * 2.0
				),
				smoothstep(
					max(dp - texture2D(tiles, t2).x * ${LETTER_DEPTH * 1.6}, 0.0),
					0.0,
					${LETTER_DEPTH}
				)
			),
			1.0
		);
	}
`;

const PROG_COVER_VERT = `
	attribute vec4 pos;
	attribute vec2 tex;
	varying lowp vec2 t;
	void main() {
		gl_Position = pos;
		t = tex;
	}
`;

const PROG_COVER_FRAG = `
	uniform sampler2D atlas;
	varying lowp vec2 t;
	void main() {
		gl_FragColor = texture2D(atlas, t);
	}
`;

class ShapeSimulator {
	constructor() {
		this.ang = Quaternion.identity();
		this.vel = Quaternion.identity();
		this.dep = -2;
	}

	randomise(randomSource, speed) {
		this.vel = Quaternion.fromRotation({
			x: randomSource.nextFloat() * 2 - 1,
			y: randomSource.nextFloat() * 2 - 1,
			z: randomSource.nextFloat() * 2 - 1,
			angle: randomSource.nextFloat() * speed * 2 - speed,
		});
	}

	step() {
		this.ang = this.ang.mult(this.vel);
		this.vel.damp(0.05);
	}

	angle() {
		return this.ang;
	}

	depth() {
		return this.dep;
	}
}

export default class Answers {
	constructor(randomSource) {
		this.randomSource = randomSource;

		this.inner = document.createElement('div');

		const ball = make('div', 'ball');
		setSize(ball, BALL_SIZE);

		const chamfer = make('div', 'chamfer');
		setSize(chamfer, HOLE_SIZE + CHAMFER_SIZE * 2);

		const hole = make('div', 'hole');
		setSize(hole, HOLE_SIZE);

		ball.appendChild(make('div', 'shine'));
		ball.appendChild(chamfer);
		ball.appendChild(hole);

		this.simulator = new ShapeSimulator();

		const ratio = window.devicePixelRatio || 1;
		const canvas = make('canvas', 'render');
		canvas.width = Math.round(HOLE_SIZE * ratio);
		canvas.height = Math.round(HOLE_SIZE * ratio);
		setSize(canvas, HOLE_SIZE);
		const gl = canvas.getContext('webgl');

		gl.clearColor(0, 0, 0, 0);
		gl.cullFace(gl.BACK);
		gl.enable(gl.CULL_FACE);

		this.icosahedronProg = new Program(gl, [
			new VertexShader(gl, PROG_ICO_VERT),
			new FragmentShader(gl, PROG_ICO_FRAG),
		]);

		this.coverProg = new Program(gl, [
			new VertexShader(gl, PROG_COVER_VERT),
			new FragmentShader(gl, PROG_COVER_FRAG),
		]);

		this.ico = new Icosahedron();

		this.atlas = new Texture2D(gl, {
			[gl.TEXTURE_MAG_FILTER]: gl.LINEAR,
			[gl.TEXTURE_MIN_FILTER]: gl.LINEAR,
			[gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
			[gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE,
		});
		this.atlas.setSolid(1, 1, 1, 1);
		this.atlas.loadImage('resources/answers/atlas.png');

		this.answers = new Texture2D(gl, {
			[gl.TEXTURE_MAG_FILTER]: gl.LINEAR,
			[gl.TEXTURE_MIN_FILTER]: gl.LINEAR,
			[gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
			[gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE,
		});
		this.answers.setSolid(0, 0, 0, 0);
		this.answers.loadImage('resources/answers/MBA.png');

		this.gl = gl;

		ball.appendChild(canvas);

		this.inner.appendChild(ball);

		this.step = this.step.bind(this);
	}

	render() {
		const gl = this.gl;
		gl.clear(gl.COLOR_BUFFER_BIT);

		const mProj = M4.perspective(0.65, 1, 1.0, 100.0);
		const mView = M4.fromQuaternion(this.simulator.angle());

		// depth range: 1--4
		mView.translate(0, 0, this.simulator.depth() - this.ico.radius() - LETTER_DEPTH);

		this.ico.bind(gl);
		this.icosahedronProg.use({
			'projview': mView.mult(mProj),
			'atlas': this.atlas.bind(0),
			'tiles': this.answers.bind(1),
		});
		this.icosahedronProg.vertexAttribPointer({
			'pos': {size: 3, type: gl.FLOAT, stride: this.ico.stride * 4, offset: 0 * 4},
			'tex': {size: 4, type: gl.FLOAT, stride: this.ico.stride * 4, offset: 3 * 4},
		});
		this.ico.render(gl);
	}

	title() {
		return 'Answers Ball';
	}

	info() {
		return (
			'Hold face-down and shake while\n' +
			'asking or thinking of a question'
		);
	}

	step() {
		this.simulator.step();
		this.render();
		this.nextFrame = requestAnimationFrame(this.step);
	}

	start() {
		this.simulator.randomise(this.randomSource, 0.5);
		this.step();
	}

	stop() {
		cancelAnimationFrame(this.nextFrame);
	}

	dom() {
		return this.inner;
	}
};
