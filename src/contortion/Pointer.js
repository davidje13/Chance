export default class Pointer {
	constructor(frictionSimulator) {
		this.fs = frictionSimulator;
		this.pos = 0;
		this.vel = 0;

		this.pos0 = 0;
		this.tm0 = 0;
		this.duration = 0;
		this.impulse = 0;
	}

	position() {
		return this.pos;
	}

	velocity() {
		return this.vel;
	}

	shiftPosition(delta) {
		this.pos += delta;
		this.pos0 += delta;
	}

	reset(position) {
		this.pos = this.pos0 = position;
		this.vel = 0;
		this.impulse = 0;
	}

	update(tm) {
		if (this.impulse === 0) {
			return false;
		}
		const deltaTm = tm - this.tm0;
		if (deltaTm >= this.duration) {
			this.reset(this.pos0 + this.fs.finalPosition(this.impulse));
		} else {
			this.pos = this.pos0 + this.fs.position(this.impulse, deltaTm);
			this.vel = this.fs.velocity(this.impulse, deltaTm);
		}
		return true;
	}

	_setImpulse(tm, impulse) {
		this.pos0 = this.pos;
		this.tm0 = tm;
		this.duration = this.fs.duration(impulse);
		this.impulse = this.vel = impulse;
	}

	setImpulse(tm, impulse) {
		this.update(tm);
		this._setImpulse(tm, impulse);
	}

	addImpulse(tm, impulse) {
		this.update(tm);
		this._setImpulse(tm, this.vel + impulse);
	}

	setTarget(tm, position) {
		this.update(tm);
		this._setImpulse(tm, this.fs.requiredImpulse(position - this.pos));
	}
};
