import Dice3DRenderer from './Dice3DRenderer.js';
import Options from '../options/Options.js';
import Quaternion from '../math/Quaternion.js';
import {make} from '../dom/Dom.js';

export default class DiceOptions extends Options {
	constructor(properties) {
		super(properties);

		this.rowHeight = this.sampleWidth;

		const shape = 'cube';
		const dots = 'european';

		let material = 'wood-varnished';

		this.spin = 0;
		this.rotation = Quaternion.fromRotation({x: 1, y: 0, z: 1, angle: Math.atan(Math.sqrt(2))});
	}

	animate(deltaTm) {
		this.spin += deltaTm;
		this.frameRotation = Quaternion
			.fromRotation({x: 0, y: 1, z: 0, angle: this.spin})
			.mult(this.rotation);
	}

	makeRenderer() {
		return new Dice3DRenderer({
			shadow: false,
			maxOversampleResolution: 1.5,
			downsampleTextures: true,
			fov: 0.2,
		});
	}

	clear() {
		this.renderer.render([], {clear: true});
	}

	renderSample(style, rect) {
		const position = {x: 0, y: 0, z: -9};
		this.renderer.render([{position, rotation: this.frameRotation, style}], {
			viewport: [rect.x, rect.y, rect.width, rect.height],
			clear: false,
		});
	}
};
