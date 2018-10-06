import FrictionSimulator from './FrictionSimulator.js';
import Pointer from './Pointer.js';
import Momentum from './Momentum.js';
import MouseDrag from './MouseDrag.js';

const BOARD_WIDTH = 310;
const BOARD_HEIGHT = 310;
const SPINNER_SIZE = 250;
const SPINNER_CORE_SIZE = 160;
const NEEDLE_COUNT = 15;
const FRAMES_PER_UPDATE = 1;

const DELAY_AUTO_RESPIN = 5000;
const IMPULSE_WINDOW_MILLIS = 100;
const MAX_IMPULSE = 10 * Math.PI;

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

function posMod(a, b) {
	return ((a % b) + b) % b;
}

function smallestAngle(a) {
	return posMod(a + Math.PI, Math.PI * 2) - Math.PI;
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

export default class Contortion {
	constructor(randomSource) {
		this.randomSource = randomSource;
		this.skipCurrent = true;
		this.makeSpinsFair = true;
		this.autoSpin = false;

		this.inner = make('div', 'contortion');

		this.needleHold = make('div', 'needle-hold');
		this.shadowHold = make('div', 'shadow-hold');
		this.board = makeBoard(this.needleHold, this.shadowHold);
		this.inner.appendChild(this.board);

		this.pointer = new Pointer(new FrictionSimulator(0.1, Math.PI * 2.0));
		this.needles = [];
		this.lastAngle = null;
		this.latest = [-1, -1, -1, -1];

		this.nextSpin = 0;
		this.mouseDrag = new MouseDrag(
			this.mousemove.bind(this),
			this.mouseup.bind(this),
			this.angleFromEvent.bind(this)
		);
		this.dragMomentum = new Momentum(IMPULSE_WINDOW_MILLIS);
		this.wasAutoSpin = false;

		this.prepareNeedles();
		this.animate = this.animate.bind(this);
		this.spinRandomly = this.spinRandomly.bind(this);
		this.mousedown = this.mousedown.bind(this);
		this.dblclick = this.dblclick.bind(this);
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
		if (!this.autoSpin) {
			return (
				'Flick or shake to spin\n' +
				'Double-tap to spin repeatedly'
			);
		}
		if (this.pointer.velocity() !== 0) {
			return (
				'Spinning automatically\u2026\n' +
				'Tap to stop'
			);
		}
		const seconds = Math.max(Math.ceil((this.nextSpin - Date.now()) / 1000), 1);
		return (
			`Spinning automatically (${seconds})\n` +
			'Tap to stop'
		);
	}

	animate(tm) {
		-- this.framesToNext;
		if (this.framesToNext > 0) {
			this.nextFrame = requestAnimationFrame(this.animate);
			return;
		}
		this.framesToNext = FRAMES_PER_UPDATE;

		if (this.pointer.velocity() !== 0) {
			this.pointer.update(tm * 0.001);

			if (this.pointer.velocity() === 0) {
				this.announceResult();
			}
		}

		const pos = this.pointer.position();
		let change = 0;
		if (pos > Math.PI) {
			change = -Math.PI * 2;
		} else if (pos < -Math.PI) {
			change = Math.PI * 2;
		}
		this.pointer.shiftPosition(change);
		this.dragMomentum.shiftPosition(change);
		this.lastAngle += change;

		this.pointNeedle(this.pointer.position());

		this.nextFrame = requestAnimationFrame(this.animate);
	}

	announceResult() {
		const segment = this.segmentForAngle(this.pointer.position());

		this.latest[Math.floor(segment / 4)] = segment % 4;
		if (this.autoSpin) {
			this.spinRandomlyAfterDelay(DELAY_AUTO_RESPIN);
		}
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

	segmentForAngle(angle) {
		return Math.floor(posMod(angle * 8 / Math.PI, 16));
	}

	spinTo(angle) {
		clearTimeout(this.nextFlick);
		this.pointer.setTarget(performance.now() * 0.001, angle);
	}

	randomAngleWithinSegment(segment) {
		const innerAngle = this.randomSource.nextFloat() * 0.9 + 0.05;
		return (((segment + 8) % 16) - 8 + innerAngle) * 0.125 * Math.PI;
	}

	spinRandomly() {
		const pos = this.pointer.position();
		const spins = 2 + this.randomSource.nextInt(2);
		const angle = this.randomAngleWithinSegment(this.pickSegment());
		this.spinTo(Math.PI * 2 * spins + smallestAngle(angle - pos) + pos);
	}

	spinRandomlyAfterDelay(delay) {
		clearTimeout(this.nextFlick);
		this.nextSpin = Date.now() + delay;
		this.nextFlick = setTimeout(this.spinRandomly, delay);
	}

	spinWithImpulse(impulse, fair) {
		const raw = this.pointer.predictFinalPosition(impulse);
		if (!fair) {
			this.spinTo(raw);
			return;
		}

		const pos = this.pointer.position();
		const target = this.randomAngleWithinSegment(this.pickSegment());
		let angle = smallestAngle(target - raw) + raw;
		if (raw - pos > 0 && angle - pos < Math.PI * 0.5) {
			angle += Math.PI * 2;
		}
		if (raw - pos < 0 && angle - pos > -Math.PI * 0.5) {
			angle -= Math.PI * 2;
		}
		this.spinTo(angle);
	}

	startAutospin() {
		this.autoSpin = true;
		if (this.pointer.velocity() === 0) {
			this.spinRandomly();
		}
	}

	stopAutospin() {
		this.autoSpin = false;
		clearTimeout(this.nextFlick);
	}

	angleFromEvent(e) {
		const bound = this.board.getBoundingClientRect();
		return Math.atan2(
			e.pageY - (bound.top + bound.bottom) / 2,
			e.pageX - (bound.left + bound.right) / 2
		);
	}

	mousedown(e) {
		this.wasAutoSpin = this.autoSpin;
		if (this.autoSpin) {
			this.stopAutospin();
		}

		this.dragMomentum.reset();
		this.mouseDrag.begin(e);
	}

	mousemove(oldAngle, newAngle) {
		this.pointer.stop();
		this.pointer.shiftPosition(smallestAngle(newAngle - oldAngle));
		this.dragMomentum.accumulate(this.pointer.position());
	}

	mouseup() {
		const impulse = this.dragMomentum.momentum();

		if (Math.abs(impulse) > Math.PI * 0.2) {
			this.spinWithImpulse(
				Math.max(-MAX_IMPULSE, Math.min(MAX_IMPULSE, impulse)),
				this.makeSpinsFair
			);
		} else if (!this.wasAutoSpin) {
			this.spinRandomly();
		}
	}

	dblclick() {
		this.startAutospin();
	}

	start() {
		this.inner.addEventListener('mousedown', this.mousedown);
		this.inner.addEventListener('dblclick', this.dblclick);
		this.framesToNext = 1;
		this.animate(performance.now());
		if (this.autoSpin) {
			this.spinRandomly();
		}
	}

	stop() {
		this.inner.removeEventListener('mousedown', this.mousedown);
		this.inner.removeEventListener('dblclick', this.dblclick);
		this.mouseDrag.abort();
		cancelAnimationFrame(this.nextFrame);
		clearTimeout(this.nextFlick);
	}

	dom() {
		return this.inner;
	}
};
