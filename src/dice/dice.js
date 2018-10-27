import Dice3DRenderer from './Dice3DRenderer.js';
import DiceSimulator from './DiceSimulator.js';
import Quaternion from '../math/Quaternion.js';
import {make, addFastClickListener, setDisabled} from '../dom/Dom.js';

const MAX_DICE = 20;

export default class Dice {
	constructor(randomSource) {
		this.inner = make('div', 'dice');

		this.randomSource = randomSource;
		this.renderer = new Dice3DRenderer();
		this.simulator = new DiceSimulator();

		this.btnSub = make('button', 'optbtn left', '\u2013');
		addFastClickListener(this.btnSub, this.subDie.bind(this));

		this.btnAdd = make('button', 'optbtn right', '+');
		addFastClickListener(this.btnAdd, this.addDie.bind(this));

		this.inner.appendChild(this.renderer.dom());
		this.inner.appendChild(this.btnSub);
		this.inner.appendChild(this.btnAdd);

		this.region = {width: 0, height: 0, depth: 10};

		this.diceCount = 5;

		addFastClickListener(this.inner, () => this.trigger('click'));
		this.forceRender = false;

		this.updateButtons();
	}

	title() {
		return 'Dice';
	}

	info() {
		return (
			'Tap or shake to roll the dice'
		);
	}

	addDie() {
		if (this.diceCount >= MAX_DICE) {
			return;
		}

		++ this.diceCount;
		this.flickDice();

		this.updateButtons();
	}

	subDie() {
		if (this.diceCount <= 1) {
			return;
		}

		-- this.diceCount;
		this.flickDice();

		this.updateButtons();
	}

	updateButtons() {
		setDisabled(this.btnAdd, this.diceCount >= MAX_DICE);
		setDisabled(this.btnSub, this.diceCount <= 1);
	}

	step(deltaTm) {
		if (this.simulator.step(deltaTm) || this.forceRender) {
			this.renderer.render(this.simulator.getDice());
			this.forceRender = false;
		}
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
				style: {shape: shapes[x], material: materials[y], dots: dots[z]},
			});
		}

		this.region.depth = Math.max(10, Math.min(50,
			4 * Math.sqrt(quantity) + 2
		));
		this.updateRegion();
	}

	flickDice() {
		this.simulator.fireOffscreen()
			.then(() => {
				if (this.simulator.getDice().length != this.diceCount) {
					this.rebuildDice(this.diceCount);
				}
			})
			.then(() => this.simulator.randomise(this.randomSource));
	}

	trigger(type) {
		this.flickDice();
	}

	start() {
		this.rebuildDice(this.diceCount);
		this.simulator.randomise(this.randomSource);
		this.forceRender = true;
	}

	stop() {
	}

	updateRegion() {
		const z = 2 - this.region.depth;
		this.region.width = this.renderer.widthAtZ(z, {insetPixels: 10});
		this.region.height = this.renderer.heightAtZ(z, {insetPixels: 140});
		this.simulator.setRegion(this.region);
		this.renderer.setFloorDepth(this.region.depth);
		this.forceRender = true;
	}

	resize(width, height) {
		this.renderer.resize(width, height);
		this.updateRegion();
	}

	dom() {
		return this.inner;
	}
};
