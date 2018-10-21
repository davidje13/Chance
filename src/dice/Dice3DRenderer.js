import Canvas from '../3d/Canvas.js';
import Program from '../3d/Program.js';
import {VertexShader, FragmentShader} from '../3d/Shader.js';
import {Texture2D} from '../3d/Texture.js';
import Cube from '../3d/Cube.js';
import {M4} from '../math/Matrix.js';
import Quaternion from '../math/Quaternion.js';
import PROG_SHAPE_VERT from './shaders/VertexProject.js';
import PROG_GLOSS_FRAG_HELPER from './shaders/Gloss.js';
import PROG_GRAIN_FRAG_HELPER from './shaders/MatWood.js';
import PROG_FLAT_FRAG_HELPER from './shaders/MatFlat.js';
import PROG_FACE_FRAG_HELPER from './shaders/GeomCube.js';
import PROG_SHAPE_FRAG from './shaders/ShapeDirect.js';
import PROG_TRUNC_BALL_FRAG from './shaders/ShapeRoundedCube.js';

function normalize(v) {
	const m = 1 / Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
	return [v[0] * m, v[1] * m, v[2] * m];
}

function length2(v) {
	return v.x * v.x + v.y * v.y + v.z * v.z;
}

function loadAtlas(gl, url) {
	const atlas = new Texture2D(gl, {
		[gl.TEXTURE_MAG_FILTER]: gl.LINEAR,
		[gl.TEXTURE_MIN_FILTER]: gl.LINEAR,
		[gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
		[gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE,
	});
	atlas.setSolid(0, 0, 0, 0);
	atlas.loadImage(url);
	return atlas;
}

function loadNormalMap(gl, url, depth) {
	const normalMap = new Texture2D(gl, {
		[gl.TEXTURE_MAG_FILTER]: gl.LINEAR,
		[gl.TEXTURE_MIN_FILTER]: gl.LINEAR,
		[gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
		[gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE,
	});
	normalMap.setSolid(0.5, 0.5, 1.0, 1.0);
	normalMap.generateNormalMap(url, depth);
	return normalMap;
}

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

		this.fov = 0.6;
		const maxDepth = 0.1;

		const texVolumeTransform = M4.fromQuaternion(Quaternion.fromRotation({
			x: 0.2,
			y: 0.8,
			z: 0.3,
			angle: 0.8,
		}));
		texVolumeTransform.translate(1.0, -2.0, 0.5);
		texVolumeTransform.scale(5.0);

		this.worldProps = {
			'lightDir': normalize([0.0, 0.5, 1.0]),
			'shineDir': normalize([0.0, 2.0, 1.0]),
			'maxDepth': maxDepth,
		};

		this.shapes = new Map();
		this.materials = new Map();
		this.textures = new Map();
		this.programs = new Map();

		this.shapes.set('cube', {
			prog: 'shape',
			geom: new Cube({rounding: 0.05, segmentation: 2}),
		});
		this.shapes.set('cube-fillet', {
			prog: 'shape',
			geom: new Cube({rounding: 0.2, segmentation: 8}),
		});
		this.shapes.set('cube-clipped', {
			prog: 'rounded',
			geom: new Cube(),
			props: {
				'radius': 1.5,
				'invFaceRad': 1 / Math.sqrt(1.5 * 1.5 - 1),
				'rounding': 0.02,
			},
		});
		this.shapes.set('cube-rounded', {
			prog: 'rounded',
			geom: new Cube(),
			props: {
				'radius': 1.37,
				'invFaceRad': 1 / Math.sqrt(1.37 * 1.37 - 1),
				'rounding': 0.05,
			},
		});

		this.materials.set('unlit', {prog: 'flat', props: {
			'matt': [1.0, 1.0, 1.0],
			'ambientCol': [1.0, 1.0, 1.0],
			'lightCol': [0.0, 0.0, 0.0],
			'shineCol': [0.0, 0.0, 0.0, 0.0],
			'dotOpacity': 1.0,
		}});

		this.materials.set('wood', {prog: 'grain', props: {
			'textureVolumeTransform': texVolumeTransform,
			'ambientCol': [0.6, 0.6, 0.6],
			'lightCol': [0.35, 0.35, 0.35],
			'shineCol': [0, 0, 0, 0],
			'dotOpacity': 0.9,
		}});

		this.materials.set('wood-varnished', {prog: 'grain', props: {
			'textureVolumeTransform': texVolumeTransform,
			'ambientCol': [0.5, 0.5, 0.5],
			'lightCol': [0.5, 0.5, 0.5],
			'shineCol': [1.0, 1.0, 0.95, 0.1],
			'dotOpacity': 0.9,
		}});

		this.materials.set('metal-black', {prog: 'flat', props: {
			'matt': [0.28, 0.28, 0.3],
			'ambientCol': [0.1, 0.1, 0.1],
			'lightCol': [0.6, 0.6, 0.6],
			'shineCol': [0.95, 0.95, 1.0, 0.8],
			'dotOpacity': 0.0,
		}});

		this.materials.set('plastic-white', {prog: 'flat', props: {
			'matt': [0.95, 0.95, 0.97],
			'ambientCol': [0.6, 0.6, 0.6],
			'lightCol': [0.4, 0.4, 0.4],
			'shineCol': [1.0, 1.0, 1.0, 0.3],
			'dotOpacity': 1.0,
		}});

		this.materials.set('plastic-red', {prog: 'flat', props: {
			'matt': [0.8, 0.2, 0.1],
			'ambientCol': [0.6, 0.6, 0.6],
			'lightCol': [0.4, 0.4, 0.4],
			'shineCol': [1.0, 0.9, 0.8, 0.2],
			'dotOpacity': 1.0,
		}});

		const worldFaceWidth = 2.0;
		const normalMapFaceWidth = 0.25;
		const normalMapFaceDepth = maxDepth * normalMapFaceWidth / worldFaceWidth;

		const atlas1 = loadAtlas(gl, 'resources/dice/atlas1.png');
		const normalMap1 = loadNormalMap(gl, 'resources/dice/depth1.png', normalMapFaceDepth);

		const atlas2 = loadAtlas(gl, 'resources/dice/atlas2.png');
		const normalMap2 = loadNormalMap(gl, 'resources/dice/depth2.png', normalMapFaceDepth);

		this.textures.set('european', {
			atlas: atlas1,
			normalMap: normalMap1,
			origin: [0, 0],
		});

		this.textures.set('asian', {
			atlas: atlas1,
			normalMap: normalMap1,
			origin: [0, 0.5],
		});

		this.textures.set('numeric', {
			atlas: atlas2,
			normalMap: normalMap2,
			origin: [0, 0],
		});

		this.textures.set('written', {
			atlas: atlas2,
			normalMap: normalMap2,
			origin: [0, 0.5],
		});

		const vertShader = new VertexShader(gl, PROG_SHAPE_VERT);

		this.programs.set('shape grain', new Program(gl, [
			vertShader,
			new FragmentShader(gl,
				PROG_FACE_FRAG_HELPER +
				PROG_GLOSS_FRAG_HELPER +
				PROG_GRAIN_FRAG_HELPER +
				PROG_SHAPE_FRAG
			),
		]));

		this.programs.set('rounded grain', new Program(gl, [
			vertShader,
			new FragmentShader(gl,
				PROG_FACE_FRAG_HELPER +
				PROG_GLOSS_FRAG_HELPER +
				PROG_GRAIN_FRAG_HELPER +
				PROG_TRUNC_BALL_FRAG
			),
		]));

		this.programs.set('shape flat', new Program(gl, [
			vertShader,
			new FragmentShader(gl,
				PROG_FACE_FRAG_HELPER +
				PROG_GLOSS_FRAG_HELPER +
				PROG_FLAT_FRAG_HELPER +
				PROG_SHAPE_FRAG
			),
		]));

		this.programs.set('rounded flat', new Program(gl, [
			vertShader,
			new FragmentShader(gl,
				PROG_FACE_FRAG_HELPER +
				PROG_GLOSS_FRAG_HELPER +
				PROG_FLAT_FRAG_HELPER +
				PROG_TRUNC_BALL_FRAG
			),
		]));
	}

	resize(width, height) {
		this.canvas.resize(width, height);
	}

	widthAtZ(z, {insetPixels = 0} = {}) {
		return (
			z * 2
			* Math.tan(this.fov)
			* (this.canvas.width() - insetPixels * this.canvas.pixelRatio())
			/ this.canvas.height()
		);
	}

	heightAtZ(z, {insetPixels = 0} = {}) {
		return (
			z * 2
			* Math.tan(this.fov)
			* (this.canvas.height() - insetPixels * this.canvas.pixelRatio())
			/ this.canvas.height()
		);
	}

	render(dice) {
		const gl = this.canvas.gl;
		gl.clear(gl.COLOR_BUFFER_BIT);

		const mProj = M4.perspective(this.fov, this.canvas.width() / this.canvas.height(), 1.0, 100.0);

		const orderedDice = dice.slice().sort((a, b) => {
			const dA = length2(a.position);
			const dB = length2(b.position);
			return dB - dA;
		});

		for (const die of orderedDice) {
			const mView = M4.fromQuaternion(die.rotation);
			mView.translate(die.position.x, die.position.y, die.position.z);

			const shape = this.shapes.get(die.style.shape);
			const material = this.materials.get(die.style.material);
			const texture = this.textures.get(die.style.dots);

			const prog = this.programs.get(shape.prog + ' ' + material.prog);

			shape.geom.bind(gl);
			prog.use(Object.assign({
				'projview': mView.mult(mProj),
				'eye': mView.invert().apply3([0, 0, 0]),
				'rot': mView.as3(),
				'pos': shape.geom.boundVertices(),
				'norm': shape.geom.boundNormals(),
				'uvOrigin': texture.origin,
				'atlas': texture.atlas,
				'normalMap': texture.normalMap,
			}, this.worldProps, shape.props, material.props));
			shape.geom.render(gl);
		}
	}

	dom() {
		return this.canvas.dom();
	}
};
