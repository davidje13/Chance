import {make} from '../dom/Dom.js';
import {hasAccelerometerAccess} from '../gestures/ShakeGesture.js';

export default class Numbers {
	constructor(randomSource) {
		this.inner = make('div', 'numbers');
	}

	title() {
		return 'Numbers';
	}

	info() {
		return hasAccelerometerAccess() ? (
			'Tap or shake to generate\n' +
			'another random number'
		) : (
			'Tap to generate\n' +
			'another random number'
		);
	}

	options() {
		return null;
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
