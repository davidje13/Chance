export default class RandomSource {
	constructor() {
		this.target = new Uint32Array(1);
	}

	nextFloat() {
		window.crypto.getRandomValues(this.target);
		return this.target[0] / 0x100000000;
	}

	nextInt(range) {
		return Math.floor(this.nextFloat() * range);
	}
};
