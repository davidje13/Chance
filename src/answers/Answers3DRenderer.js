import Canvas from '../3d/Canvas.js';
import Program from '../3d/Program.js';
import {VertexShader, FragmentShader} from '../3d/Shader.js';
import {Texture2D} from '../3d/Texture.js';
import ScreenQuad from '../3d/ScreenQuad.js';
import {M4} from '../math/Matrix.js';
import CoverShaders from './shaders/Cover.js';
import ShapeShaders from './shaders/Shape.js';

function loadTexture(gl, url, then) {
	const tex = new Texture2D(gl, {
		[gl.TEXTURE_MAG_FILTER]: gl.LINEAR,
		[gl.TEXTURE_MIN_FILTER]: gl.LINEAR,
		[gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
		[gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE,
	});
	tex.setSolid(0, 0, 0, 0);
	tex.loadImage(url).then(then);
	return tex;
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
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

		gl.enable(gl.CULL_FACE);
		gl.enable(gl.BLEND);

		this.shapeProg = new Program(gl, [
			new VertexShader(gl, ShapeShaders.vert),
			new FragmentShader(gl, ShapeShaders.frag),
		]);

		this.coverProg = new Program(gl, [
			new VertexShader(gl, CoverShaders.vert),
			new FragmentShader(gl, CoverShaders.frag),
		]);

		this.shapeSlices = shapeSlices;
		this.fogDepth = fogDepth;
		this.quad = new ScreenQuad({uv: {
			left: 0,
			right: 0.75,
			top: 0,
			bottom: 0.75,
		}});

		this.atlas = loadTexture(gl, 'resources/answers/atlas.png');
		this.answers = new Map();
		this.answers.set('A', 'resources/answers/depth-a.png');
		this.answers.set('B', 'resources/answers/depth-b.png');
		this.answerset = 'A';

		this.blankDepth = blankDepth;
		this.wasBlank = false;
		this.lastProjView = M4.identity();

		this.gl = gl;
	}

	setAnswerset(id) {
		if (this.answerset !== id) {
			this.answerset = id;
			this._forceRender();
		}
	}

	_getAnswersTexture() {
		let tex = this.answers.get(this.answerset);
		if (typeof tex === 'string') {
			tex = loadTexture(this.gl, tex, () => this._forceRender());
			this.answers.set(this.answerset, tex);
		}
		return tex;
	}

	_forceRender() {
		this.wasBlank = false;
		this.lastProjView = M4.identity();
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
		if (M4.dist2(this.lastProjView, projview) <= 0.001 * 0.001) {
			return;
		}
		this.lastProjView = projview;
		this.wasBlank = isBlank;

		gl.clear(gl.COLOR_BUFFER_BIT);

		if (!isBlank) {
			this.shapeProg.use({
				'projview': projview,
				'atlas': this.atlas,
				'tiles': this._getAnswersTexture(),
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
