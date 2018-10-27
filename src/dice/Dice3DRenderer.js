import Canvas from '../3d/Canvas.js';
import Program from '../3d/Program.js';
import {VertexShader, FragmentShader} from '../3d/Shader.js';
import {Texture2D} from '../3d/Texture.js';
import Framebuffer from '../3d/Framebuffer.js';
import Cube from '../3d/Cube.js';
import ScreenQuad from '../3d/ScreenQuad.js';
import {M4} from '../math/Matrix.js';
import {V3} from '../math/Vector.js';
import Quaternion from '../math/Quaternion.js';
import PROG_SHAPE_VERT from './shaders/VertexProject.js';
import PROG_GLOSS_FRAG_HELPER from './shaders/Gloss.js';
import PROG_GRAIN_FRAG_HELPER from './shaders/MatWood.js';
import PROG_FLAT_FRAG_HELPER from './shaders/MatFlat.js';
import PROG_FACE_FRAG_HELPER from './shaders/GeomCube.js';
import PROG_COL_FRAG_HELPER from './shaders/TargetCol.js';
import PROG_SHADOW_FRAG_HELPER from './shaders/TargetShadow.js';
import PROG_SHAPE_FRAG from './shaders/ShapeDirect.js';
import PROG_TRUNC_BALL_FRAG from './shaders/ShapeRoundedCube.js';

const ZERO = {x: 0, y: 0, z: 0};

function normalize(v) {
	const m = 1 / Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
	return [v[0] * m, v[1] * m, v[2] * m];
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

const PROG_COVER_VERT = `
	attribute vec4 pos;
	attribute vec2 tex;
	varying lowp vec2 t;
	void main() {
		gl_Position = pos;
		t = tex;
	}
`;

const PROG_FLOOR_FRAG = `
	uniform mediump float opacity;
	uniform sampler2D atlas;
	varying lowp vec2 t;
	void main() {
		gl_FragColor = texture2D(atlas, t) * opacity;
	}
`;

export default class Dice3DRenderer {
	constructor({shadow = true} = {}) {
		this.canvas = new Canvas(1, 1, {
			alpha: true,
			antialias: false,
			depth: true,
			powerPreference: 'low-power',
			premultipliedAlpha: true,
			preserveDrawingBuffer: false,
			stencil: false,
		}, {maxOversampleResolution: 3});
		this.canvas.dom().className = 'render';

		const gl = this.canvas.gl;
		this.shadow = shadow;

		gl.clearColor(0, 0, 0, 0);
		gl.cullFace(gl.BACK);
		gl.enable(gl.CULL_FACE);
		gl.depthFunc(gl.LESS);

		if (shadow) {
			this.floor = new ScreenQuad({uv: {left: 0, right: 1, top: 1, bottom: 0}});
			this.floorZ = 0;

			this.shadowBufferTex = new Texture2D(gl, {
				[gl.TEXTURE_MAG_FILTER]: gl.NEAREST,
				[gl.TEXTURE_MIN_FILTER]: gl.NEAREST,
				[gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
				[gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE,
			});

			this.shadowBufferTex.set(this.canvas.width(), this.canvas.height());
			this.shadowBuffer = new Framebuffer(gl, this.shadowBufferTex);
		}

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

		if (shadow) {
			this.programs.set('shape shadow', new Program(gl, [
				vertShader,
				new FragmentShader(gl,
					PROG_SHADOW_FRAG_HELPER +
					PROG_SHAPE_FRAG
				),
			]));

			this.programs.set('rounded shadow', new Program(gl, [
				vertShader,
				new FragmentShader(gl,
					PROG_SHADOW_FRAG_HELPER +
					PROG_TRUNC_BALL_FRAG
				),
			]));
		}

		this.programs.set('shape grain', new Program(gl, [
			vertShader,
			new FragmentShader(gl,
				PROG_FACE_FRAG_HELPER +
				PROG_GLOSS_FRAG_HELPER +
				PROG_GRAIN_FRAG_HELPER +
				PROG_COL_FRAG_HELPER +
				PROG_SHAPE_FRAG
			),
		]));

		this.programs.set('rounded grain', new Program(gl, [
			vertShader,
			new FragmentShader(gl,
				PROG_FACE_FRAG_HELPER +
				PROG_GLOSS_FRAG_HELPER +
				PROG_GRAIN_FRAG_HELPER +
				PROG_COL_FRAG_HELPER +
				PROG_TRUNC_BALL_FRAG
			),
		]));

		this.programs.set('shape flat', new Program(gl, [
			vertShader,
			new FragmentShader(gl,
				PROG_FACE_FRAG_HELPER +
				PROG_GLOSS_FRAG_HELPER +
				PROG_FLAT_FRAG_HELPER +
				PROG_COL_FRAG_HELPER +
				PROG_SHAPE_FRAG
			),
		]));

		this.programs.set('rounded flat', new Program(gl, [
			vertShader,
			new FragmentShader(gl,
				PROG_FACE_FRAG_HELPER +
				PROG_GLOSS_FRAG_HELPER +
				PROG_FLAT_FRAG_HELPER +
				PROG_COL_FRAG_HELPER +
				PROG_TRUNC_BALL_FRAG
			),
		]));

		if (shadow) {
			this.floorProg = new Program(gl, [
				new VertexShader(gl, PROG_COVER_VERT),
				new FragmentShader(gl, PROG_FLOOR_FRAG),
			]);
		}
	}

	resize(width, height) {
		this.canvas.resize(width, height);
		if (this.shadow) {
			this.shadowBufferTex.set(this.canvas.width(), this.canvas.height());
		}
	}

	widthAtZ(z, {insetPixels = 0} = {}) {
		return (
			-z * 2
			* Math.tan(this.fov)
			* (this.canvas.displayWidth() - insetPixels)
			/ this.canvas.displayHeight()
		);
	}

	heightAtZ(z, {insetPixels = 0} = {}) {
		return (
			-z * 2
			* Math.tan(this.fov)
			* (this.canvas.displayHeight() - insetPixels)
			/ this.canvas.displayHeight()
		);
	}

	renderShadow(dice) {
		const gl = this.canvas.gl;

		this.shadowBuffer.bind({assumeSameEnv: true});
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		const ww = this.widthAtZ(this.floorZ);
		const hh = this.heightAtZ(this.floorZ);
		const lightPos = {x: 0.0, y: hh * 0.6, z: hh * 0.3};
		const {mProj, mView} = M4.shadowPerspective(
			lightPos,
			{x: 0, y: 0, z: this.floorZ},
			{x: 0, y: 0, z: 1},
			{x: 0, y: 1, z: 0},
			ww,
			hh,
			1.0
		);

		const orderedDice = dice.slice().sort((a, b) => {
			const dA = V3.dist2(a.position, lightPos);
			const dB = V3.dist2(b.position, lightPos);
			return dB - dA;
		});

		for (const die of orderedDice) {
			const mModel = M4.fromQuaternion(die.rotation);
			mModel.translate(die.position.x, die.position.y, die.position.z);

			const mMV = mModel.mult(mView);

			const shape = this.shapes.get(die.style.shape);

			const prog = this.programs.get(shape.prog + ' shadow');

			shape.geom.bind(gl);
			prog.use(Object.assign({
				'projview': mMV.mult(mProj),
				'eye': mMV.invert().apply3([0, 0, 0]),
				'pos': shape.geom.boundVertices(),
				'norm': shape.geom.boundNormals(),
			}, this.worldProps, shape.props));
			shape.geom.render(gl);
		}

		this.shadowBuffer.unbind();
	}

	renderScene(dice) {
		const gl = this.canvas.gl;

		if (this.shadow) {
			this.floor.bind(gl);
			this.floorProg.use({
				'opacity': 0.2,
				'atlas': this.shadowBufferTex,
				'pos': this.floor.boundVertices(),
				'tex': this.floor.boundUvs(),
			});
			this.floor.render(gl);
		}

		const mProj = M4.perspective(
			this.fov,
			this.canvas.width() / this.canvas.height(),
			1.0,
			-this.floorZ
		);
		const mView = M4.identity();
		const cameraPos = ZERO;

		const orderedDice = dice.slice().sort((a, b) => {
			const dA = V3.dist2(a.position, cameraPos);
			const dB = V3.dist2(b.position, cameraPos);
			return dB - dA;
		});

		gl.enable(gl.DEPTH_TEST);
		for (const die of orderedDice) {
			const mModel = M4.fromQuaternion(die.rotation);
			mModel.translate(die.position.x, die.position.y, die.position.z);

			const mMV = mModel.mult(mView);

			const shape = this.shapes.get(die.style.shape);
			const material = this.materials.get(die.style.material);
			const texture = this.textures.get(die.style.dots);

			const prog = this.programs.get(shape.prog + ' ' + material.prog);

			shape.geom.bind(gl);
			prog.use(Object.assign({
				'projview': mMV.mult(mProj),
				'eye': mMV.invert().apply3([cameraPos.x, cameraPos.y, cameraPos.z]),
				'rot': mMV.as3(),
				'pos': shape.geom.boundVertices(),
				'norm': shape.geom.boundNormals(),
				'uvOrigin': texture.origin,
				'atlas': texture.atlas,
				'normalMap': texture.normalMap,
			}, this.worldProps, shape.props, material.props));
			shape.geom.render(gl);
		}
		gl.disable(gl.DEPTH_TEST);
	}

	setFloorDepth(depth) {
		this.floorZ = -depth;
	}

	render(dice) {
		if (this.shadow) {
			this.renderShadow(dice);
		}
		this.renderScene(dice);
	}

	dom() {
		return this.canvas.dom();
	}
};
