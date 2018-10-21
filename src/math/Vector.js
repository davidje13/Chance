export class V3 {
	constructor(x = 0, y = 0, z = 0) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	length2() {
		return V3.length2(this);
	}

	length() {
		return V3.length(this);
	}

	normalise() {
		const m = 1 / this.length();
		this.x *= m;
		this.y *= m;
		this.z *= m;
		return this;
	}

	static add(v1, v2) {
		return new V3(
			v1.x + v2.x,
			v1.y + v2.y,
			v1.z + v2.z,
		);
	}

	static sub(v1, v2) {
		return new V3(
			v1.x - v2.x,
			v1.y - v2.y,
			v1.z - v2.z,
		);
	}

	static dot(v1, v2) {
		return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
	}

	static length2(v) {
		return v.x * v.x + v.y * v.y + v.z * v.z;
	}

	static length(v) {
		return Math.sqrt(V3.length2(v));
	}

	static dist2(v1, v2) {
		return V3.length2(V3.sub(v1, v2));
	}

	static dist(v1, v2) {
		return V3.length(V3.sub(v1, v2));
	}

	static cross(v1, v2) {
		return new V3(
			v1.y * v2.z - v1.z * v2.y,
			v1.z * v2.x - v1.x * v2.z,
			v1.x * v2.y - v1.y * v2.x,
		);
	}

	static multScalar(v, m) {
		return new V3(
			v.x * m,
			v.y * m,
			v.z * m,
		);
	}

	static normalise(v) {
		return V3.multScalar(v, 1 / V3.length(v));
	}

	static mix(v1, v2, a) {
		return V3.add(V3.multScalar(v1, 1 - a), V3.multScalar(v2, a));
	}
};
