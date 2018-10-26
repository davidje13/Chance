export default class Numbers {
	constructor(randomSource) {
		this.inner = document.createElement('div');
		this.inner.className = 'numbers';
	}

	title() {
		return 'Numbers';
	}

	info() {
		return (
			'Tap or shake to generate\nanother random number'
		);
	}

	step(deltaTm, absTm) {
	}

	shake() {
	}

	reenter() {
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
