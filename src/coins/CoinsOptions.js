import Coins3DRenderer from './Coins3DRenderer.js';
import Options from '../options/Options.js';
import Quaternion from '../math/Quaternion.js';
import {make} from '../dom/Dom.js';

export default class CoinsOptions extends Options {
	constructor() {
		super(new Coins3DRenderer({
			shadow: false,
			maxOversampleResolution: 1.5,
			fov: 0.2,
		}));

		this.rowHeight = this.sampleWidth;

		this.spin = 0;
		this.rotation = Quaternion.fromRotation({x: 1, y: 0, z: 0, angle: Math.PI * 1.05});
	}

	animate(deltaTm) {
		this.spin += deltaTm;
		this.frameRotation = Quaternion
			.fromRotation({x: 0, y: 1, z: 0, angle: this.spin})
			.mult(this.rotation);
	}

	clear() {
		this.renderer.render([], {clear: true});
	}

	renderSample(style, rect) {
		const position = {x: 0, y: 0, z: -5.5};
		this.renderer.render([{position, rotation: this.frameRotation, style}], {
			viewport: [rect.x, rect.y, rect.width, rect.height],
			clear: false,
			raisedCam: false,
		});
	}
};
