export class M4 {
	constructor() {
		this.data = new Float32Array(16); // col major
	}

	setCM(values) {
		for(let i = 0; i < 16; ++ i) {
			this.data[i] = values[i];
		}
		return this;
	}

	setRM(values) {
		for(let i = 0; i < 4; ++ i) {
			for(let j = 0; j < 4; ++ j) {
				this.data[i * 4 + j] = values[j * 4 + i];
			}
		}
		return this;
	}

	as3() {
		return [
			this.data[ 0], this.data[ 1], this.data[ 2],
			this.data[ 4], this.data[ 5], this.data[ 6],
			this.data[ 8], this.data[ 9], this.data[10],
		];
	}

	sub(m) {
		for(let i = 0; i < 16; ++ i) {
			this.data[i] -= m.data[i];
		}
		return this;
	}

	multScalar(s) {
		for(let i = 0; i < 16; ++ i) {
			this.data[i] *= s;
		}
		return this;
	}

	translate(x, y, z) {
		this.data[12] += x;
		this.data[13] += y;
		this.data[14] += z;
		return this;
	}

	noTranslate() {
		this.data[12] = 0;
		this.data[13] = 0;
		this.data[14] = 0;
		return this;
	}

	mult(b) {
		const result = new M4();
		for(let i = 0; i < 4; ++ i) {
			for(let j = 0; j < 4; ++ j) {
				let v = 0;
				for(let k = 0; k < 4; ++ k) {
					v += this.data[i * 4 + k] * b.data[k * 4 + j];
				}
				result.data[i * 4 + j] = v;
			}
		}
		return result;
	}

	apply(v) {
		const d = this.data;
		const x = v[0];
		const y = v[1];
		const z = v[2];
		const w = v.length >= 4 ? v[3] : 1;
		return [
			x * d[0] + y * d[4] + z * d[8] + w * d[12],
			x * d[1] + y * d[5] + z * d[9] + w * d[13],
			x * d[2] + y * d[6] + z * d[10] + w * d[14],
			x * d[3] + y * d[7] + z * d[11] + w * d[15],
		];
	}

	transpose() {
		for(let i = 0; i < 3; ++ i) {
			for(let j = i + 1; j < 4; ++ j) {
				const t = this.data[i * 4 + j];
				this.data[i * 4 + j] = this.data[j * 4 + i];
				this.data[j * 4 + i] = t;
			}
		}
		return this;
	}

	det() {
		const d = this.data;
		/* jshint -W014 */ // tabular form is easier to work with
		return (
			+ d[ 0]*d[ 5]*d[10]*d[15] + d[ 0]*d[ 9]*d[14]*d[ 7] + d[ 0]*d[13]*d[ 6]*d[11]
			+ d[ 4]*d[ 1]*d[14]*d[11] + d[ 4]*d[ 9]*d[ 2]*d[15] + d[ 4]*d[13]*d[10]*d[ 3]
			+ d[ 8]*d[ 1]*d[ 6]*d[15] + d[ 8]*d[ 5]*d[14]*d[ 3] + d[ 8]*d[13]*d[ 2]*d[ 7]
			+ d[12]*d[ 1]*d[10]*d[ 7] + d[12]*d[ 5]*d[ 2]*d[11] + d[12]*d[ 9]*d[ 6]*d[ 3]
			- d[ 0]*d[ 5]*d[14]*d[11] - d[ 0]*d[ 9]*d[ 6]*d[15] - d[ 0]*d[13]*d[10]*d[ 7]
			- d[ 4]*d[ 1]*d[10]*d[15] - d[ 4]*d[ 9]*d[14]*d[ 3] - d[ 4]*d[13]*d[ 2]*d[11]
			- d[ 8]*d[ 1]*d[14]*d[ 7] - d[ 8]*d[ 5]*d[ 2]*d[15] - d[ 8]*d[13]*d[ 6]*d[ 3]
			- d[12]*d[ 1]*d[ 6]*d[11] - d[12]*d[ 5]*d[10]*d[ 3] - d[12]*d[ 9]*d[ 2]*d[ 7]
		);
	}

	invert() {
		// Thanks, http://www.cg.info.hiroshima-cu.ac.jp/~miyazaki/knowledge/teche23.html
		const d = this.data;
		const det = this.det();
		/* jshint -W014 */ // tabular form is easier to work with
		return M4.of([
			+ d[ 5]*d[10]*d[15] + d[ 9]*d[14]*d[ 7] + d[13]*d[ 6]*d[11]
			- d[ 5]*d[14]*d[11] - d[ 9]*d[ 6]*d[15] - d[13]*d[10]*d[ 7],
			+ d[ 4]*d[14]*d[11] + d[ 8]*d[ 6]*d[15] + d[12]*d[10]*d[ 7]
			- d[ 4]*d[10]*d[15] - d[ 8]*d[14]*d[ 7] - d[12]*d[ 6]*d[11],
			+ d[ 4]*d[ 9]*d[15] + d[ 8]*d[13]*d[ 7] + d[12]*d[ 5]*d[11]
			- d[ 4]*d[13]*d[11] - d[ 8]*d[ 5]*d[15] - d[12]*d[ 9]*d[ 7],
			+ d[ 4]*d[13]*d[10] + d[ 8]*d[ 5]*d[14] + d[12]*d[ 9]*d[ 6]
			- d[ 4]*d[ 9]*d[14] - d[ 8]*d[13]*d[ 6] - d[12]*d[ 5]*d[10],

			+ d[ 1]*d[14]*d[11] + d[ 9]*d[ 2]*d[15] + d[13]*d[10]*d[ 3]
			- d[ 1]*d[10]*d[15] - d[ 9]*d[14]*d[ 3] - d[13]*d[ 2]*d[11],
			+ d[ 0]*d[10]*d[15] + d[ 8]*d[14]*d[ 3] + d[12]*d[ 2]*d[11]
			- d[ 0]*d[14]*d[11] - d[ 8]*d[ 2]*d[15] - d[12]*d[10]*d[ 3],
			+ d[ 0]*d[13]*d[11] + d[ 8]*d[ 1]*d[15] + d[12]*d[ 9]*d[ 3]
			- d[ 0]*d[ 9]*d[15] - d[ 8]*d[13]*d[ 3] - d[12]*d[ 1]*d[11],
			+ d[ 0]*d[ 9]*d[14] + d[ 8]*d[13]*d[ 2] + d[12]*d[ 1]*d[10]
			- d[ 0]*d[13]*d[10] - d[ 8]*d[ 1]*d[14] - d[12]*d[ 9]*d[ 2],

			+ d[ 1]*d[ 6]*d[15] + d[ 5]*d[14]*d[ 3] + d[13]*d[ 2]*d[ 7]
			- d[ 1]*d[14]*d[ 7] - d[ 5]*d[ 2]*d[15] - d[13]*d[ 6]*d[ 3],
			+ d[ 0]*d[14]*d[ 7] + d[ 4]*d[ 2]*d[15] + d[12]*d[ 6]*d[ 3]
			- d[ 0]*d[ 6]*d[15] - d[ 4]*d[14]*d[ 3] - d[12]*d[ 2]*d[ 7],
			+ d[ 0]*d[ 5]*d[15] + d[ 4]*d[13]*d[ 3] + d[12]*d[ 1]*d[ 7]
			- d[ 0]*d[13]*d[ 7] - d[ 4]*d[ 1]*d[15] - d[ 8]*d[ 5]*d[ 3],
			+ d[ 0]*d[13]*d[ 6] + d[ 4]*d[ 1]*d[14] + d[12]*d[ 5]*d[ 2]
			- d[ 0]*d[ 5]*d[14] - d[ 4]*d[13]*d[ 2] - d[12]*d[ 1]*d[ 6],

			+ d[ 1]*d[10]*d[ 7] + d[ 5]*d[ 2]*d[11] + d[ 9]*d[ 6]*d[ 3]
			- d[ 1]*d[ 6]*d[11] - d[ 5]*d[10]*d[ 3] - d[ 9]*d[ 2]*d[ 7],
			+ d[ 0]*d[ 6]*d[11] + d[ 4]*d[10]*d[ 3] + d[ 8]*d[ 2]*d[ 7]
			- d[ 0]*d[10]*d[ 7] - d[ 4]*d[ 2]*d[11] - d[ 8]*d[ 6]*d[ 3],
			+ d[ 0]*d[ 9]*d[ 7] + d[ 4]*d[ 1]*d[11] + d[ 8]*d[ 5]*d[ 3]
			- d[ 0]*d[ 5]*d[11] - d[ 4]*d[ 9]*d[ 3] - d[ 8]*d[ 1]*d[ 7],
			+ d[ 0]*d[ 5]*d[10] + d[ 4]*d[ 9]*d[ 2] + d[ 8]*d[ 1]*d[ 6]
			- d[ 0]*d[ 9]*d[ 6] - d[ 4]*d[ 1]*d[10] - d[ 8]*d[ 5]*d[ 2],
		]).multScalar(1 / det);
	}

	static of(data) {
		return new M4().setRM(data);
	}

	static identity() {
		return M4.of([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1,
		]);
	}

	static look(from, to, up) {
		const dz = to.sub(from).norm();
		const dx = up.cross(dz).norm();
		const dy = dz.cross(dx).norm();
		return (
			M4.identity()
			.translate(from.x, from.y, from.z)
			.mult(M4.of([
				dx.x, dx.y, dx.z, 0,
				dy.x, dy.y, dy.z, 0,
				dz.x, dz.y, dz.z, 0,
				0, 0, 0, 1,
			]))
		);
	}

	static lookObj(from, to, up) {
		const dz = to.sub(from).norm();
		const dx = up.cross(dz).norm();
		const dy = dz.cross(dx).norm();
		return M4.of([
			dx.x, dy.x, dz.x, from.x,
			dx.y, dy.y, dz.y, from.y,
			dx.z, dy.z, dz.z, from.z,
			0, 0, 0, 1,
		]);
	}

	static perspective(fovy, aspect, znear, zfar) {
		const scale = Math.tan(fovy);
		const x = 1 / (scale * aspect);
		const y = 1 / scale;
		const c = (zfar + znear) / (znear - zfar);
		const d = 2 * zfar * znear / (znear - zfar);
		return M4.of([
			x, 0, 0, 0,
			0, y, 0, 0,
			0, 0, c, d,
			0, 0, -1, 0,
		]);
	}

	static fromQuaternion(q) {
		const x = q.data[0];
		const y = q.data[1];
		const z = q.data[2];
		const w = q.data[3];

		return M4.of([
			1 - 2 * (y * y + z * z),
			2 * (x * y - z * w),
			2 * (x * z + y * w),
			0,
			2 * (x * y + z * w),
			1 - 2 * (x * x + z * z),
			2 * (y * z - x * w),
			0,
			2 * (x * z - y * w),
			2 * (y * z + x * w),
			1 - 2 * (x * x + y * y),
			0,
			0,
			0,
			0,
			1,
		]);
	}
};
