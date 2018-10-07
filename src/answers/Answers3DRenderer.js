import Program from '../3d/Program.js';
import {VertexShader, FragmentShader} from '../3d/Shader.js';
import {Texture2D} from '../3d/Texture.js';
import ScreenQuad from '../3d/ScreenQuad.js';
import {M4} from '../math/Matrix.js';

function setSize(o, size) {
	o.style.width = `${size}px`;
	o.style.height = `${size}px`;
	o.style.marginLeft = `${-size / 2}px`;
	o.style.marginTop = `${-size / 2}px`;
}

const PROG_SHAPE_VERT = `
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

const PROG_SHAPE_FRAG = `
	uniform lowp float bumpSteps;
	uniform lowp float bumpPos;
	uniform lowp float fogDepth;
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
				smoothstep(dp, 0.0, fogDepth)
			),
			1.0
		) * min(texture2D(tiles, t2).r * bumpSteps - bumpPos, 1.0);
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

export default class Answers3DRenderer {
	constructor(shapeSlices, fogDepth, size) {
		const ratio = window.devicePixelRatio || 1;
		const canvas = document.createElement('canvas')
		canvas.className = 'render';
		canvas.width = Math.round(size * ratio);
		canvas.height = Math.round(size * ratio);
		setSize(canvas, size);
		const gl = canvas.getContext('webgl', {
			alpha: true,
			antialias: true,
			depth: false,
			powerPreference: 'low-power',
			premultipliedAlpha: true,
			preserveDrawingBuffer: false,
			stencil: false,
		});

		gl.clearColor(0, 0, 0, 0);
		gl.cullFace(gl.BACK);
		gl.enable(gl.CULL_FACE);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

		this.shapeProg = new Program(gl, [
			new VertexShader(gl, PROG_SHAPE_VERT),
			new FragmentShader(gl, PROG_SHAPE_FRAG),
		]);

		this.coverProg = new Program(gl, [
			new VertexShader(gl, PROG_COVER_VERT),
			new FragmentShader(gl, PROG_COVER_FRAG),
		]);

		this.shapeSlices = shapeSlices;
		this.fogDepth = fogDepth;
		this.quad = new ScreenQuad({uv: {
			left: 0,
			right: 0.75,
			top: 0,
			bottom: 0.75,
		}});

		this.atlas = new Texture2D(gl, {
			[gl.TEXTURE_MAG_FILTER]: gl.LINEAR,
			[gl.TEXTURE_MIN_FILTER]: gl.LINEAR,
			[gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
			[gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE,
		});
		this.atlas.setSolid(1, 1, 1, 0);
		this.atlas.loadImage('resources/answers/atlas.png');

		this.answers = new Texture2D(gl, {
			[gl.TEXTURE_MAG_FILTER]: gl.LINEAR,
			[gl.TEXTURE_MIN_FILTER]: gl.LINEAR,
			[gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
			[gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE,
		});
		this.answers.setSolid(0, 0, 0, 0);
		this.answers.loadImage('resources/answers/MBA.png');

		this.canvas = canvas;
		this.gl = gl;
	}

	render(rotationMatrix, depth) {
		const gl = this.gl;
		gl.clear(gl.COLOR_BUFFER_BIT);

		const mProj = M4.perspective(0.65, 1, 1.0, 100.0);
		const mView = rotationMatrix;
		mView.translate(0, 0, -depth - 2);

		this.shapeProg.use({
			'projview': mView.mult(mProj),
			'atlas': this.atlas.bind(0),
			'tiles': this.answers.bind(1),
			'fogDepth': this.fogDepth,
			'bumpSteps': Math.max(this.shapeSlices.length - 1, 0),
		});
		for (let i = 0; i < this.shapeSlices.length; ++ i) {
			const slice = this.shapeSlices[i];
			slice.bind(gl);
			this.shapeProg.vertexAttribPointer({
				'pos': {size: 3, type: gl.FLOAT, stride: slice.stride * 4, offset: 0 * 4},
				'tex': {size: 4, type: gl.FLOAT, stride: slice.stride * 4, offset: 3 * 4},
			});
			this.shapeProg.uniform({
				'bumpPos': i - 1,
			});
			slice.render(gl);
		}

		this.quad.bind(gl);
		this.coverProg.use({
			'atlas': this.atlas.bind(0),
		});
		this.coverProg.vertexAttribPointer({
			'pos': {size: 2, type: gl.FLOAT, stride: this.quad.stride * 4, offset: 0 * 4},
			'tex': {size: 2, type: gl.FLOAT, stride: this.quad.stride * 4, offset: 2 * 4},
		});
		this.quad.render(gl);
	}

	dom() {
		return this.canvas;
	}
};
