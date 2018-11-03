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

function loadAtlas(gl, url, downsample) {
	const atlas = new Texture2D(gl, {
		[gl.TEXTURE_MAG_FILTER]: gl.LINEAR,
		[gl.TEXTURE_MIN_FILTER]: gl.LINEAR,
		[gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
		[gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE,
	});
	atlas.setSolid(0, 0, 0, 0);
	atlas.loadImage(url, {downsample});
	return atlas;
}

function loadNormalMap(gl, url, downsample, then) {
	const normalMap = new Texture2D(gl, {
		[gl.TEXTURE_MAG_FILTER]: gl.LINEAR,
		[gl.TEXTURE_MIN_FILTER]: gl.LINEAR,
		[gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
		[gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE,
	});
	normalMap.setSolid(0.5, 0.5, 1.0, 1.0);
	normalMap.generateNormalMap(url, {downsample}).then(then);
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
	constructor({
		shadow = true,
		maxOversampleResolution = 3,
		downsampleTextures = false,
		fov = 0.6,
	} = {}) {
		this.canvas = new Canvas(1, 1, {
			alpha: true,
			antialias: false,
			depth: true,
			powerPreference: 'low-power',
			premultipliedAlpha: true,
			preserveDrawingBuffer: false,
			stencil: false,
		}, {maxOversampleResolution});
		this.canvas.dom().className = 'render';

		const gl = this.canvas.gl;
		this.shadow = shadow;
		this.downsampleTextures = downsampleTextures;

		gl.clearColor(0, 0, 0, 0);
		gl.cullFace(gl.BACK);
		gl.depthFunc(gl.LESS);

		gl.enable(gl.CULL_FACE);

		if (shadow) {
			this.floor = new ScreenQuad({uv: {left: 0, right: 1, top: 1, bottom: 0}});

			this.shadowBufferTex = new Texture2D(gl, {
				[gl.TEXTURE_MAG_FILTER]: gl.NEAREST,
				[gl.TEXTURE_MIN_FILTER]: gl.NEAREST,
				[gl.TEXTURE_WRAP_S]: gl.CLAMP_TO_EDGE,
				[gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE,
			});

			this.shadowBufferTex.set(this.canvas.bufferWidth(), this.canvas.bufferHeight());
			this.shadowBuffer = new Framebuffer(this.canvas, this.shadowBufferTex);
		}

		this.fov = fov;
		this.floorZ = 100;

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
			'maxDepth': 0.1,
		};

		this.shapes = new Map();
		this.materials = new Map();
		this.textures = new Map();
		this.programs = new Map();

		this.shapes.set('void', {
			prog: 'shape',
			geom: new Cube({rounding: 0}),
			props: {
				'maxDepth': 0.5,
			},
		});
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

		this.materials.set('void', {prog: 'flat', props: {
			'matt': [1.0, 1.0, 1.0],
			'ambientCol': [0.8, 0.8, 0.8],
			'lightCol': [0.2, 0.2, 0.2],
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

		this.materials.set('metal-gold', {prog: 'flat', props: {
			'matt': [0.82, 0.75, 0.4],
			'ambientCol': [0.3, 0.3, 0.3],
			'lightCol': [0.7, 0.7, 0.7],
			'shineCol': [1.0, 1.0, 0.4, 0.5],
			'dotOpacity': 0.0,
		}});

		this.materials.set('metal-silver', {prog: 'flat', props: {
			'matt': [0.88, 0.85, 0.82],
			'ambientCol': [0.3, 0.3, 0.3],
			'lightCol': [0.7, 0.7, 0.7],
			'shineCol': [1.0, 1.0, 1.0, 0.5],
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

		const sources0 = {
			atlas: 'resources/dice/atlas0.png',
			normalMap: 'resources/dice/depth0.png',
		};

		const sources1 = {
			atlas: 'resources/dice/atlas1.png',
			normalMap: 'resources/dice/depth1.png',
		};

		const sources2 = {
			atlas: 'resources/dice/atlas2.png',
			normalMap: 'resources/dice/depth2.png',
		};

		this.textures.set('void',     {sources: sources0, origin: [0, 0.0]});
		this.textures.set('european', {sources: sources1, origin: [0, 0.0]});
		this.textures.set('asian',    {sources: sources1, origin: [0, 0.5]});
		this.textures.set('numeric',  {sources: sources2, origin: [0, 0.0]});
		this.textures.set('written',  {sources: sources2, origin: [0, 0.5]});

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
			this.shadowBufferTex.set(this.canvas.bufferWidth(), this.canvas.bufferHeight());
		}
	}

	widthAtZ(z, {insetPixels = 0} = {}) {
		return (
			-z * 2
			* Math.tan(this.fov)
			* (this.canvas.viewportDisplayWidth() - insetPixels)
			/ this.canvas.viewportDisplayHeight()
		);
	}

	heightAtZ(z, {insetPixels = 0} = {}) {
		return (
			-z * 2
			* Math.tan(this.fov)
			* (this.canvas.viewportDisplayHeight() - insetPixels)
			/ this.canvas.viewportDisplayHeight()
		);
	}

	renderShadow(dice) {
		const gl = this.canvas.gl;

		this.shadowBuffer.bind({assumeSameEnv: true});
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

	_prepareTextureSources(sources) {
		if (typeof sources['atlas'] === 'string') {
			const gl = this.canvas.gl;

			sources.atlas = loadAtlas(gl, sources.atlas, this.downsampleTextures);
			sources.normalMapSize = [0, 0];
			sources.normalMap = loadNormalMap(
				gl,
				sources.normalMap,
				this.downsampleTextures,
				({width, height}) => sources.normalMapSize = [width, height]
			);
		}
	}

	renderScene(dice) {
		const gl = this.canvas.gl;

		const mProj = M4.perspective(
			this.fov,
			this.canvas.viewportDisplayWidth() / this.canvas.viewportDisplayHeight(),
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
		gl.clear(gl.DEPTH_BUFFER_BIT);
		for (const die of orderedDice) {
			const mModel = M4.fromQuaternion(die.rotation);
			mModel.translate(die.position.x, die.position.y, die.position.z);

			const mMV = mModel.mult(mView);

			const shape = this.shapes.get(die.style.shape);
			const material = this.materials.get(die.style.material);
			const texture = this.textures.get(die.style.dots);
			this._prepareTextureSources(texture.sources);

			const prog = this.programs.get(shape.prog + ' ' + material.prog);

			shape.geom.bind(gl);
			prog.use(Object.assign({
				'projview': mMV.mult(mProj),
				'eye': mMV.invert().apply3([0, 0, 0]),
				'rot': mMV.as3(),
				'pos': shape.geom.boundVertices(),
				'norm': shape.geom.boundNormals(),
				'uvOrigin': texture.origin,
				'atlas': texture.sources.atlas,
				'normalMap': texture.sources.normalMap,
				'normalMapSize': texture.sources.normalMapSize,
			}, this.worldProps, shape.props, material.props));
			shape.geom.render(gl);
		}
		gl.disable(gl.DEPTH_TEST);
	}

	setFloorDepth(depth) {
		this.floorZ = -depth;
	}

	render(dice, {viewport = null, clear = true} = {}) {
		const gl = this.canvas.gl;
		if (viewport) {
			this.canvas.setViewport(viewport);
		}
		if (this.shadow) {
			this.renderShadow(dice);
			this.floor.bind(gl);
			this.floorProg.use({
				'opacity': 0.2,
				'atlas': this.shadowBufferTex,
				'pos': this.floor.boundVertices(),
				'tex': this.floor.boundUvs(),
			});
			this.floor.render(gl);
		} else if (clear) {
			gl.clear(gl.COLOR_BUFFER_BIT);
		}
		this.renderScene(dice);
	}

	dom() {
		return this.canvas.dom();
	}
};
