import Dice3DRenderer from './Dice3DRenderer.js';
import Quaternion from '../math/Quaternion.js';

export default class Dice {
	constructor(randomSource) {
		this.inner = document.createElement('div');
		this.inner.className = 'dice';

		this.randomSource = randomSource;
		this.renderer = new Dice3DRenderer();

		this.inner.appendChild(this.renderer.dom());

		this.regionDepth = 20;
		this.regionWidth = 0;
		this.regionHeight = 0;

		this.dice = [];
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

	rebuildDice() {
		const materials = ['wood', 'wood-varnished', 'metal', 'plastic', 'plastic-red'];
		const shapes = ['cube', 'cube-fillet', 'cube-clipped', 'cube-rounded'];
		const dots = ['european', 'asian', 'numeric', 'written'];
		const sepX = (this.regionWidth - 2.5) / (shapes.length - 1);
		const sepY = (this.regionHeight - 2.5) / (materials.length - 1);
		const midX = (shapes.length - 1) / 2;
		const midY = (materials.length - 1) / 2;
		this.dice = [];
		for (let x = 0; x < shapes.length; ++ x) {
			for (let y = 0; y < materials.length; ++ y) {
				const z = Math.floor(Math.random() * dots.length);
				this.dice.push({
					position: {x: (x - midX) * sepX, y: -(y - midY) * sepY, z: 1 - this.regionDepth},
					style: {shape: shapes[x], material: materials[y], dots: dots[z]},
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

	start() {
		this.rebuildDice();
	}

	stop() {
	}

	resize(width, height) {
		this.renderer.resize(width, height);
		const depth = 2 - this.regionDepth;
		this.regionWidth = this.renderer.widthAtZ(depth) - 0.5;
		this.regionHeight = this.renderer.heightAtZ(depth, {insetPixels: 140}) - 0.5;
		this.rebuildDice();
	}

	dom() {
		return this.inner;
	}
};
