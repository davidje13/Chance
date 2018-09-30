export default class Answers {
	constructor() {
		this.inner = document.createElement('div');
	}

	title() {
		return 'Answers Ball';
	}

	info() {
		return (
			'Hold face-down and shake while\n' +
			'asking or thinking of a question'
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
