import ModelData from './ModelData.js';

const GOLDEN_RATIO = 1.61803398874989484820458683436563812;

const COMMON_TEX_COORDS = [
	[0.892578125, 0.613281250],
	[0.613281250, 0.892578125],
	[0.996093750, 0.996093750],
];

const step = 7;
const VERTICES_UVS = [];
const INDICES = [];

function addTriangle(pts, uvs) {
	for (let i = 0; i < 3; ++ i) {
		VERTICES_UVS.push(pts[i][0]);
		VERTICES_UVS.push(pts[i][1]);
		VERTICES_UVS.push(pts[i][2]);
		VERTICES_UVS.push(COMMON_TEX_COORDS[i][0]);
		VERTICES_UVS.push(COMMON_TEX_COORDS[i][1]);
		VERTICES_UVS.push(uvs[i][0] / 7);
		VERTICES_UVS.push(uvs[i][1] * 0.2421875);
		INDICES.push(INDICES.length);
	}
}

addTriangle([[0,  1,  GOLDEN_RATIO], [0, -1,  GOLDEN_RATIO], [ GOLDEN_RATIO, 0,  1]], [[1, 0], [0, 1], [2, 1]]);
addTriangle([[0, -1,  GOLDEN_RATIO], [0,  1,  GOLDEN_RATIO], [-GOLDEN_RATIO, 0,  1]], [[2, 1], [3, 0], [1, 0]]);
addTriangle([[0, -1, -GOLDEN_RATIO], [0,  1, -GOLDEN_RATIO], [ GOLDEN_RATIO, 0, -1]], [[3, 0], [2, 1], [4, 1]]);
addTriangle([[0,  1, -GOLDEN_RATIO], [0, -1, -GOLDEN_RATIO], [-GOLDEN_RATIO, 0, -1]], [[4, 1], [5, 0], [3, 0]]);

addTriangle([[ GOLDEN_RATIO, 0,  1], [ GOLDEN_RATIO, 0, -1], [ 1,  GOLDEN_RATIO, 0]], [[5, 0], [4, 1], [6, 1]]);
addTriangle([[ GOLDEN_RATIO, 0, -1], [ GOLDEN_RATIO, 0,  1], [ 1, -GOLDEN_RATIO, 0]], [[6, 1], [7, 0], [5, 0]]);
addTriangle([[-GOLDEN_RATIO, 0, -1], [-GOLDEN_RATIO, 0,  1], [-1,  GOLDEN_RATIO, 0]], [[1, 2], [2, 1], [0, 1]]);
addTriangle([[-GOLDEN_RATIO, 0,  1], [-GOLDEN_RATIO, 0, -1], [-1, -GOLDEN_RATIO, 0]], [[2, 1], [1, 2], [3, 2]]);

addTriangle([[ 1,  GOLDEN_RATIO, 0], [-1,  GOLDEN_RATIO, 0], [0,  1,  GOLDEN_RATIO]], [[3, 2], [4, 1], [2, 1]]);
addTriangle([[-1,  GOLDEN_RATIO, 0], [ 1,  GOLDEN_RATIO, 0], [0,  1, -GOLDEN_RATIO]], [[4, 1], [3, 2], [5, 2]]);
addTriangle([[-1, -GOLDEN_RATIO, 0], [ 1, -GOLDEN_RATIO, 0], [0, -1,  GOLDEN_RATIO]], [[5, 2], [6, 1], [4, 1]]);
addTriangle([[ 1, -GOLDEN_RATIO, 0], [-1, -GOLDEN_RATIO, 0], [0, -1, -GOLDEN_RATIO]], [[6, 1], [5, 2], [7, 2]]);

addTriangle([[ GOLDEN_RATIO, 0,  1], [0, -1,  GOLDEN_RATIO], [ 1, -GOLDEN_RATIO, 0]], [[1, 2], [0, 3], [2, 3]]);
addTriangle([[0,  1, -GOLDEN_RATIO], [-GOLDEN_RATIO, 0, -1], [-1,  GOLDEN_RATIO, 0]], [[2, 3], [3, 2], [1, 2]]);

addTriangle([[0, -1,  GOLDEN_RATIO], [-GOLDEN_RATIO, 0,  1], [-1, -GOLDEN_RATIO, 0]], [[3, 2], [2, 3], [4, 3]]);
addTriangle([[ GOLDEN_RATIO, 0, -1], [0,  1, -GOLDEN_RATIO], [ 1,  GOLDEN_RATIO, 0]], [[4, 3], [5, 2], [3, 2]]);

addTriangle([[0,  1,  GOLDEN_RATIO], [ GOLDEN_RATIO, 0,  1], [ 1,  GOLDEN_RATIO, 0]], [[5, 2], [4, 3], [6, 3]]);
addTriangle([[-GOLDEN_RATIO, 0, -1], [0, -1, -GOLDEN_RATIO], [-1, -GOLDEN_RATIO, 0]], [[6, 3], [7, 2], [5, 2]]);

addTriangle([[0, -1, -GOLDEN_RATIO], [ GOLDEN_RATIO, 0, -1], [ 1, -GOLDEN_RATIO, 0]], [[1, 4], [2, 3], [0, 3]]);
addTriangle([[-GOLDEN_RATIO, 0,  1], [0,  1,  GOLDEN_RATIO], [-1,  GOLDEN_RATIO, 0]], [[2, 3], [1, 4], [3, 4]]);

export default class Icosahedron extends ModelData {
	constructor() {
		super(step);
		this.dirtyIndices = true;
		this.dirtyVertices = true;
	}

	rebuildIndices() {
		this.setIndices(Uint16Array.from(INDICES));
	}

	rebuildVertices() {
		this.setData(Float32Array.from(VERTICES_UVS));
	}

	radius() {
		return 1.5115226282;
	}
};
