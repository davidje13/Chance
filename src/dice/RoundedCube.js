import ModelData from '../3d/ModelData.js';

const step = 6;

const SQRT1_3 = Math.sqrt(1 / 3);

export default class RoundedCube extends ModelData {
	constructor({rounding = 0, segmentation = 4} = {}) {
		super(step);
		this.rounding = rounding;
		this.segmentation = (rounding === 0) ? 0 : segmentation;
		this.dirtyIndices = true;
		this.dirtyVertices = true;
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
		const s = this.segmentation + 2;
		const cornerPathLength = (s - 1) * 3;
		const vertsPerCorner = cornerPathLength + 1;
		const iCorner = n * vertsPerCorner;
		const i1 = iCorner + 1;

		let p = 0;
		for (let i = 0; i < cornerPathLength; ++ i) {
			p += this.writeTri(target.subarray(p), rev,
				iCorner,
				i1 + i,
				i1 + (i + 1) % cornerPathLength
			);
		}
		return p;
	}

	writeEdgeTris(target, n1, n2, axis) {
		const s = this.segmentation + 2;
		const cornerPathLength = (s - 1) * 3;
		const vertsPerCorner = cornerPathLength + 1;
		const i1 = n1 * vertsPerCorner + 1;
		const i2 = n2 * vertsPerCorner + 1;
		const begin = axis * (s - 1);

		let p = 0;
		for (let i = 0; i < s - 1; ++ i) {
			p += this.writeQuad(target.subarray(p),
				i1 + begin + i,
				i2 + begin + i,
				i1 + (begin + i + 1) % cornerPathLength,
				i2 + (begin + i + 1) % cornerPathLength
			);
		}
		return p;
	}

	writeFaceTris(target, n1, n2, n3, n4, axis) {
		const s = this.segmentation + 2;
		const vertsPerCorner = (s - 1) * 3 + 1;
		const begin = ((axis + 2) % 3) * (s - 1);
		return this.writeQuad(target,
			n1 * vertsPerCorner + 1 + begin,
			n2 * vertsPerCorner + 1 + begin,
			n3 * vertsPerCorner + 1 + begin,
			n4 * vertsPerCorner + 1 + begin
		);;
	}

	rebuildIndices() {
		const s = this.segmentation + 2;
		const facesPerCorner = (s - 1) * 3;
		const facesPerEdge = (s - 1) * 2;
		const facesPerFace = 2;
		const indices = new Uint16Array(
			facesPerFace * 6 * 3 +
			facesPerEdge * 12 * 3 +
			facesPerCorner * 8 * 3
		);

		let p = 0;
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
		p += this.writeFaceTris(indices.subarray(p), 0, 1, 2, 3, 0);
		p += this.writeFaceTris(indices.subarray(p), 4, 6, 5, 7, 0);
		p += this.writeFaceTris(indices.subarray(p), 0, 4, 1, 5, 1);
		p += this.writeFaceTris(indices.subarray(p), 2, 3, 6, 7, 1);
		p += this.writeFaceTris(indices.subarray(p), 0, 2, 4, 6, 2);
		p += this.writeFaceTris(indices.subarray(p), 1, 5, 3, 7, 2);

		this.setIndices(indices);
	}

	writeVertex(target, x, y, z, u, v, w) {
		target[0] = x;
		target[1] = y;
		target[2] = z;
		const m = 1 / Math.sqrt(u * u + v * v + w * w);
		target[3] = u * m;
		target[4] = v * m;
		target[5] = w * m;
		return step;
	}

	writeCornerVertices(target, x, y, z) {
		const s = this.segmentation + 2;
		const r = this.rounding;
		const o = 1 - r;

		let p = 0;
		p += this.writeVertex(
			target.subarray(p),
			(1 - r * (1 - SQRT1_3)) * x,
			(1 - r * (1 - SQRT1_3)) * y,
			(1 - r * (1 - SQRT1_3)) * z,
			x, y, z
		);

		for (let i = 0; i < s - 1; ++ i) {
			const a = i * Math.PI * 0.5 / (s - 1);
			const ss = Math.sin(a) * r;
			const cc = Math.cos(a) * r;
			this.writeVertex(
				target.subarray(p),
				x * o,
				y * (o + cc),
				z * (o + ss),
				0, y * cc, z * ss
			);
			this.writeVertex(
				target.subarray(p + (s - 1) * step),
				x * (o + ss),
				y * o,
				z * (o + cc),
				x * ss, 0, z * cc
			);
			this.writeVertex(
				target.subarray(p + (s - 1) * 2 * step),
				x * (o + cc),
				y * (o + ss),
				z * o,
				x * cc, y * ss, 0
			);
			p += step;
		}

		return ((s - 1) * 3 + 1) * step;
	}

	rebuildVertices() {
		const s = this.segmentation + 2;
		const vertsPerCorner = (s - 1) * 3 + 1;
		const vertices = new Float32Array(vertsPerCorner * 8 * step);

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
};
