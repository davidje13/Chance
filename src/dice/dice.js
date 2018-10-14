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

		for (const die of this.dice) {
			const rvel = Quaternion.fromAngularVelocity({
				x: die.vel.x * deltaTm,
				y: die.vel.y * deltaTm,
				z: die.vel.z * deltaTm,
			});
			die.rotation = rvel.mult(die.rotation);
		}
	}

	start() {
		const materials = ['wood', 'wood-varnished', 'metal', 'plastic', 'plastic-red'];
		const shapes = ['cube', 'cube-fillet', 'cube-clipped', 'cube-rounded'];
		const sep = 3.4;
		const midX = (materials.length - 1) / 2;
		const midY = (shapes.length - 1) / 2;
		this.dice = [];
		for (let x = 0; x < materials.length; ++ x) {
			for (let y = 0; y < shapes.length; ++ y) {
				this.dice.push({
					position: {x: (x - midX) * sep, y: -(y - midY) * sep, z: 0},
					style: {shape: shapes[y], material: materials[x]},
					rotation: Quaternion.random(this.randomSource),
					vel: {
						x: (this.randomSource.nextFloat() - 0.5) * 2.0,
						y: (this.randomSource.nextFloat() - 0.5) * 2.0,
						z: (this.randomSource.nextFloat() - 0.5) * 1.0,
					},
				});
			}
		}
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
