import ModelData from '../3d/ModelData.js';

const SIZEOF_FLOAT = 4;

const step = 6;

export default class Cube extends ModelData {
	constructor({rounding = 0, segmentation = 4} = {}) {
		super(step * SIZEOF_FLOAT);
		this.r = rounding;
		this.s = ((rounding === 0) ? 0 : segmentation) + 2;

		this.vertsPerCorner = this.s * (this.s + 1) / 2;
		this.facesPerCorner = (this.s - 1) * (this.s - 1);
		this.facesPerEdge = (this.s - 1) * 2;
		this.facesPerFace = 2;

		this.dirtyIndices = true;
		this.dirtyVertices = true;
	}

	getVertexIndex(i, axis) {
		switch(axis) {
		case 0: // x
			const v = this.s - i;
			return v * (v + 1) / 2 - 1;
		case 1: // y
			return i * (i + 1) / 2;
		case 2: // z
			return this.vertsPerCorner - this.s + i;
		}
	}

	writeTri(target, rev, a, b, c) {
		target[0] = a;
		target[1] = rev ? c : b;
		target[2] = rev ? b : c;
		return 3;
	}

	writeQuad(target, a, b, c, d) {
		let p = 0;
		p += this.writeTri(target.subarray(p), false, a, b, d);
		p += this.writeTri(target.subarray(p), false, d, c, a);
		return p;
	}

	writeCornerTris(target, n, rev) {
		const i0 = n * this.vertsPerCorner;

		let p = 0;
		for (let y = 0; y < this.s - 1; ++ y) {
			const y0 = i0 + y * (y + 1) / 2;
			for (let x = 0; x <= y; ++ x) {
				p += this.writeTri(target.subarray(p), rev,
					y0 + x,
					y0 + x + y + 1,
					y0 + x + y + 2
				);
				if (x < y) {
					p += this.writeTri(target.subarray(p), rev,
						y0 + x + 1,
						y0 + x,
						y0 + x + y + 2
					);
				}
			}
		}
		return p;
	}

	writeEdgeTris(target, n1, n2, axis) {
		const i1 = n1 * this.vertsPerCorner;
		const i2 = n2 * this.vertsPerCorner;

		let p = 0;
		for (let i = 0; i < this.s - 1; ++ i) {
			const p1 = this.getVertexIndex(i, axis);
			const p2 = this.getVertexIndex(i + 1, axis);
			p += this.writeQuad(target.subarray(p),
				i1 + p1,
				i2 + p1,
				i1 + p2,
				i2 + p2
			);
		}
		return p;
	}

	writeFaceTris(target, n1, n2, n3, n4, axis) {
		const begin = this.getVertexIndex(0, (axis + 2) % 3);
		return this.writeQuad(target,
			n1 * this.vertsPerCorner + begin,
			n2 * this.vertsPerCorner + begin,
			n3 * this.vertsPerCorner + begin,
			n4 * this.vertsPerCorner + begin
		);
	}

	rebuildIndices() {
		const indices = new Uint16Array(
			(this.r > 0 ? (
				this.facesPerCorner * 8 * 3 +
				this.facesPerEdge * 12 * 3
			) : 0) +
			this.facesPerFace * 6 * 3
		);

		let p = 0;
		if (this.r > 0) {
			p += this.writeCornerTris(indices.subarray(p), 0, true);
			p += this.writeCornerTris(indices.subarray(p), 1, false);
			p += this.writeCornerTris(indices.subarray(p), 2, false);
			p += this.writeCornerTris(indices.subarray(p), 3, true);
			p += this.writeCornerTris(indices.subarray(p), 4, false);
			p += this.writeCornerTris(indices.subarray(p), 5, true);
			p += this.writeCornerTris(indices.subarray(p), 6, true);
			p += this.writeCornerTris(indices.subarray(p), 7, false);
			p += this.writeEdgeTris(indices.subarray(p), 4, 0, 0);
			p += this.writeEdgeTris(indices.subarray(p), 1, 5, 0);
			p += this.writeEdgeTris(indices.subarray(p), 2, 6, 0);
			p += this.writeEdgeTris(indices.subarray(p), 7, 3, 0);
			p += this.writeEdgeTris(indices.subarray(p), 2, 0, 1);
			p += this.writeEdgeTris(indices.subarray(p), 1, 3, 1);
			p += this.writeEdgeTris(indices.subarray(p), 4, 6, 1);
			p += this.writeEdgeTris(indices.subarray(p), 7, 5, 1);
			p += this.writeEdgeTris(indices.subarray(p), 1, 0, 2);
			p += this.writeEdgeTris(indices.subarray(p), 2, 3, 2);
			p += this.writeEdgeTris(indices.subarray(p), 4, 5, 2);
			p += this.writeEdgeTris(indices.subarray(p), 7, 6, 2);
		}
		p += this.writeFaceTris(indices.subarray(p), 0, 1, 2, 3, 0);
		p += this.writeFaceTris(indices.subarray(p), 4, 6, 5, 7, 0);
		p += this.writeFaceTris(indices.subarray(p), 0, 4, 1, 5, 1);
		p += this.writeFaceTris(indices.subarray(p), 2, 3, 6, 7, 1);
		p += this.writeFaceTris(indices.subarray(p), 0, 2, 4, 6, 2);
		p += this.writeFaceTris(indices.subarray(p), 1, 5, 3, 7, 2);

		this.setIndices(indices);
	}

	writeCornerVertices(target, x, y, z) {
		const r = this.r;
		const o = 1 - r;

		let p = 0;
		const m = 1 / (this.s - 1);
		for (let yy = 0; yy < this.s; ++ yy) {
			for (let xx = 0; xx <= yy; ++ xx) {
				const X = (yy - xx) * m;
				const Y = xx * m;
				const Z = 1 - yy * m;
				const n = 1 / Math.sqrt(X * X + Y * Y + Z * Z);

				target[p + 0] = (o + X * n * r) * x;
				target[p + 1] = (o + Y * n * r) * y;
				target[p + 2] = (o + Z * n * r) * z;
				target[p + 3] = X * n * x;
				target[p + 4] = Y * n * y;
				target[p + 5] = Z * n * z;
				p += step;
			}
		}

		return p;
	}

	rebuildVertices() {
		const vertices = new Float32Array(this.vertsPerCorner * 8 * step);

		let p = 0;
		p += this.writeCornerVertices(vertices.subarray(p), -1, -1, -1);
		p += this.writeCornerVertices(vertices.subarray(p), -1, -1,  1);
		p += this.writeCornerVertices(vertices.subarray(p), -1,  1, -1);
		p += this.writeCornerVertices(vertices.subarray(p), -1,  1,  1);
		p += this.writeCornerVertices(vertices.subarray(p),  1, -1, -1);
		p += this.writeCornerVertices(vertices.subarray(p),  1, -1,  1);
		p += this.writeCornerVertices(vertices.subarray(p),  1,  1, -1);
		p += this.writeCornerVertices(vertices.subarray(p),  1,  1,  1);

		this.setData(vertices);
	}

	boundVertices() {
		return this.boundData(this.gl.FLOAT, 0 * SIZEOF_FLOAT, 3);
	}

	boundNormals() {
		return this.boundData(this.gl.FLOAT, 3 * SIZEOF_FLOAT, 3);
	}
};
