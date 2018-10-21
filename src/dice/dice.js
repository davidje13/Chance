import Dice3DRenderer from './Dice3DRenderer.js';
import DiceSimulator from './DiceSimulator.js';
import Quaternion from '../math/Quaternion.js';
import ShakeGesture from '../gestures/ShakeGesture.js';

export default class Dice {
	constructor(randomSource) {
		this.inner = document.createElement('div');
		this.inner.className = 'dice';

		this.randomSource = randomSource;
		this.renderer = new Dice3DRenderer();
		this.simulator = new DiceSimulator();

		this.inner.appendChild(this.renderer.dom());

		this.region = {width: 0, height: 0, depth: 10};

		this.click = this.click.bind(this);
		this.shake = new ShakeGesture(this.click);
	}

	title() {
		return 'Dice';
	}

	info() {
		return (
			'Tap or shake to roll the dice'
		);
	}

	step(deltaTm) {
		this.simulator.step(deltaTm);
		this.renderer.render(this.simulator.getDice());
	}

	rebuildDice(quantity) {
		this.simulator.clearDice();

		const materials = ['wood', 'wood-varnished', 'plastic-white', 'plastic-red'];
		const shapes = ['cube', 'cube-fillet', 'cube-clipped', 'cube-rounded'];
		const dots = ['european', 'asian', 'numeric', 'written'];

		for (let i = 0; i < quantity; ++ i) {
			const x = this.randomSource.nextInt(shapes.length);
			const y = this.randomSource.nextInt(materials.length);
			const z = this.randomSource.nextInt(dots.length);
			this.simulator.addDie({
				style: {shape: shapes[x], material: materials[y], dots: dots[z]}
			});
		}

		this.region.depth = Math.max(10, Math.min(100,
			4 * Math.sqrt(quantity) + 2
		));
		this.updateRegion();
	}

	click() {
		this.simulator.fireOffscreen()
			.then(() => this.simulator.randomise(this.randomSource));
	}

	start() {
		this.rebuildDice(10);
		this.simulator.randomise(this.randomSource);
		this.inner.addEventListener('click', this.click);
		this.shake.start();
	}

	stop() {
		this.inner.removeEventListener('click', this.click);
		this.shake.stop();
	}

	updateRegion() {
		const depth = this.region.depth - 2;
		this.region.width = this.renderer.widthAtZ(depth, {insetPixels: 10});
		this.region.height = this.renderer.heightAtZ(depth, {insetPixels: 140});
		this.simulator.setRegion(this.region);
	}

	resize(width, height) {
		this.renderer.resize(width, height);
		this.updateRegion();
	}

	dom() {
		return this.inner;
	}
};
