export default class Numbers {
	constructor(randomSource) {
		this.inner = document.createElement('div');
	}

	title() {
		return 'Numbers';
	}

	info() {
		return (
			'Tap or shake to generate\nanother random number'
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
