import Dice3DRenderer from './Dice3DRenderer.js';
import Quaternion from '../math/Quaternion.js';

export default class Dice {
	constructor(randomSource) {
		this.inner = document.createElement('div');
		this.inner.className = 'dice';

		this.randomSource = randomSource;
		this.renderer = new Dice3DRenderer();

		this.inner.appendChild(this.renderer.dom());

		this.dice = [];
		this.vel = null;
	}

	title() {
		return 'Dice';
	}

	info() {
		return (
			'Tap or shake to roll the dice'
		);
	}

	step(deltaTm, absTm) {
		this.renderer.render(this.dice);

		const rvel = Quaternion.fromAngularVelocity({
			x: this.vel.x * deltaTm,
			y: this.vel.y * deltaTm,
			z: this.vel.z * deltaTm,
		});
		this.dice[0].rotation = rvel.mult(this.dice[0].rotation);
		this.dice[1].rotation = rvel.mult(this.dice[1].rotation);
	}

	start() {
		this.dice = [
			{
				position: {x: 0, y: 2, z: 0},
				style: {shape: 'cube'},
				rotation: Quaternion.random(this.randomSource),
			},
			{
				position: {x: 0, y: -2, z: 0},
				style: {shape: 'rounded'},
				rotation: Quaternion.random(this.randomSource),
			}
		];
		this.vel = {
			x: this.randomSource.nextFloat() - 0.5,
			y: this.randomSource.nextFloat() - 0.5,
			z: 0
		};
	}

	stop() {
	}

	resize(width, height) {
		this.renderer.resize(width, height);
	}

	dom() {
		return this.inner;
	}
};
