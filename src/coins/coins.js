export default class Coins {
	constructor(randomSource) {
		this.inner = document.createElement('div');
		this.inner.className = 'coins';
	}

	title() {
		return 'Coin Toss';
	}

	info() {
		return (
			'Tap or shake to flip the coin'
		);
	}

	step(deltaTm, absTm) {
	}

	start() {
	}

	stop() {
	}

	resize(width, height) {
	}

	dom() {
		return this.inner;
	}
};
