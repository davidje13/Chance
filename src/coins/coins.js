import Coins3DRenderer from './Coins3DRenderer.js';
import Quaternion from '../math/Quaternion.js';
import {V3} from '../math/Vector.js';

const STOPPED = 0;
const FALLING = 1;
const RISING = 2;

const HEIGHT_RANDOM = -7;

export default class Coins {
	constructor(randomSource) {
		this.inner = document.createElement('div');
		this.inner.className = 'coins';

		this.randomSource = randomSource;
		this.renderer = new Coins3DRenderer();

		this.inner.appendChild(this.renderer.dom());

		this.coin = null;

		this.toss = this.toss.bind(this);
	}

	title() {
		return 'Coin Toss';
	}

	info() {
		return (
			'Tap or shake to flip the coin'
		);
	}

	stepPhysics(deltaTm) {
		const coin = this.coin;
		const depth = coin.thickness * 0.5;
		const coinRad = 1;

		if (coin.state === STOPPED) {
			return false;
		}

		coin.blur.rot = coin.rotation;
		coin.blur.pos = coin.position;

		if (coin.state === RISING) {
			coin.position = V3.addMult(coin.position, coin.velocity, deltaTm);
			coin.rotation = Quaternion.fromAngularVelocity({
				x: -30 * deltaTm,
				y: 0,
				z: 10 * deltaTm,
			}).mult(coin.rotation);
			if (coin.position.z <= HEIGHT_RANDOM) {
				this.randomise();
			}
			return true;
		}

		if (coin.wobbleAngle <= 0) {
			coin.state = STOPPED;
		}

		if (coin.position.z > -1.5) {
			coin.wobbleAngle = coin.wobbleAngle * Math.pow(0.3, deltaTm) - deltaTm * 0.1;
		}
		if (coin.wobbleAngle < 0) {
			coin.wobbleAngle = 0;
		}
		const wobbleAngle = coin.wobbleAngle;

		const dwobble = deltaTm * Math.PI * coin.wobbleSpeed * Math.pow(Math.max(wobbleAngle, 0.0001), -0.5);
		coin.wobbleAxis += dwobble;

		const baseRad = (
			Math.abs(Math.cos(wobbleAngle) * coinRad) -
			Math.abs(Math.sin(wobbleAngle) * depth)
		);

		const bottom = (
			Math.abs(Math.sin(wobbleAngle) * coinRad) +
			Math.abs(Math.cos(wobbleAngle) * depth)
		);

		coin.spin -= dwobble * (coinRad - baseRad);
		coin.position = V3.addMult(coin.position, coin.velocity, deltaTm);
		const deltaZ = deltaTm * 9.81 * 3;

		if (coin.position.z > -bottom) {
			coin.velocity.z *= -0.4;
			if (coin.velocity.z < -deltaZ) {
				coin.state = FALLING;
			} else {
				coin.velocity.z = 0;
			}
			coin.position.z = -bottom;
		} else {
			coin.state = FALLING;
			coin.velocity.z += deltaZ;
		}

		coin.rotation = Quaternion.fromRotation({
			x: 0,
			y: 0,
			z: 1,
			angle: coin.spin,
		}).mult(Quaternion.fromRotation({
			x: Math.sin(coin.wobbleAxis),
			y: Math.cos(coin.wobbleAxis),
			z: 0,
			angle: wobbleAngle,
		})).mult(coin.baseRot);

		return true;
	}

	step(deltaTm) {
		if (this.stepPhysics(deltaTm)) {
			this.renderer.render([this.coin]);
		}
	}

	toss() {
		this.coin.state = RISING,
		this.coin.velocity.z = -20;
	}

	randomise() {
		const side = this.randomSource.nextInt(2);
		const rotation = this.randomSource.nextFloat() * Math.PI * 2;

		this.coin.state = FALLING;
		this.coin.position = {x: 0, y: 0, z: HEIGHT_RANDOM};
		this.coin.velocity = new V3();
		this.coin.wobbleAxis = 0;
		this.coin.wobbleAngle = Math.PI * 0.4;
		this.coin.spin = 0;
		this.coin.wobbleSpeed = (
			(this.randomSource.nextFloat() + 5.5) *
			(this.randomSource.nextInt(2) * 2 - 1)
		);
		this.coin.baseRot = Quaternion.fromRotation({
			x: 1,
			y: 0,
			z: 0,
			angle: side * Math.PI,
		}).mult(Quaternion.fromRotation({
			x: 0,
			y: 0,
			z: 1,
			angle: rotation,
		}));
	}

	shake() {
		this.toss();
	}

	start() {
		const currencies = ['gbp-old', 'gbp', 'eur-de', 'usd'];
		const currency = currencies[this.randomSource.nextInt(currencies.length)];
		this.coin = {
			state: STOPPED,
			thickness: this.renderer.coinHeight(currency),
			style: {currency},
			wobbleAxis: 0,
			wobbleAngle: 0,
			wobbleSpeed: 0,
			spin: 0,
			baseRot: Quaternion.identity(),
			position: {x: 0, y: 0, z: 0},
			velocity: new V3(),
			rotation: Quaternion.identity(),
			blur: {
				rot: null,
				pos: null,
			},
		};
		this.randomise();
		this.inner.addEventListener('click', this.toss);
	}

	stop() {
		this.inner.removeEventListener('click', this.toss);
	}

	resize(width, height) {
		this.renderer.resize(width, height);
	}

	dom() {
		return this.inner;
	}
};
