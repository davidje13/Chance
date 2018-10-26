import {make} from '../dom/Dom.js';

export default class Numbers {
	constructor(randomSource) {
		this.inner = make('div', 'numbers');
	}

	title() {
		return 'Numbers';
	}

	info() {
		return (
			'Tap or shake to generate\n' +
			'another random number'
		);
	}

	start() {
	}

	step(deltaTm, absTm) {
	}

	trigger(type) {
	}

	stop() {
	}

	resize(width, height) {
	}

	dom() {
		return this.inner;
	}
};
