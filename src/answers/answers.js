import Icosahedron from './Icosahedron.js';
import ShapeSimulator from './ShapeSimulator.js';
import Answers3DRenderer from './Answers3DRenderer.js';

const BALL_SIZE = 350;
const HOLE_SIZE = 180;
const CHAMFER_SIZE = 3;

const LETTER_DEPTH = 0.03;
const MAX_DEPTH = 2.5;
const RAND_DEPTH = 2.4;
const FLOAT_SPEED = -0.1;
const PHYSICS_STEPS = 8;

function make(tag, className) {
	const o = document.createElement(tag);
	o.className = className;
	return o;
}

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

		this.renderer = new Answers3DRenderer(
			new Icosahedron(),
			HOLE_SIZE
		);

		this.inner = document.createElement('div');
		const ball = buildBackground();
		ball.appendChild(this.renderer.dom());
		this.inner.appendChild(ball);

		this.allowClickShake = true;
		this.latestGravity = -10;
		this.simGravityChange = 0;

		this.step = this.step.bind(this);
		this.motion = this.motion.bind(this);
		this.click = this.click.bind(this);
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

	motion(e) {
		this.allowClickShake = false;
		this.latestGravity = e.accelerationIncludingGravity.z;
		this.simGravityChange = 0;

		if (e.rotationRate) {
			this.simulator.applyRotationImpulse({
				x: -e.rotationRate.alpha * e.interval * Math.PI / 180,
				y: -e.rotationRate.beta * e.interval * Math.PI / 180,
				z: -e.rotationRate.gamma * e.interval * Math.PI / 180,
			});
		}
	}

	click() {
		if (!this.allowClickShake) {
			return;
		}
		this.latestGravity = 25;
		this.simGravityChange = -20;
	}

	step(tm) {
		const deltaTm = Math.min((tm - this.lastTm) * 0.001, 0.1);
		this.latestGravity += this.simGravityChange * deltaTm;
		this.latestGravity = Math.max(-10, Math.min(20, this.latestGravity));
		this.simulator.setGravity(this.latestGravity * FLOAT_SPEED);
		for (let r = 0; r < PHYSICS_STEPS; ++ r) {
			this.simulator.step(deltaTm / PHYSICS_STEPS);
		}
		this.lastTm = tm;
		if (this.simulator.depth() > RAND_DEPTH) {
			this.simulator.randomise(this.randomSource);
		}
		this.renderer.render(
			this.simulator.rotationMatrix(),
			this.simulator.depth()
		);
		this.nextFrame = requestAnimationFrame(this.step);
	}

	start() {
		const tm = performance.now();
		this.lastTm = tm;
		this.simulator.setDepth(MAX_DEPTH);
		this.simulator.randomise(this.randomSource);
		window.addEventListener('devicemotion', this.motion);
		window.addEventListener('click', this.click);
		this.step(tm);
	}

	stop() {
		cancelAnimationFrame(this.nextFrame);
		window.removeEventListener('devicemotion', this.motion);
		window.removeEventListener('click', this.click);
	}

	dom() {
		return this.inner;
	}
};
