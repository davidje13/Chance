export default class FrictionSimulator {
	constructor(multFriction, addFriction) {
		this.A = 1 - multFriction;
		this.B = addFriction / multFriction;
		this.b = addFriction;
		this.recipLnA = 1 / Math.log(this.A);
	}

	velocity(impulse, tm) {
		if (this.A === 1) {
			return impulse - this.b * tm * (impulse > 0 ? 1 : -1);
		}
		const B = this.B * (impulse > 0 ? 1 : -1);
		return (impulse + B) * Math.pow(this.A, tm) - B;
	}

	position(impulse, tm) {
		const B = this.B * (impulse > 0 ? 1 : -1);
		return (impulse + B) * (Math.pow(this.A, tm) - 1) * this.recipLnA - tm * B;
	}

	duration(impulse) {
		if (this.A === 1) {
			return Math.abs(impulse) / this.b;
		}
		const B = this.B * (impulse > 0 ? 1 : -1);
		return Math.log(B / (impulse + B)) * this.recipLnA;
	}

	finalPosition(impulse) {
		const B = this.B * (impulse > 0 ? 1 : -1);
		return -(B * Math.log(B / (impulse + B)) + impulse) * this.recipLnA;
	}

	_requiredImpulse(position) {
		// position function is not reversible, so search:
		let low = 0;
		let high = null;
		let sample = 16;
		for (let r = 0; r < 20; ++ r) {
			const p = this.finalPosition(sample);
			if (p === position) {
				return sample;
			}
			if (p < position) {
				low = sample;
				if (high === null) {
					sample *= 2;
				} else {
					sample = (low + high) / 2;
				}
			} else {
				high = sample;
				sample = (low + high) / 2;
			}
		}
		return sample;
	}

	requiredImpulse(position) {
		if (position === 0) {
			return 0;
		} else if (position < 0) {
			return -this._requiredImpulse(-position);
		} else {
			return this._requiredImpulse(position);
		}
	}
};
