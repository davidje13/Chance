import Canvas from '../3d/Canvas.js';
import Program from '../3d/Program.js';
import {VertexShader, FragmentShader} from '../3d/Shader.js';
import {Texture2D} from '../3d/Texture.js';
import ScreenQuad from '../3d/ScreenQuad.js';
import {M4} from '../math/Matrix.js';

const PROG_SHAPE_VERT = `
	uniform mat4 projview;
	attribute vec4 pos;
	attribute vec2 faceTex;
	attribute vec2 netTex;
	varying highp vec2 faceUV;
	varying highp vec2 netUV;
	varying lowp float dp;
	void main() {
		gl_Position = projview * pos;
		dp = gl_Position.z;
		faceUV = faceTex;
		netUV = netTex;
	}
`;

const PROG_SHAPE_FRAG = `
	uniform lowp float bumpSteps;
	uniform lowp float bumpPos;
	uniform lowp float fogDepth;
	uniform sampler2D atlas;
	uniform sampler2D tiles;
	varying highp vec2 faceUV;
	varying highp vec2 netUV;
	varying lowp float dp;
	const lowp vec3 fog = vec3(0.0, 0.3, 0.9);
	const lowp vec3 abyss = vec3(0.0);
	void main() {
		if(dp > 0.5) {
			discard;
		}
		gl_FragColor = vec4(
			mix(
				texture2D(atlas, faceUV).xyz,
				mix(fog, abyss, max(dp, 0.0) * 2.0),
				smoothstep(dp, 0.0, fogDepth)
			),
			1.0
		) * min(texture2D(tiles, netUV).r * bumpSteps - bumpPos, 1.0);
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

function maxComponent(m) {
	let max = 0;
	for (let i = 0; i < 16; ++ i) {
		const v = Math.abs(m.data[i]);
		if (v > max) {
			max = v;
		}
	}
	return max;
}

export default class Answers3DRenderer {
	constructor(shapeSlices, fogDepth, size, blankDepth) {
		const canvas = new Canvas(size, size, {
			alpha: true,
			antialias: true,
			depth: false,
			powerPreference: 'low-power',
			premultipliedAlpha: true,
			preserveDrawingBuffer: false,
			stencil: false,
		});
		canvas.dom().className = 'render';
		canvas.dom().style.marginLeft = `${-size / 2}px`;
		canvas.dom().style.marginTop = `${-size / 2}px`;
		const gl = canvas.gl;

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

		this.blankDepth = blankDepth;
		this.wasBlank = false;
		this.lastProjView = M4.identity();

		this.gl = gl;
	}

	render(rotationMatrix, depth) {
		const gl = this.gl;

		const isBlank = (depth >= this.blankDepth);

		if (isBlank && this.wasBlank) {
			return;
		}

		const mProj = M4.perspective(0.6, 1, 1.0, 100.0);
		const mView = rotationMatrix;
		mView.translate(0, 0, -depth - 2);
		const projview = mView.mult(mProj);
		const diff = this.lastProjView.copy().sub(projview);
		if (maxComponent(diff) <= 0.001) {
			return;
		}
		this.lastProjView = projview;
		this.wasBlank = isBlank;

		gl.clear(gl.COLOR_BUFFER_BIT);

		if (!isBlank) {
			this.shapeProg.use({
				'projview': projview,
				'atlas': this.atlas,
				'tiles': this.answers,
				'fogDepth': this.fogDepth,
				'bumpSteps': Math.max(this.shapeSlices.length - 1, 0),
			});
			for (let i = 0; i < this.shapeSlices.length; ++ i) {
				const slice = this.shapeSlices[i];
				slice.bind(gl);
				this.shapeProg.input({
					'pos': slice.boundVertices(),
					'faceTex': slice.boundUvs(),
					'netTex': slice.boundNetUvs(),
					'bumpPos': i - 1,
				});
				slice.render(gl);
			}
		}

		this.quad.bind(gl);
		this.coverProg.use({
			'atlas': this.atlas,
			'pos': this.quad.boundVertices(),
			'tex': this.quad.boundUvs(),
		});
		this.quad.render(gl);
	}

	dom() {
		return this.gl.canvas;
	}
};
