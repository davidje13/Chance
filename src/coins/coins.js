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

	start() {
	}

	stop() {
	}

	dom() {
		return this.inner;
	}
};
