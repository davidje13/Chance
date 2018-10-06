import ModelData from './ModelData.js';

const step = 4;
const POSITIONS = [
	0, 0,
	1, 0,
	0, 1,
	1, 1,
];
const INDICES = Uint16Array.from([2, 1, 0, 1, 2, 3]);

export default class ScreenQuad extends ModelData {
	constructor({
		pos = {left: -1, right: 1, top: 1, bottom: -1},
		uv = {left: 0, right: 1, top: 0, bottom: 1},
	} = {}) {
		super(step);
		this.dirtyIndices = true;
		this.dirtyVertices = true;
		this.pos = pos;
		this.uv = uv;
	}

	rebuildIndices() {
		this.setIndices(INDICES);
	}

	rebuildVertices() {
		const x0 = this.pos.left;
		const y0 = this.pos.top;
		const x1 = this.pos.right;
		const y1 = this.pos.bottom;
		const u0 = this.uv.left;
		const v0 = this.uv.top;
		const u1 = this.uv.right;
		const v1 = this.uv.bottom;

		const vs = new Float32Array(16);
		for (let i = 0; i < 4; ++ i) {
			vs[i * 4 + 0] = POSITIONS[i * 2 + 0] * (x1 - x0) + x0;
			vs[i * 4 + 1] = POSITIONS[i * 2 + 1] * (y1 - y0) + y0;
			vs[i * 4 + 2] = POSITIONS[i * 2 + 0] * (u1 - u0) + u0;
			vs[i * 4 + 3] = POSITIONS[i * 2 + 1] * (v1 - v0) + v0;
		}
		this.setData(vs);
	}
};
