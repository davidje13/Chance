const OFFSETS = [
	{x: 0, y: 0},
	{x: 80, y: 0},
	{x: 160, y: 0},
	{x: 0, y: 80},
	{x: 80, y: 80},
	{x: 160, y: 80},
];

const NATURAL_DIE_SIZE = 80;

function makeShadow(dist, angle, blur, expand, c) {
	const x = dist * Math.sin(angle);
	const y = -dist * Math.cos(angle);
	return `${x}px ${y}px ${blur}px ${expand}px ${c}`;
}

export default class Dice {
	constructor(randomSource) {
		this.inner = document.createElement('div');

		this.die = [];
		for (let i = 0; i < 12; ++ i) {
			this.die.push(this.makeDie());
			this.inner.appendChild(this.die[i]);
		}
	}

	makeDie() {
		const o = document.createElement('div');
		o.style.position = 'absolute';
		o.style.marginTop = `${-NATURAL_DIE_SIZE / 2}px`;
		o.style.marginLeft = `${-NATURAL_DIE_SIZE / 2}px`;
		o.style.width = `${NATURAL_DIE_SIZE}px`;
		o.style.height = `${NATURAL_DIE_SIZE}px`;
		o.style.borderRadius = '6px';
		return o;
	}

	updateDie(o, {x, y, r, size, value, theme}) {
		r = (r % Math.PI);
		const alt = (r > Math.PI / 2);
		if (alt) {
			r -= Math.PI / 2;
		}
		const deg = r * 180 / Math.PI;
		const tile = OFFSETS[value - 1];

		o.style.left = `${x}px`;
		o.style.top = `${y}px`;
		o.style.transform = (
			`rotate(${deg}deg) ` +
			`scale(${size / NATURAL_DIE_SIZE})`
		);
		const tileOrigin = {x: theme * 240, y: alt ? 160 : 0};
		o.style.background = (
			`${-tile.x - tileOrigin.x}px ${-tile.y - tileOrigin.y}px / 480px ` +
			`url(resources/dice/face-sheet.png),` +
			`linear-gradient(${160 - deg}deg, #FDFDFD 49%, #F1F1F1 51%, #E2E2E2)`
		);
		o.style.boxShadow = (
			'inset ' + makeShadow(2, 0 - r, 4, -1, 'rgba(0, 0, 0, 0.5)') + ',' +
			'inset ' + makeShadow(2, Math.PI - r, 4, 0, 'rgba(255, 255, 255, 0.5)') + ',' +
			makeShadow(0, 0, 20, 0, 'rgba(0, 0, 0, 0.2)') + ',' +
			makeShadow(6, Math.PI * 0.75 - r, 8, 0, 'rgba(0, 0, 0, 0.3)') + ',' +
			makeShadow(12, Math.PI * 0.75 - r, 10, -2, 'rgba(0, 0, 0, 0.2)') + ',' +
			makeShadow(24, Math.PI * 0.75 - r, 16, -6, 'rgba(0, 0, 0, 0.3)')
		);
	}

	title() {
		return 'Dice';
	}

	info() {
		return (
			'Tap or shake to roll the dice'
		);
	}

	start() {
		let r = 0;
		this.loop = setInterval(() => {
			for (let i = 0; i < 12; ++ i) {
				const x = (i % 3) * 120 + 80;
				const y = Math.floor(i / 3) * 120 + 160;
				this.updateDie(this.die[i], {
					x,
					y,
					r,
					size: 80,
					value: (i % 6) + 1,
					theme: Math.floor(i / 6),
				});
			}
			r += Math.PI * 0.002;
		}, 200);
	}

	stop() {
		clearInterval(this.loop);
	}

	dom() {
		return this.inner;
	}
};
