export default class Coins {
	constructor() {
		this.inner = document.createElement('div');
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