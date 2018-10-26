import Canvas from '../3d/Canvas.js';
import Program from '../3d/Program.js';
import {VertexShader, FragmentShader} from '../3d/Shader.js';
import {Texture2D} from '../3d/Texture.js';
import Framebuffer from '../3d/Framebuffer.js';
import Box from '../3d/Box.js';
import Face from '../3d/Face.js';
import DepthFrag from '../3d/DepthFrag.js';
import {M4} from '../math/Matrix.js';
import Quaternion from '../math/Quaternion.js';
import PROG_SHAPE_VERT from './shaders/VertexCoin.js';
import PROG_COL_FRAG_HELPER from './shaders/TargetCol.js';
import PROG_SHADOW_FRAG_HELPER from './shaders/TargetShadow.js';
import PROG_COIN_FRAG from './shaders/ShapeCoin.js';

function normalize(v) {
	const m = 1 / Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
	return [v[0] * m, v[1] * m, v[2] * m];
}

function loadNormalMap(gl, url, depth) {
	const normalMap = new Texture2D(gl, {
		[gl.TEXTURE_MAG_FILTER]: gl.LINEAR,
		[gl.TEXTURE_MIN_FILTER]: gl.LINEAR,
		[gl.TEXTURE_WRAP_S]: gl.REPEAT,
		[gl.TEXTURE_WRAP_T]: gl.REPEAT,
	});
	normalMap.setSolid(0.5, 0.5, 1.0, 1.0);
	normalMap.generateNormalMap(url, depth);
	return normalMap;
}

const PROG_FLOOR_VERT = `
	uniform lowp mat4 projview;
	uniform lowp float pixw;
	uniform lowp float pixh;

	attribute vec4 pos;
	attribute vec2 tex;

	varying lowp vec2 t;
	varying lowp vec2 d1;
	varying lowp vec2 d2;
	varying lowp float m0;
	varying lowp float m1;
	varying lowp float m2;

	void main() {
		gl_Position = projview * pos;
		t = tex;
		lowp vec2 pix = vec2(1.0 / pixw, 1.0 / pixh);
		d1 = vec2(2.5, 1.5) * pix;
		d2 = vec2(5.5, -1.5) * pix;
		m0 = 0.2;
		m1 = 0.15;
		m2 = 0.05;
	}
`;

const PROG_FLOOR_FRAG = `
	uniform mediump float opacity;
	uniform sampler2D atlas;

	varying lowp vec2 t;
	varying lowp vec2 d1;
	varying lowp vec2 d2;
	varying lowp float m0;
	varying lowp float m1;
	varying lowp float m2;

	void main() {
		lowp vec2 d1b = vec2(-d1.y, d1.x);
		lowp vec2 d2b = vec2(-d2.y, d2.x);
		gl_FragColor = (
			texture2D(atlas, t) * m0 +
			(
				texture2D(atlas, t + d1) +
				texture2D(atlas, t + d1b) +
				texture2D(atlas, t - d1) +
				texture2D(atlas, t - d1b)
			) * m1 +
			(
				texture2D(atlas, t + d2) +
				texture2D(atlas, t + d2b) +
				texture2D(atlas, t - d2) +
				texture2D(atlas, t - d2b)
			) * m2
		) * opacity;
	}
`;

export default class Coins3DRenderer {
	constructor() {
		this.canvas = new Canvas(1, 1, {
			alpha: true,
			antialias: false,
			depth: false,
			powerPreference: 'low-power',
			premultipliedAlpha: true,
			preserveDrawingBuffer: false,
			stencil: false,
		}, {oversample: 2});
		this.canvas.dom().className = 'render';

		const gl = this.canvas.gl;

		gl.clearColor(0, 0, 0, 0);
		gl.cullFace(gl.BACK);
		gl.enable(gl.CULL_FACE);

		this.floor = new Face({size: {width: 4.0, height: 4.0}, twoSided: false});

		this.shadowBufferTex = new Texture2D(gl, {
			[gl.TEXTURE_MAG_FILTER]: gl.LINEAR,
			[gl.TEXTURE_MIN_FILTER]: gl.LINEAR,
			[gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
			[gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE,
		});

		this.shadowW = 256;
		this.shadowH = 256;
		this.shadowBufferTex.set(this.shadowW, this.shadowH);
		this.shadowBuffer = new Framebuffer(gl, this.shadowBufferTex);
		this.shadowBuffer.viewport = [0, 0, this.shadowW, this.shadowH];

		this.floorProg = new Program(gl, [
			new VertexShader(gl, PROG_FLOOR_VERT),
			new FragmentShader(gl, PROG_FLOOR_FRAG),
		]);

		this.currencies = new Map();

		const baseProg = new Program(gl, [
			new VertexShader(gl, PROG_SHAPE_VERT),
			new FragmentShader(gl, PROG_COL_FRAG_HELPER + PROG_COIN_FRAG),
		]);

		const baseShadowProg = new Program(gl, [
			new VertexShader(gl, PROG_SHAPE_VERT),
			new FragmentShader(gl, PROG_SHADOW_FRAG_HELPER + PROG_COIN_FRAG),
		]);

		const normalScale = 0.5 / 2.0;

		this.currencies.set('gbp-old', {
			shape: new Box({width: 2.1, height: 2.1, depth: 0.28}),
			prog: baseProg,
			shadowProg: baseShadowProg,
			props: {
				'maxDepth': 0.015,
				'twoToneRad': 0.0,
				'normalMap': loadNormalMap(gl, 'resources/coins/depth-gbp-old.png', 0.015 * normalScale),
			},
		});

		this.currencies.set('gbp', {
			shape: new Box({width: 2.1, height: 2.1, depth: 0.24}),
			prog: baseProg,
			shadowProg: baseShadowProg,
			props: {
				'maxDepth': 0.032,
				'twoToneRad': 0.6484375,
				'normalMap': loadNormalMap(gl, 'resources/coins/depth-gbp.png', 0.032 * normalScale),
			},
		});

		this.currencies.set('eur-de', {
			shape: new Box({width: 2.1, height: 2.1, depth: 0.2}),
			prog: baseProg,
			shadowProg: baseShadowProg,
			props: {
				'maxDepth': 0.02,
				'twoToneRad': 0.71875,
				'normalMap': loadNormalMap(gl, 'resources/coins/depth-eur-de.png', 0.02 * normalScale),
			},
		});

		this.currencies.set('usd', {
			shape: new Box({width: 2.1, height: 2.1, depth: 0.14}),
			prog: baseProg,
			shadowProg: baseShadowProg,
			props: {
				'maxDepth': 0.02,
				'twoToneRad': 1.1,
				'normalMap': loadNormalMap(gl, 'resources/coins/depth-usd.png', 0.02 * normalScale),
			},
		});
	}

	coinHeight(type) {
		return this.currencies.get(type).shape.size.z;
	}

	resize(width, height) {
		this.canvas.resize(width, height);
	}

	renderShadow(coins) {
		const gl = this.canvas.gl;

		this.shadowBuffer.bind();
		gl.clear(gl.COLOR_BUFFER_BIT);

		const {mProj, mView} = M4.shadowPerspective(
			{x: 0.0, y: 0.0, z: -4.0},
			{x: 0, y: 0, z: 0},
			{x: 0, y: 0, z: 1},
			{x: 0, y: 1, z: 0},
			this.floor.size.width,
			this.floor.size.height,
			1.0
		);

		for (const coin of coins) {
			const mModel = M4.fromQuaternion(coin.rotation);
			mModel.translate(coin.position.x, coin.position.y, coin.position.z);

			const mMV = mModel.mult(mView);

			const currency = this.currencies.get(coin.style.currency);
			const shape = currency.shape;
			const prog = currency.shadowProg;

			shape.bind(gl);
			prog.use(Object.assign({
				'projview': mMV.mult(mProj),
				'eye': mMV.invert().apply3([0, 0, 0]),
				'pos': shape.boundVertices(),
			}, currency.props));
			shape.render(gl);
		}

		this.shadowBuffer.unbind();
	}

	renderScene(coins) {
		const gl = this.canvas.gl;
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		const mProj = M4.perspective(0.6, this.canvas.width() / this.canvas.height(), 1.0, 100.0);
		const mView = M4.look({x: 0, y: 3.0, z: -3.5}, {x: 0, y: 0, z: -0.5}, {x: 0, y: -1, z: 0});

		const mFloorModel = M4.identity();
		mFloorModel.data[0] *= -1.0;

		this.floor.bind(gl);
		this.floorProg.use({
			'projview': mFloorModel.mult(mView.mult(mProj)),
			'opacity': 0.2,
			'atlas': this.shadowBufferTex,
			'pixw': this.shadowW,
			'pixh': this.shadowH,
			'pos': this.floor.boundVertices(),
			'tex': this.floor.boundUvs(),
		});
		this.floor.render(gl);

		for (const coin of coins) {
			const mModel = M4.fromQuaternion(coin.rotation);
			mModel.translate(coin.position.x, coin.position.y, coin.position.z);

			const mMV = mModel.mult(mView);

			const currency = this.currencies.get(coin.style.currency);
			const shape = currency.shape;
			const prog = currency.prog;

			shape.bind(gl);
			prog.use(Object.assign({
				'projview': mMV.mult(mProj),
				'eye': mMV.invert().apply3([0, 0, 0]),
				'rot': mMV.as3(),
				'pos': shape.boundVertices(),
			}, currency.props));
			shape.render(gl);
		}
	}

	render(coins) {
		this.renderShadow(coins);
		this.renderScene(coins);
	}

	dom() {
		return this.canvas.dom();
	}
};
