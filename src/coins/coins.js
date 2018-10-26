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

	shake() {
	}

	start() {
		const currencies = ['gbp-old', 'gbp', 'eur-de', 'usd'];
		const currency = currencies[this.randomSource.nextInt(currencies.length)];
		this.coins = [{
			position: {x: 0, y: 0, z: -this.renderer.coinHeight(currency) * 0.5},
			style: {currency},
			rotation: Quaternion.identity(),
			vel: {x: 0, y: 0, z: 0.2},
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
