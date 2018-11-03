import Canvas from '../3d/Canvas.js';
import Program from '../3d/Program.js';
import {VertexShader, FragmentShader} from '../3d/Shader.js';
import {Texture2D} from '../3d/Texture.js';
import Framebuffer from '../3d/Framebuffer.js';
import Box from '../3d/Box.js';
import Face from '../3d/Face.js';
import DepthFrag from '../3d/DepthFrag.js';
import {M4} from '../math/Matrix.js';
import {V3} from '../math/Vector.js';
import Quaternion from '../math/Quaternion.js';
import PROG_SHAPE_VERT from './shaders/VertexCoin.js';
import PROG_COL_FRAG_HELPER from './shaders/TargetCol.js';
import PROG_SHADOW_FRAG_HELPER from './shaders/TargetShadow.js';
import PROG_COIN_FRAG from './shaders/ShapeCoin.js';
import FloorShaders from './shaders/Floor.js';

function loadNormalMap(gl, url, downsample, then) {
	const normalMap = new Texture2D(gl, {
		[gl.TEXTURE_MAG_FILTER]: gl.LINEAR,
		[gl.TEXTURE_MIN_FILTER]: gl.LINEAR,
		[gl.TEXTURE_WRAP_S]: gl.REPEAT,
		[gl.TEXTURE_WRAP_T]: gl.REPEAT,
	});
	normalMap.setSolid(0.5, 0.5, 1.0, 0.0);
	normalMap.generateNormalMap(url, {downsample}).then(then);
	return normalMap;
}

const BLUR_STEPS_HIGH = 16;
const BLUR_STEPS_LOW = 4;

export default class Coins3DRenderer {
	constructor({
		shadow = true,
		maxOversampleResolution = 3,
		downsampleTextures = false,
		fov = 0.6,
	} = {}) {
		this.canvas = new Canvas(1, 1, {
			alpha: true,
			antialias: false,
			depth: false,
			powerPreference: 'low-power',
			premultipliedAlpha: true,
			preserveDrawingBuffer: false,
			stencil: false,
		}, {maxOversampleResolution});
		this.canvas.dom().className = 'render';

		const gl = this.canvas.gl;
		this.shadow = shadow;
		this.fov = fov;
		this.downsampleTextures = downsampleTextures;

		gl.clearColor(0, 0, 0, 0);
		gl.cullFace(gl.BACK);
		gl.enable(gl.CULL_FACE);

		if (shadow) {
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
			this.shadowBuffer = new Framebuffer(this.canvas, this.shadowBufferTex);
			this.shadowBuffer.viewport = [0, 0, this.shadowW, this.shadowH];

			this.floorProg = new Program(gl, [
				new VertexShader(gl, FloorShaders.vert),
				new FragmentShader(gl, FloorShaders.frag),
			]);
		}

		this.currencies = new Map();

		const baseProg = new Program(gl, [
			new VertexShader(gl, PROG_SHAPE_VERT),
			new FragmentShader(gl, PROG_COL_FRAG_HELPER + PROG_COIN_FRAG),
		]);

		const baseShadowProg = shadow ? new Program(gl, [
			new VertexShader(gl, PROG_SHAPE_VERT),
			new FragmentShader(gl, PROG_SHADOW_FRAG_HELPER + PROG_COIN_FRAG),
		]) : null;

		this.currencies.set('gbp-old', {
			shape: new Box({width: 2.1, height: 2.1, depth: 0.28}),
			prog: baseProg,
			shadowProg: baseShadowProg,
			props: {
				'maxDepth': 0.04,
				'edgeMaxDepth': 0.03,
				'twoToneRad': 0.0,
				'punchRad': 0.0,
				'normalMap': 'resources/coins/depth-gbp-old.png',
			},
		});

		this.currencies.set('gbp', {
			shape: new Box({width: 2.1, height: 2.1, depth: 0.24}),
			prog: baseProg,
			shadowProg: baseShadowProg,
			props: {
				'maxDepth': 0.05,
				'edgeMaxDepth': 0.039,
				'twoToneRad': 0.6484375,
				'punchRad': 0.0,
				'normalMap': 'resources/coins/depth-gbp.png',
			},
		});

		this.currencies.set('eur-de', {
			shape: new Box({width: 2.1, height: 2.1, depth: 0.2}),
			prog: baseProg,
			shadowProg: baseShadowProg,
			props: {
				'maxDepth': 0.04,
				'edgeMaxDepth': 0.03,
				'twoToneRad': 0.71875,
				'punchRad': 0.0,
				'normalMap': 'resources/coins/depth-eur-de.png',
			},
		});

		this.currencies.set('usd', {
			shape: new Box({width: 2.1, height: 2.1, depth: 0.14}),
			prog: baseProg,
			shadowProg: baseShadowProg,
			props: {
				'maxDepth': 0.03,
				'edgeMaxDepth': 0.02,
				'twoToneRad': 1.1,
				'punchRad': 0.0,
				'normalMap': 'resources/coins/depth-usd.png',
			},
		});

		this.currencies.set('jpy', {
			shape: new Box({width: 2.1, height: 2.1, depth: 0.14}),
			prog: baseProg,
			shadowProg: baseShadowProg,
			props: {
				'maxDepth': 0.04,
				'edgeMaxDepth': 0.03,
				'twoToneRad': 0.0,
				'punchRad': 0.227,
				'normalMap': 'resources/coins/depth-jpy.png',
			},
		});

		this.currencies.set('nzd-cook', {
			shape: new Box({width: 2.1, height: 2.1, depth: 0.14}),
			prog: baseProg,
			shadowProg: baseShadowProg,
			props: {
				'maxDepth': 0.03,
				'edgeMaxDepth': 0.322,
				'twoToneRad': 1.1,
				'punchRad': 0.0,
				'normalMap': 'resources/coins/depth-nzd-cook.png',
			},
		});
	}

	coinHeight(type) {
		return this.currencies.get(type).shape.size.z;
	}

	resize(width, height) {
		this.canvas.resize(width, height);
	}

	renderCoinFrame(mProj, mView, currency, prog, position, rotation) {
		const mModel = M4.fromQuaternion(rotation);
		mModel.translate(position.x, position.y, position.z);
		const mMV = mModel.mult(mView);

		prog.input({
			'projview': mMV.mult(mProj),
			'eye': mMV.invert().apply3([0, 0, 0]),
			'rot': mMV.as3(),
		});
		currency.shape.render(this.canvas.gl);
	}

	_prepareCurrency(currency) {
		if (typeof currency.props['normalMap'] === 'string') {
			currency.props['normalMap'] = loadNormalMap(
				this.canvas.gl,
				currency.props['normalMap'],
				this.downsampleTextures,
				({width, height}) => currency.props['normalMapSize'] = [width, height]
			);
		}
	}

	renderCoin(mProj, mView, coin, {blur = false, shadow = false}) {
		const gl = this.canvas.gl;

		const currency = this.currencies.get(coin.style.currency);
		const shape = currency.shape;
		const prog = shadow ? currency.shadowProg : currency.prog;

		this._prepareCurrency(currency);

		shape.bind(gl);

		prog.use(Object.assign({
			'pos': currency.shape.boundVertices(),
		}, currency.props));

		let rotationBlur = 0;
		let positionBlur = 0;
		if (blur && coin.blur) {
			rotationBlur = Quaternion.distance(coin.rotation, coin.blur.rot);
			positionBlur = V3.dist(coin.position, coin.blur.pos);
		}

		if (rotationBlur > 0 || positionBlur > 0) {
			const blurSteps = (positionBlur > 0.3 || rotationBlur > 0.1) ? BLUR_STEPS_HIGH : BLUR_STEPS_LOW;

			gl.enable(gl.BLEND);
			gl.blendFunc(gl.ONE, gl.ONE);
			prog.input({'opacity': 1 / blurSteps});
			for (let i = 0; i < blurSteps; ++ i) {
				const p = i / Math.max(blurSteps - 1, 1);
				const pos = V3.mix(coin.position, coin.blur.pos, p);
				const rot = Quaternion.mix(coin.rotation, coin.blur.rot, p);
				this.renderCoinFrame(mProj, mView, currency, prog, pos, rot);
			}
			gl.disable(gl.BLEND);
			return {blurred: true};
		} else {
			prog.input({'opacity': 1});
			this.renderCoinFrame(mProj, mView, currency, prog, coin.position, coin.rotation);
			return {blurred: false};
		}
	}

	renderFloor(mProj, mView, opacity) {
		if (opacity <= 0.0) {
			return;
		}

		const gl = this.canvas.gl;

		const mFloorModel = M4.identity();
		mFloorModel.data[5] *= -1.0;

		this.floor.bind(gl);
		this.floorProg.use({
			'projview': mFloorModel.mult(mView.mult(mProj)),
			'opacity': 0.3 * Math.pow(opacity, 1.5),
			'atlas': this.shadowBufferTex,
			'pixsize': [1.0 / this.shadowW, 1.0 / this.shadowH],
			'pos': this.floor.boundVertices(),
			'tex': this.floor.boundUvs(),
		});
		this.floor.render(gl);
	}

	renderShadow(coins) {
		if (!this.shadow || !coins.length) {
			return;
		}

		const gl = this.canvas.gl;

		this.shadowBuffer.bind({assumeSameEnv: true});
		gl.clear(gl.COLOR_BUFFER_BIT);

		const {mProj, mView} = M4.shadowPerspective(
			{x: 0.0, y: 0.0, z: -6.0},
			{x: 0, y: 0, z: 0},
			{x: 0, y: 0, z: 1},
			{x: 0, y: 1, z: 0},
			this.floor.size.width,
			this.floor.size.height,
			1.0
		);

		for (const coin of coins) {
			this.renderCoin(mProj, mView, coin, {shadow: true, blur: false});
		}

		this.shadowBuffer.unbind();
	}

	renderScene(coins, raisedCam) {
		const gl = this.canvas.gl;

		if (!coins.length) {
			return {blurred: false};
		}

		const mProj = M4.perspective(this.fov, this.canvas.viewportDisplayWidth() / this.canvas.viewportDisplayHeight(), 1.0, 100.0);
		const mView = raisedCam ? M4.look({x: 0, y: 3.0, z: -3.5}, {x: 0, y: 0, z: -0.5}, {x: 0, y: -1, z: 0}) : M4.identity();

		if (this.shadow) {
			const coinDepth = -coins[0].position.z;
			const shadowOpacity = Math.max(0, Math.min(1, (3.0 - coinDepth) / 2.5));
			this.renderFloor(mProj, mView, shadowOpacity);
		}

		let anyBlurred = false;
		for (const coin of coins) {
			const {blurred} = this.renderCoin(mProj, mView, coin, {blur: true});
			if (blurred) {
				anyBlurred = true;
			}
		}
		return {blurred: anyBlurred};
	}

	render(coins, {viewport = null, clear = true, raisedCam = true} = {}) {
		const gl = this.canvas.gl;
		if (viewport) {
			this.canvas.setViewport(viewport);
		}
		this.renderShadow(coins);
		if (clear) {
			gl.clear(gl.COLOR_BUFFER_BIT);
		}
		return this.renderScene(coins, raisedCam);
	}

	dom() {
		return this.canvas.dom();
	}
};
