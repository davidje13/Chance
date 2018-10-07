import Program from '../3d/Program.js';
import {VertexShader, FragmentShader} from '../3d/Shader.js';
import {Texture2D} from '../3d/Texture.js';
import Framebuffer from '../3d/Framebuffer.js';
import ScreenQuad from '../3d/ScreenQuad.js';
import QuadStack from './QuadStack.js';

function setSize(o, size) {
	o.style.width = `${size}px`;
	o.style.height = `${size}px`;
	o.style.marginLeft = `${-size / 2}px`;
	o.style.marginTop = `${-size / 2}px`;
}

const PROG_NEEDLE_VERT = `
	uniform lowp float startAngle;
	uniform lowp float sweepAngle;
	uniform lowp vec2 centre;
	uniform lowp vec2 size;
	uniform lowp vec2 texTL;
	uniform lowp vec2 texSize;
	attribute vec3 pos;
	varying lowp vec2 t;
	void main() {
		float angle = startAngle + pos.z * sweepAngle;
		float sa = sin(angle);
		float ca = cos(angle);
		vec2 shape = (pos.xy - vec2(0.5, 0.5)) * size;
		gl_Position = vec4(
			centre + ca * shape * vec2(1.0, -1.0) - sa * shape.yx,
			0.0,
			1.0
		);
		t = texTL + pos.xy * texSize;
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

const PROG_TEX_FRAG = `
	uniform mediump float opacity;
	uniform sampler2D atlas;
	varying lowp vec2 t;
	void main() {
		gl_FragColor = texture2D(atlas, t) * opacity;
	}
`;

export default class ContortionGlRenderer {
	constructor(size, needleCount, needleSize, pinSize) {
		this.needleCount = needleCount;
		this.needleSize = needleSize * (2 / size);
		this.shadowDist = -1 * (2 / size);

		const ratio = window.devicePixelRatio || 1;
		const canvas = document.createElement('canvas')
		canvas.className = 'render';
		canvas.width = Math.round(size * ratio);
		canvas.height = Math.round(size * ratio);
		setSize(canvas, size);
		const gl = canvas.getContext('webgl', {
			alpha: true,
			antialias: false,
			depth: false,
			powerPreference: 'low-power',
			premultipliedAlpha: true,
			preserveDrawingBuffer: false,
			stencil: false,
		});

		gl.clearColor(0, 0, 0, 0);
		gl.enable(gl.BLEND);

		const texFragShader = new FragmentShader(gl, PROG_TEX_FRAG);
		this.needleProg = new Program(gl, [
			new VertexShader(gl, PROG_NEEDLE_VERT),
			texFragShader,
		]);

		this.coverProg = new Program(gl, [
			new VertexShader(gl, PROG_COVER_VERT),
			texFragShader,
		]);

		this.needle = new QuadStack(needleCount);
		this.pin = new ScreenQuad({
			pos: {
				left:   -pinSize / size,
				right:   pinSize / size,
				top:     pinSize / size,
				bottom: -pinSize / size,
			},
			uv: {
				left:   0.8750,
				right:  1.0000,
				top:    0.9375,
				bottom: 1.0000,
			},
		});
		this.cover = new ScreenQuad({pos: {left: -1, right: 1, top: -1, bottom: 1}});

		this.atlas = new Texture2D(gl, {
			[gl.TEXTURE_MAG_FILTER]: gl.LINEAR,
			[gl.TEXTURE_MIN_FILTER]: gl.LINEAR,
			[gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
			[gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE,
		});
		this.atlas.setSolid(0, 0, 0, 0);

		this.bufferTex = new Texture2D(gl, {
			[gl.TEXTURE_MAG_FILTER]: gl.NEAREST,
			[gl.TEXTURE_MIN_FILTER]: gl.NEAREST,
			[gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
			[gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE,
		});

		this.bufferTex.set(canvas.width, canvas.height, {
			type: Framebuffer.bestSupportedTargetPrecision(gl),
		});
		this.buffer = new Framebuffer(gl, this.bufferTex);

		this.canvas = canvas;
		this.gl = gl;

		this.lastStartAngle = null;
		this.lastSweepAngle = null;

		this.atlas.loadImage('resources/contortion/atlas.png')
			.then(() => this.rerender());
	}

	_renderNeedle(centre, texTL, startAngle, sweepAngle) {
		const gl = this.gl;

		this.buffer.bind();
		gl.clear(gl.COLOR_BUFFER_BIT);
		this.needle.bind(gl);
		this.needleProg.use({
			'startAngle': startAngle,
			'sweepAngle': sweepAngle,
			'centre': centre,
			'size': [this.needleSize / 8, this.needleSize],
			'texTL': texTL,
			'texSize': [0.25, 1.0],
			'opacity': 1 / this.needleCount,
			'atlas': this.atlas.bind(0),
		});
		this.needleProg.vertexAttribPointer({
			'pos': {size: 3, type: gl.FLOAT},
		});
		gl.blendFunc(gl.ONE, gl.ONE);
		this.needle.render(gl);
		this.buffer.unbind();

		this.cover.bind(gl);
		this.coverProg.use({
			'opacity': 1,
			'atlas': this.bufferTex.bind(0),
		});
		this.coverProg.vertexAttribPointer({
			'pos': {size: 2, type: gl.FLOAT, stride: this.cover.stride * 4, offset: 0 * 4},
			'tex': {size: 2, type: gl.FLOAT, stride: this.cover.stride * 4, offset: 2 * 4},
		});
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		this.cover.render(gl);
	}

	rerender() {
		if (this.lastStartAngle !== null) {
			this.render(this.lastStartAngle, this.lastSweepAngle, true);
		}
	}

	render(startAngle, sweepAngle, forced = false) {
		if (
			!forced &&
			this.lastStartAngle === startAngle &&
			this.lastSweepAngle === sweepAngle
		) {
			return;
		}

		const gl = this.gl;
		gl.clear(gl.COLOR_BUFFER_BIT);

		this._renderNeedle([0.0, this.shadowDist], [0.0, 0.0], startAngle, sweepAngle);
		this._renderNeedle([0.0, 0.0], [0.5, 0.0], startAngle, sweepAngle);

		this.pin.bind(gl);
		this.coverProg.use({
			'opacity': 1,
			'atlas': this.atlas.bind(0),
		});
		this.coverProg.vertexAttribPointer({
			'pos': {size: 2, type: gl.FLOAT, stride: this.pin.stride * 4, offset: 0 * 4},
			'tex': {size: 2, type: gl.FLOAT, stride: this.pin.stride * 4, offset: 2 * 4},
		});
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		this.pin.render(gl);

		this.lastStartAngle = startAngle;
		this.lastSweepAngle = sweepAngle;
	}

	dom() {
		return this.canvas;
	}
};
