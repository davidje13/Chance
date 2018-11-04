import Dice3DRenderer from './Dice3DRenderer.js';
import DiceSimulator from './DiceSimulator.js';
import DiceOptions from './DiceOptions.js';
import Quaternion from '../math/Quaternion.js';
import {make, addFastClickListener, setDisabled} from '../dom/Dom.js';

const MAX_DICE = 20;

const OPT_SHAPES = [
	{label: 'Cube', shape: 'cube', def: true},
	{label: 'Cube Filletted', shape: 'cube-fillet', def: true},
	{label: 'Cube Clipped', shape: 'cube-clipped', def: true},
	{label: 'Cube Rounded', shape: 'cube-rounded', def: true},
];

const OPT_MATERIALS = [
	{label: 'Wood', material: 'wood', def: true},
	{label: 'Varnished Wood', material: 'wood-varnished', def: true},
	{label: 'Unpainted Wood', material: 'wood-unpainted', def: false},
	{label: 'Black Metal', material: 'metal-black', def: false},
	{label: 'Gold Metal', material: 'metal-gold', def: false},
	{label: 'Silver Metal', material: 'metal-silver', def: false},
	{label: 'White Plastic', material: 'plastic-white', def: true},
	{label: 'Red Plastic', material: 'plastic-red', def: true},
];

const OPT_DOTS = [
	{label: 'European', dots: 'european', def: true},
	{label: 'Asian', dots: 'asian', def: true},
	{label: 'Numeric', dots: 'numeric', def: true},
	{label: 'Written', dots: 'written', def: true},
];

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
		this.forceRender = false;

		this.opts = new DiceOptions();

		this.opts.addHeading('Shapes');
		for (const opt of OPT_SHAPES) {
			this.opts.addRow({
				label: opt.label,
				sampleData: {shape: opt.shape, material: 'wood-varnished', dots: 'european'},
				property: 'shape-' + opt.shape,
				type: 'checkbox',
				def: opt.def,
			});
		}

		this.opts.addHeading('Materials');
		for (const opt of OPT_MATERIALS) {
			this.opts.addRow({
				label: opt.label,
				sampleData: {shape: 'cube', material: opt.material, dots: 'european'},
				property: 'material-' + opt.material,
				type: 'checkbox',
				def: opt.def,
			});
		}

		this.opts.addHeading('Faces');
		for (const opt of OPT_DOTS) {
			this.opts.addRow({
				label: opt.label,
				sampleData: {shape: 'cube', material: 'plastic-white', dots: opt.dots},
				property: 'dots-' + opt.dots,
				type: 'checkbox',
				def: opt.def,
			});
		}

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

	options() {
		return this.opts;
	}

	addDie() {
		if (this.diceCount >= MAX_DICE) {
			return;
		}

		++ this.diceCount;
		this.trigger('options-change');

		this.updateButtons();
	}

	subDie() {
		if (this.diceCount <= 1) {
			return;
		}

		-- this.diceCount;
		this.trigger('options-change');

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

		const props = this.opts.getProperties();
		const materials = OPT_MATERIALS
			.filter((o) => props.get('material-' + o.material))
			.map((o) => o.material);
		const shapes = OPT_SHAPES
			.filter((o) => props.get('shape-' + o.shape))
			.map((o) => o.shape);
		const dots = OPT_DOTS
			.filter((o) => props.get('dots-' + o.dots))
			.map((o) => o.dots);

		if (materials.length === 0) {
			materials.push('void');
		}
		if (shapes.length === 0) {
			shapes.push('void');
		}
		if (dots.length === 0) {
			dots.push('void');
		}

		for (let i = 0; i < quantity; ++ i) {
			this.simulator.addDie({
				style: {
					shape: shapes[this.randomSource.nextInt(shapes.length)],
					material: materials[this.randomSource.nextInt(materials.length)],
					dots: dots[this.randomSource.nextInt(dots.length)],
				},
			});
		}

		this.region.depth = Math.max(10, Math.min(50,
			4 * Math.sqrt(quantity) + 2
		));
		this.updateRegion();
	}

	trigger(type) {
		const changed = (type === 'options-change');

		this.simulator.fireOffscreen()
			.then(() => {
				if (changed || this.simulator.getDice().length != this.diceCount) {
					this.rebuildDice(this.diceCount);
				}
			})
			.then(() => this.simulator.randomise(this.randomSource));
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
