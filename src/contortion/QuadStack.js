import ModelData from '../3d/ModelData.js';

const step = 3;
const POSITIONS = [
	0, 0,
	1, 0,
	0, 1,
	1, 1,
];
const INDICES = [2, 1, 0, 1, 2, 3];

export default class QuadStack extends ModelData {
	constructor(count) {
		super(step);
		this.dirtyIndices = true;
		this.dirtyVertices = true;
		this.count = count;
	}

	rebuildIndices() {
		const n = this.count;
		const l = 4;
		const t = INDICES.length;
		const indices = new Uint16Array(n * t);
		for (let i = 0; i < n; ++ i) {
			for (let j = 0; j < t; ++ j) {
				indices[i * t + j] = INDICES[j] + i * l;
			}
		}
		this.setIndices(indices);
	}

	rebuildVertices() {
		const n = this.count;
		const l = 4;
		const vs = new Float32Array(n * l * step);
		const m = (n > 1) ? (1 / (n - 1)) : 0;
		for (let i = 0; i < n; ++ i) {
			for (let j = 0; j < l; ++ j) {
				const p = (i * l + j) * step;
				vs[p + 0] = POSITIONS[j * 2 + 0];
				vs[p + 1] = POSITIONS[j * 2 + 1];
				vs[p + 2] = i * m;
			}
		}
		this.setData(vs);
	}
};
