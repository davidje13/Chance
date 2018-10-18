import Canvas from '../3d/Canvas.js';
import Program from '../3d/Program.js';
import {VertexShader, FragmentShader} from '../3d/Shader.js';
import {Texture2D} from '../3d/Texture.js';
import Box from '../3d/Box.js';
import DepthFrag from '../3d/DepthFrag.js';
import {M4} from '../math/Matrix.js';
import Quaternion from '../math/Quaternion.js';

function normalize(v) {
	const m = 1 / Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
	return [v[0] * m, v[1] * m, v[2] * m];
}

const PROG_SHAPE_VERT = `
	uniform lowp mat4 projview;

	attribute vec4 pos;

	varying lowp vec3 p;
	varying lowp vec3 n;
	varying lowp vec2 t;
	varying lowp float thickness;

	void main() {
		p = pos.xyz;
		n = vec3(0.0, 0.0, sign(p.z));
		if (p.z > 0.0) {
			t = vec2(-p.x, p.y) * 0.25 + vec2(0.25, 0.25);
		} else {
			t = p.xy * 0.25 + vec2(0.75, 0.25);
		}
		thickness = abs(pos.z);
		gl_Position = projview * pos;
	}
`;

const PROG_SHAPE_FRAG = DepthFrag() + `
	uniform sampler2D normalMap;
	uniform lowp mat3 rot;
	uniform highp vec3 eye;
	uniform lowp float maxDepth;

	varying lowp vec3 p;
	varying lowp vec3 n;
	varying lowp vec2 t;
	varying lowp float thickness;

	const lowp vec3 ambientCol = vec3(0.3);
	const lowp vec3 lightCol = vec3(0.7);
	const lowp vec4 shineCol = vec4(1.0, 1.0, 0.6, 0.5);
	const lowp vec3 lightDir = vec3(0.0, 0.0, 1.0);
	const lowp vec3 shineDir = normalize(vec3(0.0, 1.0, 2.0));
	const lowp vec3 baseCol = vec3(0.82, 0.78, 0.33);

	lowp vec3 normalAt(in lowp vec2 uv) {
		return texture2D(normalMap, uv).xyz * 2.0 - 1.0;
	}

	lowp vec4 metal(in lowp vec3 norm, in lowp vec3 ref) {
		return vec4(
			mix(
				baseCol * (ambientCol + lightCol * dot(rot * norm, lightDir)),
				shineCol.rgb,
				smoothstep(0.49, 0.51, dot(rot * ref, shineDir)) * shineCol.a
			),
			1.0
		);
	}

	void main() {
		lowp vec3 ray = normalize(p - eye);
		if (length(p.xy) > 1.0) {
			highp float ee = dot(eye.xy, eye.xy);
			highp float er = dot(eye.xy, ray.xy);
			highp float rr = dot(ray.xy, ray.xy);
			highp float root = er * er - ee * rr + rr;
			if (root < 0.0) {
				discard;
			}
			root = sqrt(root);
			highp float l = (-er - root) / rr;
			lowp vec3 pos = eye + ray * l;
			lowp vec3 norm = vec3(pos.xy, 0.0);
			if (pos.z < -thickness || pos.z > thickness) {
				discard;
			}
			lowp float bump = atan(pos.y / pos.x) * 100.0;
			norm.x += sin(bump) * 0.5;
			norm.y += cos(bump) * 0.5;
			norm = normalize(norm);
			gl_FragColor = metal(norm, reflect(ray, norm));
			return;
		}

		lowp vec2 uv = t;
		lowp mat3 faceD;
		faceD[2] = n;
		faceD[1] = vec3(0.0, 1.0, 0.0);
		faceD[0] = cross(faceD[2], faceD[1]);
		lowp vec3 texSpaceRay = ray * faceD;
		lowp float zmult = -1.0 / texSpaceRay.z;
		lowp vec2 duv = texSpaceRay.xy * zmult * 0.5;

		lowp vec2 dd = (step(0.0, duv) - uv) / duv;

		lowp float depthLimit = min(maxDepth, min(dd.x, dd.y));
		lowp float depth = depthAt(normalMap, uv, duv, maxDepth, depthLimit);
		lowp vec3 pos = p + ray * depth * zmult;
		uv += duv * depth;

		lowp vec3 norm = faceD * normalAt(uv);

		gl_FragColor = metal(norm, reflect(ray, norm));
	}
`;

export default class Coins3DRenderer {
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

		this.shape = new Box({width: 2.1, height: 2.1, depth: 0.28});

		this.prog = new Program(gl, [
			new VertexShader(gl, PROG_SHAPE_VERT),
			new FragmentShader(gl, PROG_SHAPE_FRAG),
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
