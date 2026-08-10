export default class Momentum {
	constructor(windowMillis) {
		this.windowMillis = windowMillis;
		this.refHistoric = 0;
		this.pos = 0;
		this.shift = 0;
		this.samples = 0;
	}

	reset() {
		this.refHistoric = 0;
		this.pos = 0;
		this.shift = 0;
		this.samples = 0;
	}

	accumulate(pos) {
		pos -= this.shift;
		if (this.samples === 0) {
			this.refHistoric = pos;
		} else if (pos !== this.pos) {
			setTimeout(() => (this.refHistoric = pos), this.windowMillis);
		}
		this.pos = pos;
		++ this.samples;
	}

	shiftPosition(delta) {
		this.shift += delta;
	}

	momentum() {
		if (this.samples < 2) {
			return 0;
		}
		return (this.pos - this.refHistoric) * 1000 / this.windowMillis;
	}
};
