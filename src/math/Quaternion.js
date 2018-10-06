const ZERO_TOL = 0.0005;

export default class Quaternion {
	constructor() {
		this.data = new Float32Array(4);
	}

	set(values) {
		for(let i = 0; i < 4; ++ i) {
			this.data[i] = values[i];
		}
		return this;
	}

	add(m) {
		for(let i = 0; i < 4; ++ i) {
			this.data[i] += m.data[i];
		}
		return this;
	}

	sub(m) {
		for(let i = 0; i < 4; ++ i) {
			this.data[i] -= m.data[i];
		}
		return this;
	}

	multScalar(s) {
		for(let i = 0; i < 4; ++ i) {
			this.data[i] *= s;
		}
		return this;
	}

	lengthSquared() {
		let v = 0;
		for(let i = 0; i < 4; ++ i) {
			v += this.data[i] * this.data[i];
		}
		return v;
	}

	length() {
		return Math.sqrt(this.lengthSquared());
	}

	normalise() {
		return this.multScalar(1 / this.length());
	}

	// Note: conjugate = reciprocal for normalised quaternions, and is faster
	conjugate() {
		this.data[1] *= -1;
		this.data[2] *= -1;
		this.data[3] *= -1;
		return this;
	}

	reciprocal() {
		this.multScalar(1 / this.lengthSquared());
		return this.conjugate();
	}

	mult(b) {
		const A = this.data;
		const B = b.data;
		return Quaternion.of([
			A[0] * B[3] + A[1] * B[2] - A[2] * B[1] + A[3] * B[0],
			A[1] * B[3] - A[0] * B[2] + A[3] * B[1] + A[2] * B[0],
			A[2] * B[3] + A[3] * B[2] + A[0] * B[1] - A[1] * B[0],
			A[3] * B[3] - A[2] * B[2] - A[1] * B[1] - A[0] * B[0],
		]);
	}

	asRotation() {
		const s = 1 / Math.sqrt(1 - this.data[3] * this.data[3]);
		if (Math.abs(s) > 1 / ZERO_TOL) {
			s = 1;
		}
		return {
			x: this.data[0] * s,
			y: this.data[1] * s,
			z: this.data[2] * s,
			angle: Math.acos(this.data[3]) * 2,
		};
	}

	asAngularVelocity() {
		const w = this.data[3];
		if (w >= 1) {
			return {x: 0, y: 0, z: 0};
		}
		const s = Math.acos(w) * 2 / Math.sqrt(1 - w * w);
		return {
			x: this.data[0] * s,
			y: this.data[1] * s,
			z: this.data[2] * s,
		};
	}

	static of(values) {
		return new Quaternion().set(values);
	}

	static identity() {
		return Quaternion.of([0, 0, 0, 1]);
	}

	static random(randomSource) {
		// Thanks, http://planning.cs.uiuc.edu/node198.html
		const u1 = randomSource.nextFloat();
		const u2 = randomSource.nextFloat() * Math.PI * 2;
		const u3 = randomSource.nextFloat() * Math.PI * 2;
		const sqrtIU1 = Math.sqrt(1 - u1);
		const sqrtU1 = Math.sqrt(u1);
		return Quaternion.of([
			sqrtIU1 * Math.sin(u2),
			sqrtIU1 * Math.cos(u2),
			sqrtU1 * Math.sin(u3),
			sqrtU1 * Math.cos(u3),
		]);
	}

	static fromRotation({x, y, z, angle}) {
		const len = Math.sqrt(x * x + y * y + z * z);
		if (!len) {
			return Quaternion.identity();
		}
		const w = Math.cos(angle * 0.5);
		const m = Math.sin(angle * 0.5) / len;
		return Quaternion.of([x * m, y * m, z * m, w]);
	}

	static fromAngularVelocity({x, y, z}) {
		const angle = Math.sqrt(x * x + y * y + z * z);
		if (!angle) {
			return Quaternion.identity();
		}
		const w = Math.cos(angle * 0.5);
		const m = Math.sin(angle * 0.5) / angle;
		return Quaternion.of([x * m, y * m, z * m, w]);
	}
};
