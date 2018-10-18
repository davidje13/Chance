import ModelData from './ModelData.js';

const SIZEOF_FLOAT = 4;

const step = 3;

export default class Box extends ModelData {
	constructor({width = 1.0, height = 1.0, depth = 1.0}) {
		super(step * SIZEOF_FLOAT);
		this.size = {x: width, y: height, z: depth};

		this.dirtyIndices = true;
		this.dirtyVertices = true;
	}

	writeQuad(target, a, b, c, d) {
		target[0] = a;
		target[1] = b;
		target[2] = d;
		target[3] = d;
		target[4] = c;
		target[5] = a;
		return 6;
	}

	rebuildIndices() {
		const indices = new Uint16Array(6 * 6);

		let p = 0;
		p += this.writeQuad(indices.subarray(p), 1, 0, 3, 2);
		p += this.writeQuad(indices.subarray(p), 0, 1, 4, 5);
		p += this.writeQuad(indices.subarray(p), 1, 3, 5, 7);
		p += this.writeQuad(indices.subarray(p), 3, 2, 7, 6);
		p += this.writeQuad(indices.subarray(p), 2, 0, 6, 4);
		p += this.writeQuad(indices.subarray(p), 4, 5, 6, 7);

		this.setIndices(indices);
	}

	writeVertex(target, x, y, z) {
		target[0] = (x - 0.5) * this.size.x;
		target[1] = (y - 0.5) * this.size.y;
		target[2] = (z - 0.5) * this.size.z;
		return step;
	}

	rebuildVertices() {
		const vertices = new Float32Array(8 * step);

		let p = 0;
		p += this.writeVertex(vertices.subarray(p), 0, 0, 0);
		p += this.writeVertex(vertices.subarray(p), 1, 0, 0);
		p += this.writeVertex(vertices.subarray(p), 0, 1, 0);
		p += this.writeVertex(vertices.subarray(p), 1, 1, 0);
		p += this.writeVertex(vertices.subarray(p), 0, 0, 1);
		p += this.writeVertex(vertices.subarray(p), 1, 0, 1);
		p += this.writeVertex(vertices.subarray(p), 0, 1, 1);
		p += this.writeVertex(vertices.subarray(p), 1, 1, 1);

		this.setData(vertices);
	}

	boundVertices() {
		return this.boundData(this.gl.FLOAT, 0 * SIZEOF_FLOAT, 3);
	}
};
