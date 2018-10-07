export default class GravityAssist {
	constructor(zero, maxRange) {
		this.maxRange = maxRange;
		this.power = Math.log(this.normalise(zero)) / Math.log(0.5);
	}

	normalise(g) {
		return g / (this.maxRange * 2) + 0.5;
	}

	denormalise(g) {
		return (g - 0.5) * this.maxRange * 2;
	}

	apply(g) {
		const gn = Math.max(0, Math.min(1, this.normalise(g)));
		return this.denormalise(Math.pow(gn, this.power));
	}
};
