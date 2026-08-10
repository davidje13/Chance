import ModelData from './ModelData.js';

const SIZEOF_FLOAT = 4;

const step = 8;

export default class Face extends ModelData {
	constructor({
		size = {width: 1.0, height: 1.0},
		uv = {left: 0, right: 1, top: 0, bottom: 1},
		twoSided = true,
	} = {}) {
		super(step * SIZEOF_FLOAT);
		this.size = size;
		this.uv = uv;
		this.twoSided = twoSided;

		this.dirtyIndices = true;
		this.dirtyVertices = true;
	}

	rebuildIndices() {
		const indices = new Uint16Array(this.twoSided ? 12 : 6);

		indices[0] = 0;
		indices[1] = 1;
		indices[2] = 3;
		indices[3] = 3;
		indices[4] = 2;
		indices[5] = 0;

		if (this.twoSided) {
			indices[ 6] = 4;
			indices[ 7] = 5;
			indices[ 8] = 7;
			indices[ 9] = 7;
			indices[10] = 6;
			indices[11] = 4;
		}

		this.setIndices(indices);
	}

	writeVertex(target, x, y, front) {
		target[0] = (front ? (x - 0.5) : (0.5 - x)) * this.size.width;
		target[1] = (y - 0.5) * this.size.height;
		target[2] = 0;
		target[3] = 0;
		target[4] = 0;
		target[5] = front ? 1 : -1;
		target[6] = this.uv.left + x * (this.uv.right - this.uv.left);
		target[7] = this.uv.top + y * (this.uv.bottom - this.uv.top);
		return step;
	}

	rebuildVertices() {
		const vertices = new Float32Array((this.twoSided ? 8 : 4) * step);

		let p = 0;
		p += this.writeVertex(vertices.subarray(p), 0, 0, true);
		p += this.writeVertex(vertices.subarray(p), 1, 0, true);
		p += this.writeVertex(vertices.subarray(p), 0, 1, true);
		p += this.writeVertex(vertices.subarray(p), 1, 1, true);
		if (this.twoSided) {
			p += this.writeVertex(vertices.subarray(p), 0, 0, false);
			p += this.writeVertex(vertices.subarray(p), 1, 0, false);
			p += this.writeVertex(vertices.subarray(p), 0, 1, false);
			p += this.writeVertex(vertices.subarray(p), 1, 1, false);
		}

		this.setData(vertices);
	}

	boundVertices() {
		return this.boundData(this.gl.FLOAT, 0 * SIZEOF_FLOAT, 3);
	}

	boundNormals() {
		return this.boundData(this.gl.FLOAT, 3 * SIZEOF_FLOAT, 3);
	}

	boundUvs() {
		return this.boundData(this.gl.FLOAT, 6 * SIZEOF_FLOAT, 2);
	}
};
