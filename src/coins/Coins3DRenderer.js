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

		this.shape = new Box({width: 2.1, height: 2.1, depth: 0.28});

		this.prog = new Program(gl, [
			new VertexShader(gl, PROG_SHAPE_VERT),
			new FragmentShader(gl, PROG_COL_FRAG_HELPER + PROG_COIN_FRAG),
		]);

		const maxDepth = 0.015;
		const worldFaceWidth = 2.0;
		const normalMapFaceWidth = 0.5;
		const normalMapFaceDepth = maxDepth * normalMapFaceWidth / worldFaceWidth;

		this.maxDepth = maxDepth;

		this.normalMap = new Texture2D(gl, {
			[gl.TEXTURE_MAG_FILTER]: gl.LINEAR,
			[gl.TEXTURE_MIN_FILTER]: gl.LINEAR,
			[gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
			[gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE,
		});
		this.normalMap.setSolid(0.5, 0.5, 1.0, 1.0);
		this.normalMap.generateNormalMap('resources/coins/depth-gbp.png', normalMapFaceDepth);
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
			mView.translate(coin.position.x, coin.position.y, coin.position.z - 8);

			const shape = this.shape;
			const prog = this.prog;

			shape.bind(gl);
			prog.use({
				'projview': mView.mult(mProj),
				'eye': mView.invert().apply3([0, 0, 0]),
				'rot': mView.as3(),
				'pos': shape.boundVertices(),
				'normalMap': this.normalMap,
				'maxDepth': this.maxDepth,
			});
			shape.render(gl);
		}
	}

	dom() {
		return this.canvas.dom();
	}
};
