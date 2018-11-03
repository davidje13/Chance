import {V2} from '../../src/math/Vector.js';
import Quaternion from '../../src/math/Quaternion.js';
import {Texture2D} from '../../src/3d/Texture.js';
import Coins3DRenderer from '../../src/coins/Coins3DRenderer.js';

const texW = 512;
const texH = 512;

const face1 = {x: 0, y: 0, w: 256, h: 256};
const face2 = {x: 256, y: 0, w: 256, h: 256};
const edge = {x: 0, y: 264, w: 512, h: 48}; // active area is y: 272, h: 32

const SQRT3_2 = Math.sqrt(3) / 2;

const fmSides = document.getElementById('sides');
const fmRoundRad = document.getElementById('roundRad');
const fmInset = document.getElementById('inset');
const fmEdgeDepth = document.getElementById('edgeDepth');
const fmSuggestedDepth = document.getElementById('suggestedDepth');
const fmFaceDepth = document.getElementById('faceDepth');
const fmThickness = document.getElementById('thickness');

fmSides.addEventListener('input', renderFromInputs);
fmRoundRad.addEventListener('input', renderFromInputs);
fmInset.addEventListener('input', renderFromInputs);
fmEdgeDepth.addEventListener('input', renderFromInputs);

window.devicePixelRatio = 1;
const canvas = document.createElement('canvas');
canvas.width = texW;
canvas.height = texH;
canvas.style.imageRendering = 'pixelated';
canvas.style.border = '1px solid #CCCCCC';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');
const dat = ctx.createImageData(texW, texH);
dat.data.fill(255);

class CustomCoins3DRenderer extends Coins3DRenderer {
	constructor() {
		super({
			shadow: false,
			maxOversampleResolution: 1.5,
			fov: 0.3,
		});

		const gl = this.canvas.gl;

		this.currencyName = 'gbp';
		this.currency = this.currencies.get(this.currencyName);

		this.normalMap = new Texture2D(gl, {
			[gl.TEXTURE_MAG_FILTER]: gl.LINEAR,
			[gl.TEXTURE_MIN_FILTER]: gl.LINEAR,
			[gl.TEXTURE_WRAP_S]: gl.REPEAT,
			[gl.TEXTURE_WRAP_T]: gl.CLAMP_TO_EDGE,
		});
		this.normalMap.setSolid(0.5, 0.5, 0, 1);
		this.normalMapSize = [1, 1];
		this.currency.props['normalMap'] = this.normalMap;
		this.currency.props['normalMapSize'] = this.normalMapSize;
	}

	updateDepthMap(data) {
		this.normalMap.convertNormalMap(data);
		this.normalMapSize[0] = data.width;
		this.normalMapSize[1] = data.height;
	}

	render({
		thickness,
		faceDepth,
		edgeDepth,
		twoToneRad = 0,
		punchRad = 0,
	}, coins) {
		this.currency.shape.resize({depth: thickness});
		this.currency.props['maxDepth'] = faceDepth;
		this.currency.props['edgeMaxDepth'] = edgeDepth;
		this.currency.props['twoToneRad'] = twoToneRad;
		this.currency.props['punchRad'] = punchRad;

		super.render(
			coins.map((coin) => Object.assign({style: {currency: this.currencyName}}, coin)),
			{raisedCam: false}
		);
	}
}

const renderer = new CustomCoins3DRenderer();
renderer.resize(256, 256);

const scene = renderer.dom();
scene.style.position = 'absolute';
scene.style.top = '0';
scene.style.right = '0';
document.body.appendChild(scene);

let tm3d = null;

function renderFromInputs() {
	const sides = Math.max(Math.round(fmSides.value), 3);
	const roundingRad = Math.max(0, Math.min(1, fmRoundRad.value));

	render(ctx, {
		sides,
		roundingRad,
		inset: fmInset.value,
		depth: fmEdgeDepth.value,
	});

	if (tm3d === null) {
		tm3d = setTimeout(update3d, 100);
	}
}

function lineOffset(p, a, b) {
	const dir = V2.normalise(V2.sub(b, a));
	return V2.dot(V2.sub(p, a), {x: dir.y, y: -dir.x});
}

function withinLineBounds(p, a, b) {
	const dir = V2.normalise(V2.sub(b, a));
	const pos = V2.dot(V2.sub(p, a), dir);
	return (pos >= 0 && pos <= V2.dist(a, b));
}

function lineDist(p, a, b) {
	return Math.abs(lineOffset(p, a, b));
}

function lineCircIntersectionDist(ray, centre, rad, back = false) {
	const ee = V2.dot(centre, centre);
	const er = -V2.dot(centre, ray);
	const root = er * er - ee + rad * rad;
	if (root < 0) {
		return Number.POSITIVE_INFINITY;
	}
	return Math.sqrt(root) * (back ? 1 : -1) - er;
}

function step(v, low, high) {
	if (high === low) {
		return v > low ? 1 : 0;
	}
	return Math.max(0, Math.min(1, (v - low) / (high - low)));
}

function quantise(v) {
	return Math.max(0, Math.min(255, Math.floor(v * 256)));
}

function fill(dat, {x, y, w, h}, fn) {
	const pix = 1 / w;
	for (let Y = 0; Y < h; ++ Y) {
		for (let X = 0; X < w; ++ X) {
			const p = {x: (X + 0.5) / w, y: (Y + 0.5) / h};
			const v = quantise(fn(p, pix));
			const dp = ((y + Y) * dat.width + x + X) * 4;
			dat.data[dp  ] = v;
			dat.data[dp+1] = v;
			dat.data[dp+2] = v;
			dat.data[dp+3] = 255;
		}
	}
}

function render(ctx, {sides, roundingRad, inset, depth}) {
	const distC = 1 - roundingRad;
	const rad = roundingRad - inset;
	const centres = [];

	const sideTheta = Math.PI * 2 / sides;

	for (let i = 0; i < sides; ++ i) {
		const theta = i * sideTheta;
		centres.push({x: Math.sin(theta) * distC, y: -Math.cos(theta) * distC});
	}

	const outerTheta = Math.PI - sideTheta;
	const lineDelta = {x: rad * Math.cos(outerTheta * 0.5), y: -rad * Math.sin(outerTheta * 0.5)};
	const lineP1 = V2.add(centres[0], lineDelta);
	const lineP2 = V2.add(centres[1], lineDelta);
	const edgeCrossAngle = Math.atan(-lineP1.x / lineP1.y);
	const lineD = V2.sub(lineP2, lineP1);

	let edgeLowest = 1;

	function faceLumAt(p, pixel) {
		p.x = p.x * 2 - 1;
		p.y = p.y * 2 - 1;
		let v = rad + pixel + 1;
		let maxO = Number.NEGATIVE_INFINITY;
		for (let i = 0; i < sides; ++ i) {
			const c1 = centres[i];
			const c2 = centres[(i + 1) % sides];
			const o = lineOffset(p, c1, c2);
			const r = V2.dist(p, c1);
			maxO = Math.max(maxO, o);
			v = Math.min(v, r);
			if (withinLineBounds(p, c1, c2)) {
				v = Math.min(v, Math.abs(o));
			}
		}
		if (maxO < 0) {
			v = maxO;
		}
		return step(v, rad - pixel, rad + pixel);
	}

	function edgeLumAt(p) {
		let theta = p.x;
		while (theta > 1 / sides) {
			theta -= 1 / sides;
		}
		if (theta > 0.5 / sides) {
			theta = 1 / sides - theta;
		}
		theta = theta * Math.PI * 2;
		const ray = {x: Math.sin(theta), y: -Math.cos(theta)};
		let dist;
		if (theta > edgeCrossAngle) {
			dist = V2.cross(lineP1, lineD) / V2.cross(ray, lineD);
		} else {
			dist = lineCircIntersectionDist(ray, centres[0], rad, true);
		}
		edgeLowest = Math.min(edgeLowest, dist);
		return 1 - (1 - dist) / depth;
	}

	function edgeFaceLumAt(p, pixel) {
		const c = {x: p.x * 2 - 1, y: p.y * 2 - 1};
		const theta = Math.atan2(c.x, c.y);
		const x = theta * 0.5 / Math.PI + 0.5;
		const len = V2.length(c);
		const d = 1 - (1 - quantise(edgeLumAt({x, y: 0.5})) / 255) * depth;
		return step(len, d - pixel, d + pixel);
	}

	fill(dat, face1, faceLumAt);
	fill(dat, edge, edgeLumAt);
	fill(dat, face2, edgeFaceLumAt);

	ctx.putImageData(dat, 0, 0);

	fmSuggestedDepth.innerText = (1 - edgeLowest).toFixed(3);
}

function update3d() {
	tm3d = null;

	renderer.updateDepthMap(ctx.getImageData(0, 0, texW, texH));
}

const coin = {
	position: {x: 0, y: 0, z: -4},
	rotation: Quaternion.identity(),
};

function render3d(tm) {
	coin.rotation = Quaternion.fromRotation({x: 0, y: 1, z: 0, angle: tm * 0.001});

	renderer.render({
		thickness: Number(fmThickness.value),
		faceDepth: Number(fmFaceDepth.value),
		edgeDepth: Number(fmEdgeDepth.value),
	}, [coin]);

	requestAnimationFrame(render3d);
}

renderFromInputs();
requestAnimationFrame(render3d);
