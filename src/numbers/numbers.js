export default class Numbers {
	constructor() {
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
