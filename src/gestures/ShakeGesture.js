import Queue from './Queue.js';

function parseAcceleration(e) {
	const tm = Date.now();
	const g = e.accelerationIncludingGravity;
	return {x: g.x, y: g.y, z: g.z, tm};
}

export default class ShakeGesture {
	constructor(callbackFn) {
		this.smoothingIntervalMillis = 200;
		this.fluctuatonsIntervalMillis = 500;
		this.thresholdImpulse = 0.01;
		this.thresholdAlternations = 5;
		this.callbackFn = callbackFn;

		this.recentGs = new Queue();
		this.recentIs = new Queue();
		this._devicemotion = this._devicemotion.bind(this);
	}

	reset() {
		this.recentGs.clear();
		this.recentIs.clear();
	}

	start() {
		this.reset();
		window.addEventListener('devicemotion', this._devicemotion);
	}

	stop() {
		window.removeEventListener('devicemotion', this._devicemotion);
	}

	_historicGravity(tm) {
		while (this.recentGs.length >= 2 && this.recentGs.peek(1).tm <= tm) {
			this.recentGs.pop_tail();
		}
		return (this.recentGs.length > 1) ? this.recentGs.peek_tail() : null;
	}

	_countAlternations(tm) {
		while (this.recentIs.length > 0 && this.recentIs.peek_tail().tm < tm) {
			this.recentIs.pop_tail();
		}

		let lastdir = 0;
		let alts = 0;
		for (let i = 0; i < this.recentIs.length; ++ i) {
			const dir = this.recentIs.peek(i).coded;
			if (dir !== 0 && dir !== lastdir) {
				++ alts;
				lastdir = dir;
			}
		}
		return alts;
	}

	_devicemotion(e) {
		const g = parseAcceleration(e);
		this.recentGs.push_head(g);

		const delta = this.smoothingIntervalMillis;
		const oldG = this._historicGravity(g.tm - delta);
		if (oldG === null) {
			return;
		}

		const impulseZ = (g.z - oldG.z) / delta;
		let coded = 0;
		if (impulseZ > this.thresholdImpulse) {
			coded = 1;
		} else if (impulseZ < -this.thresholdImpulse) {
			coded = -1;
		}
		this.recentIs.push_head({coded, tm: g.tm});

		const alts = this._countAlternations(g.tm - this.fluctuatonsIntervalMillis);

		if (alts >= this.thresholdAlternations) {
			this.reset();
			this.callbackFn();
		}
	}
};
