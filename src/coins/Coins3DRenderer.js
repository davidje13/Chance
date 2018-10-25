import Canvas from '../3d/Canvas.js';
import Program from '../3d/Program.js';
import {VertexShader, FragmentShader} from '../3d/Shader.js';
import {Texture2D} from '../3d/Texture.js';
import Box from '../3d/Box.js';
import DepthFrag from '../3d/DepthFrag.js';
import {M4} from '../math/Matrix.js';
import Quaternion from '../math/Quaternion.js';
import PROG_SHAPE_VERT from './shaders/VertexCoin.js';
import PROG_COL_FRAG_HELPER from './shaders/TargetCol.js';
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
		});
		this.canvas.dom().className = 'render';

		const gl = this.canvas.gl;

		gl.clearColor(0, 0, 0, 0);
		gl.cullFace(gl.BACK);
		gl.enable(gl.CULL_FACE);

		this.currencies = new Map();

		const baseProg = new Program(gl, [
			new VertexShader(gl, PROG_SHAPE_VERT),
			new FragmentShader(gl, PROG_COL_FRAG_HELPER + PROG_COIN_FRAG),
		]);

		const normalScale = 0.5 / 2.0;

		this.currencies.set('gbp-old', {
			shape: new Box({width: 2.1, height: 2.1, depth: 0.28}),
			prog: baseProg,
			props: {
				'maxDepth': 0.015,
				'twoToneRad': 0.0,
				'normalMap': loadNormalMap(gl, 'resources/coins/depth-gbp-old.png', 0.015 * normalScale),
			},
		});

		this.currencies.set('gbp', {
			shape: new Box({width: 2.1, height: 2.1, depth: 0.24}),
			prog: baseProg,
			props: {
				'maxDepth': 0.032,
				'twoToneRad': 0.6484375,
				'normalMap': loadNormalMap(gl, 'resources/coins/depth-gbp.png', 0.032 * normalScale),
			},
		});

		this.currencies.set('eur-de', {
			shape: new Box({width: 2.1, height: 2.1, depth: 0.2}),
			prog: baseProg,
			props: {
				'maxDepth': 0.02,
				'twoToneRad': 0.71875,
				'normalMap': loadNormalMap(gl, 'resources/coins/depth-eur-de.png', 0.02 * normalScale),
			},
		});

		this.currencies.set('usd', {
			shape: new Box({width: 2.1, height: 2.1, depth: 0.14}),
			prog: baseProg,
			props: {
				'maxDepth': 0.02,
				'twoToneRad': 1.1,
				'normalMap': loadNormalMap(gl, 'resources/coins/depth-usd.png', 0.02 * normalScale),
			},
		});
	}

	resize(width, height) {
		this.canvas.resize(width, height);
	}

	render(coins) {
		const gl = this.canvas.gl;
		gl.clear(gl.COLOR_BUFFER_BIT);

		const mProj = M4.perspective(0.6, this.canvas.width() / this.canvas.height(), 1.0, 100.0);

		for (const coin of coins) {
			const mView = M4.fromQuaternion(coin.rotation);
			mView.translate(coin.position.x, coin.position.y, coin.position.z);

			const currency = this.currencies.get(coin.style.currency);
			const shape = currency.shape;
			const prog = currency.prog;

			shape.bind(gl);
			prog.use(Object.assign({
				'projview': mView.mult(mProj),
				'eye': mView.invert().apply3([0, 0, 0]),
				'rot': mView.as3(),
				'pos': shape.boundVertices(),
			}, currency.props));
			shape.render(gl);
		}
	}

	dom() {
		return this.canvas.dom();
	}
};
