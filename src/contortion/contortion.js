const BOARD_WIDTH = 310;
const BOARD_HEIGHT = 310;
const SPINNER_SIZE = 250;
const SPINNER_CORE_SIZE = 160;
const NEEDLE_COUNT = 15;
const FRAMES_PER_UPDATE = 1;
const IMPULSE = 8 * Math.PI;

function make(tag, className) {
	const o = document.createElement(tag);
	o.className = className;
	return o;
}

function setSize(o, width, height = null) {
	if (height === null) {
		height = width;
	}
	o.style.width = `${width}px`;
	o.style.height = `${height}px`;
	o.style.marginLeft = `${-width / 2}px`;
	o.style.marginTop = `${-height / 2}px`;
}

function makeBoard(needleHold, shadowHold) {
	const board = make('div', 'board');
	setSize(board, BOARD_WIDTH, BOARD_HEIGHT);
	const boardB1 = make('div', 'b1');
	const boardB2 = make('div', 'b2');

	const segments = make('div', 'segments');
	setSize(segments, SPINNER_SIZE);

	const outline = make('div', 'outline');
	setSize(outline, SPINNER_SIZE + 1);

	for (let i = 0; i < 4; ++ i) {
		const wedge = make('div', 'wedge-dbl yellow');
		wedge.style.transform = `rotate(${i * 90}deg)`;
		segments.appendChild(wedge);
	}
	for (let i = 0; i < 4; ++ i) {
		const wedge = make('div', 'wedge red');
		wedge.style.transform = `rotate(${i * 90}deg)`;
		segments.appendChild(wedge);
	}
	for (let i = 0; i < 4; ++ i) {
		const wedge = make('div', 'wedge blue');
		wedge.style.transform = `rotate(${i * 90 + 67.5}deg)`;
		segments.appendChild(wedge);
	}

	const segmentsCore = make('div', 'core');
	setSize(segmentsCore, SPINNER_CORE_SIZE);

	segments.appendChild(make('div', 'hbeam'));
	segments.appendChild(make('div', 'vbeam'));
	segments.appendChild(segmentsCore);
	board.appendChild(boardB1);
	board.appendChild(boardB2);
	board.appendChild(segments);
	board.appendChild(outline);
	board.appendChild(make('div', 'left-hand'));
	board.appendChild(make('div', 'right-hand'));
	board.appendChild(make('div', 'left-foot'));
	board.appendChild(make('div', 'right-foot'));
	board.appendChild(shadowHold);
	board.appendChild(needleHold);
	board.appendChild(make('div', 'pin'));

	return board;
}

class FrictionSimulator {
	constructor(multFriction, addFriction) {
		this.A = 1 - multFriction;
		this.B = addFriction / multFriction;
		this.b = addFriction;
		this.recipLnA = 1 / Math.log(this.A);
	}

	velocity(impulse, tm) {
		if (this.A === 1) {
			return impulse - this.b * tm * (impulse > 0 ? 1 : -1);
		}
		const B = this.B * (impulse > 0 ? 1 : -1);
		return (impulse + B) * Math.pow(this.A, tm) - B;
	}

	position(impulse, tm) {
		const B = this.B * (impulse > 0 ? 1 : -1);
		return (impulse + B) * (Math.pow(this.A, tm) - 1) * this.recipLnA - tm * B;
	}

	duration(impulse) {
		if (this.A === 1) {
			return Math.abs(impulse) / this.b;
		}
		const B = this.B * (impulse > 0 ? 1 : -1);
		return Math.log(B / (impulse + B)) * this.recipLnA;
	}

	finalPosition(impulse) {
		const B = this.B * (impulse > 0 ? 1 : -1);
		return -(B * Math.log(B / (impulse + B)) + impulse) * this.recipLnA;
	}

	_requiredImpulse(position) {
		// position function is not reversible, so search:
		let low = 0;
		let high = null;
		let sample = 16;
		for (let r = 0; r < 20; ++ r) {
			const p = this.finalPosition(sample);
			if (p === position) {
				return sample;
			}
			if (p < position) {
				low = sample;
				if (high === null) {
					sample *= 2;
				} else {
					sample = (low + high) / 2;
				}
			} else {
				high = sample;
				sample = (low + high) / 2;
			}
		}
		return sample;
	}

	requiredImpulse(position) {
		if (position === 0) {
			return 0;
		} else if (position < 0) {
			return -this._requiredImpulse(-position);
		} else {
			return this._requiredImpulse(position);
		}
	}
}

class Pointer {
	constructor(frictionSimulator) {
		this.fs = frictionSimulator;
		this.pos = 0;
		this.vel = 0;

		this.pos0 = 0;
		this.tm0 = 0;
		this.duration = 0;
		this.impulse = 0;
	}

	position() {
		return this.pos;
	}

	velocity() {
		return this.vel;
	}

	shiftPosition(delta) {
		this.pos += delta;
		this.pos0 += delta;
	}

	reset(position) {
		this.pos = this.pos0 = position;
		this.vel = 0;
		this.impulse = 0;
	}

	update(tm) {
		if (this.impulse === 0) {
			return false;
		}
		const deltaTm = tm - this.tm0;
		if (deltaTm >= this.duration) {
			this.reset(this.pos0 + this.fs.finalPosition(this.impulse));
		} else {
			this.pos = this.pos0 + this.fs.position(this.impulse, deltaTm);
			this.vel = this.fs.velocity(this.impulse, deltaTm);
		}
		return true;
	}

	_setImpulse(tm, impulse) {
		this.pos0 = this.pos;
		this.tm0 = tm;
		this.duration = this.fs.duration(impulse);
		this.impulse = this.vel = impulse;
	}

	setImpulse(tm, impulse) {
		this.update(tm);
		this._setImpulse(tm, impulse);
	}

	addImpulse(tm, impulse) {
		this.update(tm);
		this._setImpulse(tm, this.vel + impulse);
	}

	setTarget(tm, position) {
		this.update(tm);
		this._setImpulse(tm, this.fs.requiredImpulse(position - this.pos));
	}
}

export default class Contortion {
	constructor(randomSource) {
		this.randomSource = randomSource;

		this.inner = document.createElement('div');

		this.needleHold = make('div', 'needle-hold');
		this.shadowHold = make('div', 'shadow-hold');
		this.board = makeBoard(this.needleHold, this.shadowHold);
		this.inner.appendChild(this.board);

		this.pointer = new Pointer(new FrictionSimulator(0.1, Math.PI * 2.0));
		this.needles = [];
		this.lastAngle = null;
		this.latest = [-1, -1, -1, -1];

		this.skipCurrent = true;
		this.autoSpin = true;

		this.prepareNeedles();
		this.animate = this.animate.bind(this);
	}

	prepareNeedles() {
		const needleOpacity = Math.pow(1 / NEEDLE_COUNT, 0.9);
		for (let i = 0; i < NEEDLE_COUNT; ++ i) {
			const needle = make('div', 'needle');
			const shadow = make('div', 'needle-shadow');
			needle.style.opacity = needleOpacity;
			shadow.style.opacity = needleOpacity;
			this.needles.push({needle, shadow});
			this.needleHold.appendChild(needle);
			this.shadowHold.appendChild(shadow);
		}
	}

	updateNeedle(primaryAngle, trailingAngle) {
		const n = this.needles.length;
		for (let i = 0; i < n; ++ i) {
			const angle = primaryAngle + ((i + 1) / n - 1) * trailingAngle;
			const {needle, shadow} = this.needles[i];
			const transform = `rotate(${angle}rad)`;
			needle.style.transform = transform;
			shadow.style.transform = transform;
		}
	}

	pointNeedle(angle) {
		if (this.lastAngle === null) {
			this.lastAngle = angle;
		}
		this.updateNeedle(angle, angle - this.lastAngle);
		this.lastAngle = angle;
	}

	title() {
		return 'Contortion';
	}

	info() {
		return (
			'Flick or shake to spin\n' +
			'Double-tap to spin repeatedly'
		);
	}

	animate(tm) {
		-- this.framesToNext;
		if (this.framesToNext > 0) {
			this.nextFrame = requestAnimationFrame(this.animate);
			return;
		}
		this.framesToNext = FRAMES_PER_UPDATE;

		if (this.pointer.velocity() != 0) {
			this.pointer.update(tm * 0.001);

			if (this.pointer.velocity() === 0) {
				this.announceResult();
			}
		}

		const pos = this.pointer.position();
		if (pos > Math.PI) {
			this.pointer.shiftPosition(-Math.PI * 2);
			this.lastAngle -= Math.PI * 2;
		} else if (pos < -Math.PI) {
			this.pointer.shiftPosition(Math.PI * 2);
			this.lastAngle += Math.PI * 2;
		}
		this.pointNeedle(this.pointer.position());

		this.nextFrame = requestAnimationFrame(this.animate);
	}

	announceResult() {
		let segment = this.pointer.position() * 8 / Math.PI;
		segment = Math.floor(((segment % 16) + 16) % 16);

		this.latest[Math.floor(segment / 4)] = segment % 4;
		if (this.autoSpin) {
			clearTimeout(this.nextFlick);
			this.nextFlick = setTimeout(() => {
				this.spinTo(this.pickSegment());
			}, 2000);
		}
	}

	spinTo(segment) {
		clearTimeout(this.nextFlick);
		const tm = performance.now();
		const spins = 2 + this.randomSource.nextInt(3);
		const innerAngle = this.randomSource.nextFloat() * 0.9 + 0.05;
		const target = (((segment + 8) % 16) - 8 + innerAngle) * 0.125;
		this.pointer.setTarget(tm * 0.001, Math.PI * (spins * 2 + target));
	}

	pickSegment() {
		if (!this.skipCurrent) {
			return this.randomSource.nextInt(16);
		}
		let limit = 16;
		for (const v of this.latest) {
			if (v !== -1) {
				-- limit;
			}
		}
		let rand = this.randomSource.nextInt(limit);
		for (let i = 0; i < this.latest.length; ++ i) {
			if (this.latest[i] !== -1 && rand >= i * 4 + this.latest[i]) {
				++ rand;
			}
		}
		return rand;
	}

	beginAnimate() {
		this.framesToNext = 1;
		this.pointer.reset(0);
		this.animate(performance.now());
		if (this.autoSpin) {
			this.spinTo(this.pickSegment());
		}
	}

	start() {
		this.beginAnimate();
	}

	stop() {
		cancelAnimationFrame(this.nextFrame);
		clearTimeout(this.nextFlick);
	}

	dom() {
		return this.inner;
	}
};
