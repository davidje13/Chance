import Icosahedron from './Icosahedron.js';
import ShapeSimulator from './ShapeSimulator.js';
import GravityAssist from './GravityAssist.js';
import Answers3DRenderer from './Answers3DRenderer.js';
import {make, addFastClickListener} from '../dom/Dom.js';

const BALL_SIZE = 350;
const HOLE_SIZE = 180;
const CHAMFER_SIZE = 3;

const LETTER_DEPTH = 0.03;
const FOG_DEPTH = 0.02;
const MAX_DEPTH = 2.5;
const RAND_DEPTH = 2.4;
const FLOAT_SPEED = -0.1;
const PHYSICS_STEPS = 8;
const DEPTH_LAYERS = 5;

function setSize(o, size) {
	o.style.width = `${size}px`;
	o.style.height = `${size}px`;
	o.style.marginLeft = `${-size / 2}px`;
	o.style.marginTop = `${-size / 2}px`;
}

function buildBackground() {
	const ball = make('div', 'ball');
	setSize(ball, BALL_SIZE);

	const chamfer = make('div', 'chamfer');
	setSize(chamfer, HOLE_SIZE + CHAMFER_SIZE * 2);

	const hole = make('div', 'hole');
	setSize(hole, HOLE_SIZE);

	ball.appendChild(make('div', 'shine'));
	ball.appendChild(chamfer);
	ball.appendChild(hole);

	return ball;
}

export default class Answers {
	constructor(randomSource) {
		this.randomSource = randomSource;

		this.simulator = new ShapeSimulator(
			[
				...new Icosahedron().points(),
				...new Icosahedron({inset: 0.2, inflate: LETTER_DEPTH}).points(),
			],
			MAX_DEPTH
		);

		const shapeLayers = [];
		for (let i = 0; i < DEPTH_LAYERS; ++ i) {
			shapeLayers.push(new Icosahedron({
				inflate: i * LETTER_DEPTH / (DEPTH_LAYERS - 1),
			}));
		}
		this.renderer = new Answers3DRenderer(shapeLayers, FOG_DEPTH, HOLE_SIZE, MAX_DEPTH);

		this.inner = make('div', 'answers');
		const ball = buildBackground();
		ball.appendChild(this.renderer.dom());
		this.inner.appendChild(ball);

		this.allowVertical = true;
		this.latestGravity = -10;
		this.simGravityChange = 0;
		this.gravAssist = this.allowVertical
			? new GravityAssist(-3, 15)
			: new GravityAssist(0, 15);

		this.motion = this.motion.bind(this);

		this.clickListener = addFastClickListener(this.inner, () => this.trigger('click'));
	}

	title() {
		return 'Answers Ball';
	}

	info() {
		if (this.clickListener !== null) {
			return (
				'Tap while asking or\n' +
				'thinking of a question'
			);
		} else {
			return (
				'Hold face-down and shake while\n' +
				'asking or thinking of a question'
			);
		}
	}

	motion(e) {
		if (this.clickListener !== null) {
			this.clickListener.remove();
			this.clickListener = null;
		}
		this.latestGravity = this.gravAssist.apply(e.accelerationIncludingGravity.z);
		this.simGravityChange = 0;

		if (e.rotationRate) {
			this.simulator.applyRotationImpulse({
				x: -e.rotationRate.alpha * e.interval * Math.PI / 180,
				y: -e.rotationRate.beta * e.interval * Math.PI / 180,
				z: -e.rotationRate.gamma * e.interval * Math.PI / 180,
			});
		}
	}

	trigger(type) {
		if (type === 'shake') {
			return;
		}
		if (this.clickListener === null) {
			return;
		}
		this.latestGravity = 25;
		this.simGravityChange = -20;
	}

	step(deltaTm, absTm) {
		this.latestGravity += this.simGravityChange * deltaTm;
		this.latestGravity = Math.max(-10, Math.min(20, this.latestGravity));
		this.simulator.setGravity(this.latestGravity * FLOAT_SPEED);
		for (let r = 0; r < PHYSICS_STEPS; ++ r) {
			this.simulator.step(deltaTm / PHYSICS_STEPS);
		}
		if (this.simulator.depth() > RAND_DEPTH) {
			this.simulator.randomise(this.randomSource);
		}
		this.renderer.render(
			this.simulator.rotationMatrix(),
			this.simulator.depth()
		);
	}

	start() {
		this.simulator.setDepth(MAX_DEPTH);
		this.simulator.randomise(this.randomSource);
		window.addEventListener('devicemotion', this.motion);
	}

	stop() {
		window.removeEventListener('devicemotion', this.motion);
	}

	resize(width, height) {
	}

	dom() {
		return this.inner;
	}
};
