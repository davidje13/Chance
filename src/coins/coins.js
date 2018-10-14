import Coins3DRenderer from './Coins3DRenderer.js';
import Quaternion from '../math/Quaternion.js';

export default class Coins {
	constructor(randomSource) {
		this.inner = document.createElement('div');
		this.inner.className = 'coins';

		this.randomSource = randomSource;
		this.renderer = new Coins3DRenderer();

		this.inner.appendChild(this.renderer.dom());

		this.coins = [];
	}

	title() {
		return 'Coin Toss';
	}

	info() {
		return (
			'Tap or shake to flip the coin'
		);
	}

	step(deltaTm, absTm) {
		this.renderer.render(this.coins);

		for (const coin of this.coins) {
			const rvel = Quaternion.fromAngularVelocity({
				x: coin.vel.x * deltaTm,
				y: coin.vel.y * deltaTm,
				z: coin.vel.z * deltaTm,
			});
			coin.rotation = rvel.mult(coin.rotation);
		}
	}

	start() {
		this.coins = [{
			position: {x: 0, y: 0, z: 0},
			style: {},
			rotation: Quaternion.random(this.randomSource),
			vel: {
				x: (this.randomSource.nextFloat() - 0.5) * 0.5,
				y: (this.randomSource.nextFloat() - 0.5) * 0.5,
				z: (this.randomSource.nextFloat() - 0.5) * 0.2,
			},
		}];
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
