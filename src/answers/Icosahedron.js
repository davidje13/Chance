import ModelData from '../3d/ModelData.js';

const GOLD_RTO = 1.61803398874989484820458683436563812;
const SIZEOF_FLOAT = 4;

const COMMON_TEX_COORDS = [
	[0.892578125, 0.613281250],
	[0.613281250, 0.892578125],
	[0.996093750, 0.996093750],
];

const TRI_DATA = [];
const INDICES = [];

function addTriangle(pts, uvs) {
	TRI_DATA.push({pts, uvs});
	for (let i = 0; i < 3; ++ i) {
		INDICES.push(INDICES.length);
	}
}

addTriangle([[0,  1,  GOLD_RTO], [0, -1,  GOLD_RTO], [ GOLD_RTO, 0,  1]], [[1, 0], [0, 1], [2, 1]]);
addTriangle([[0, -1,  GOLD_RTO], [0,  1,  GOLD_RTO], [-GOLD_RTO, 0,  1]], [[2, 1], [3, 0], [1, 0]]);
addTriangle([[0, -1, -GOLD_RTO], [0,  1, -GOLD_RTO], [ GOLD_RTO, 0, -1]], [[3, 0], [2, 1], [4, 1]]);
addTriangle([[0,  1, -GOLD_RTO], [0, -1, -GOLD_RTO], [-GOLD_RTO, 0, -1]], [[4, 1], [5, 0], [3, 0]]);

addTriangle([[ GOLD_RTO, 0,  1], [ GOLD_RTO, 0, -1], [ 1,  GOLD_RTO, 0]], [[5, 0], [4, 1], [6, 1]]);
addTriangle([[ GOLD_RTO, 0, -1], [ GOLD_RTO, 0,  1], [ 1, -GOLD_RTO, 0]], [[6, 1], [7, 0], [5, 0]]);
addTriangle([[-GOLD_RTO, 0, -1], [-GOLD_RTO, 0,  1], [-1,  GOLD_RTO, 0]], [[1, 2], [2, 1], [0, 1]]);
addTriangle([[-GOLD_RTO, 0,  1], [-GOLD_RTO, 0, -1], [-1, -GOLD_RTO, 0]], [[2, 1], [1, 2], [3, 2]]);

addTriangle([[ 1,  GOLD_RTO, 0], [-1,  GOLD_RTO, 0], [0,  1,  GOLD_RTO]], [[3, 2], [4, 1], [2, 1]]);
addTriangle([[-1,  GOLD_RTO, 0], [ 1,  GOLD_RTO, 0], [0,  1, -GOLD_RTO]], [[4, 1], [3, 2], [5, 2]]);
addTriangle([[-1, -GOLD_RTO, 0], [ 1, -GOLD_RTO, 0], [0, -1,  GOLD_RTO]], [[5, 2], [6, 1], [4, 1]]);
addTriangle([[ 1, -GOLD_RTO, 0], [-1, -GOLD_RTO, 0], [0, -1, -GOLD_RTO]], [[6, 1], [5, 2], [7, 2]]);

addTriangle([[ GOLD_RTO, 0,  1], [0, -1,  GOLD_RTO], [ 1, -GOLD_RTO, 0]], [[1, 2], [0, 3], [2, 3]]);
addTriangle([[0,  1, -GOLD_RTO], [-GOLD_RTO, 0, -1], [-1,  GOLD_RTO, 0]], [[2, 3], [3, 2], [1, 2]]);

addTriangle([[0, -1,  GOLD_RTO], [-GOLD_RTO, 0,  1], [-1, -GOLD_RTO, 0]], [[3, 2], [2, 3], [4, 3]]);
addTriangle([[ GOLD_RTO, 0, -1], [0,  1, -GOLD_RTO], [ 1,  GOLD_RTO, 0]], [[4, 3], [5, 2], [3, 2]]);

addTriangle([[0,  1,  GOLD_RTO], [ GOLD_RTO, 0,  1], [ 1,  GOLD_RTO, 0]], [[5, 2], [4, 3], [6, 3]]);
addTriangle([[-GOLD_RTO, 0, -1], [0, -1, -GOLD_RTO], [-1, -GOLD_RTO, 0]], [[6, 3], [7, 2], [5, 2]]);

addTriangle([[0, -1, -GOLD_RTO], [ GOLD_RTO, 0, -1], [ 1, -GOLD_RTO, 0]], [[1, 4], [2, 3], [0, 3]]);
addTriangle([[-GOLD_RTO, 0,  1], [0,  1,  GOLD_RTO], [-1,  GOLD_RTO, 0]], [[2, 3], [1, 4], [3, 4]]);

const step = 7;

function add(v1, v2) {
	return [
		v1[0] + v2[0],
		v1[1] + v2[1],
		v1[2] + v2[2],
	];
}

function sub(v1, v2) {
	return [
		v1[0] - v2[0],
		v1[1] - v2[1],
		v1[2] - v2[2],
	];
}

function cross(v1, v2) {
	return [
		v1[1] * v2[2] - v1[2] * v2[1],
		v1[2] * v2[0] - v1[0] * v2[2],
		v1[0] * v2[1] - v1[1] * v2[0],
	];
}

function mul(v, m) {
	return [
		v[0] * m,
		v[1] * m,
		v[2] * m,
	];
}

function norm(v) {
	return mul(v, 1 / Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]));
}

function interp(v1, v2, a) {
	return add(mul(v1, 1 - a), mul(v2, a));
}

function pushAll(target, v) {
	target.push(v[0]);
	target.push(v[1]);
	target.push(v[2]);
}

function generateVertUvs(inset, inflate) {
	const vertuvs = [];
	for (const {pts, uvs} of TRI_DATA) {
		const c = mul(add(add(pts[0], pts[1]), pts[2]), 1/3);
		const out = norm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
		const raise = mul(out, inflate);

		for (let i = 0; i < 3; ++ i) {
			pushAll(vertuvs, add(interp(pts[i], c, inset), raise));
			vertuvs.push(COMMON_TEX_COORDS[i][0]);
			vertuvs.push(COMMON_TEX_COORDS[i][1]);
			vertuvs.push(uvs[i][0] / 7);
			vertuvs.push(uvs[i][1] * 0.2421875);
		}
	}
	return vertuvs;
}

export default class Icosahedron extends ModelData {
	constructor({inset = 0, inflate = 0} = {}) {
		super(step * SIZEOF_FLOAT);
		this.dirtyIndices = true;
		this.dirtyVertices = true;

		this.vertuvs = generateVertUvs(inset, inflate);
	}

	rebuildIndices() {
		this.setIndices(Uint16Array.from(INDICES));
	}

	rebuildVertices() {
		this.setData(Float32Array.from(this.vertuvs));
	}

	points() {
		const pts = [];
		for (let i = 0; i < this.vertuvs.length; i += step) {
			pts.push([
				this.vertuvs[i    ],
				this.vertuvs[i + 1],
				this.vertuvs[i + 2],
			]);
		}
		return pts;
	}

	boundVertices() {
		return this.boundData(this.gl.FLOAT, 0 * SIZEOF_FLOAT, 3);
	}

	boundUvs() {
		return this.boundData(this.gl.FLOAT, 3 * SIZEOF_FLOAT, 2);
	}

	boundNetUvs() {
		return this.boundData(this.gl.FLOAT, 5 * SIZEOF_FLOAT, 2);
	}
};
