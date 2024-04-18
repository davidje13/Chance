import Coins3DRenderer from './Coins3DRenderer.js';
import CoinsOptions from './CoinsOptions.js';
import Quaternion from '../math/Quaternion.js';
import {V3} from '../math/Vector.js';
import {make} from '../dom/Dom.js';
import {hasAccelerometerAccess} from '../gestures/ShakeGesture.js';

const STOPPED = 0;
const FALLING = 1;
const RISING = 2;

const HEIGHT_RANDOM = -7;

const OPT_CURRENCIES = [
	{label: 'GBP (Classic)', currency: 'gbp-old', def: true},
	{label: 'GBP', currency: 'gbp', def: true},
	{label: 'EUR (German Style)', currency: 'eur-de', def: true},
	{label: 'USD', currency: 'usd', def: true},
	{label: 'JPY', currency: 'jpy', def: true},
	{label: 'NZD (Cook Islands Style)', currency: 'nzd-cook', def: true},
];

export default class Coins {
	constructor(randomSource) {
		this.inner = make('div', 'coins');

		this.randomSource = randomSource;
		this.renderer = new Coins3DRenderer();

		this.inner.appendChild(this.renderer.dom());

		this.coin = null;

		this.opts = new CoinsOptions();
		this.opts.addHeading('Currencies');
		for (const opt of OPT_CURRENCIES) {
			this.opts.addRow({
				label: opt.label,
				sampleData: {currency: opt.currency},
				property: 'currency-' + opt.currency,
				type: 'checkbox',
				def: opt.def,
			});
		}
	}

	title() {
		return 'Coin Toss';
	}

	info() {
		return hasAccelerometerAccess() ? 'Tap or shake to flip the coin' : 'Tap to flip the coin';
	}

	options() {
		return this.opts;
	}

	stepPhysics(deltaTm) {
		const coin = this.coin;
		const depth = coin.thickness * 0.5;
		const coinRad = 1;

		if (coin.state === STOPPED) {
			return false;
		}

		if (!coin.blur) {
			coin.blur = {};
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
				if (this.repick) {
					this.pickCoin();
				}
				this.randomise();
			}
			return true;
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

		if (coin.wobbleAngle <= 0) {
			coin.state = STOPPED;
		}
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
		if (!this.stepPhysics(deltaTm)) {
			return;
		}
		const {blurred} = this.renderer.render([this.coin]);
		if (blurred && this.coin.state === STOPPED) {
			this.coin.state = FALLING;
		}
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

	trigger(type) {
		this.coin.state = RISING,
		this.coin.velocity.z = -20;
		if (type === 'options-change') {
			this.repick = true;
		}
	}

	pickCoin() {
		const props = this.opts.getProperties();
		const currencies = OPT_CURRENCIES
			.filter((o) => props.get('currency-' + o.currency))
			.map((o) => o.currency);

		if (currencies.length === 0) {
			currencies.push('void');
		}

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
			blur: null,
		};
		this.repick = false;
	}

	start() {
		this.pickCoin();
		this.randomise();
	}

	stop() {
	}

	resize(width, height) {
		this.renderer.resize(width, height);
		if (this.coin && this.coin.state === STOPPED) {
			this.coin.state = FALLING;
		}
	}

	dom() {
		return this.inner;
	}
};
