import FrictionSimulator from './FrictionSimulator.js';
import Pointer from './Pointer.js';
import Momentum from './Momentum.js';
import MouseDrag from './MouseDrag.js';
import ContortionGlRenderer from './ContortionGlRenderer.js';

const BOARD_WIDTH = 310;
const BOARD_HEIGHT = 310;
const SPINNER_SIZE = 250;
const SPINNER_CORE_SIZE = 160;
const RENDER_SIZE = 256;
const NEEDLE_COUNT = 64;
const NEEDLE_SIZE = 210;
const PIN_SIZE = 8;

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

function makeBoard() {
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

	return board;
}

export default class Contortion {
	constructor(randomSource) {
		this.randomSource = randomSource;
		this.skipCurrent = true;
		this.makeSpinsFair = true;
		this.autoSpin = false;

		this.inner = make('div', 'contortion');

		this.pointer = new Pointer(new FrictionSimulator(0.1, Math.PI * 2.0));
		this.lastAngle = null;
		this.latest = [-1, -1, -1, -1];

		this.nextSpin = 0;
		this.mouseDrag = new MouseDrag(
			this.mousedown.bind(this),
			this.mousemove.bind(this),
			this.mouseup.bind(this),
			this.angleFromEvent.bind(this)
		);
		this.dragMomentum = new Momentum(IMPULSE_WINDOW_MILLIS);
		this.wasAutoSpin = false;

		this.renderer = new ContortionGlRenderer(
			RENDER_SIZE,
			NEEDLE_COUNT,
			NEEDLE_SIZE,
			PIN_SIZE
		);
		this.board = makeBoard();
		this.board.appendChild(this.renderer.dom());
		this.inner.appendChild(this.board);
		this.pointNeedle(0);

		this.spinRandomly = this.spinRandomly.bind(this);
		this.dblclick = this.dblclick.bind(this);
	}

	pointNeedle(angle) {
		if (this.lastAngle === null) {
			this.lastAngle = angle;
		}
		this.renderer.render(this.lastAngle, angle - this.lastAngle);
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

	step(deltaTm, absTm) {
		if (this.pointer.velocity() !== 0) {
			this.pointer.update(absTm);

			if (this.pointer.velocity() === 0) {
				this.announceResult();
			}
		}

		let pos = this.pointer.position();
		let change = 0;
		if (pos > Math.PI) {
			change = -Math.PI * 2;
		} else if (pos < -Math.PI) {
			change = Math.PI * 2;
		}
		this.pointer.shiftPosition(change);
		this.dragMomentum.shiftPosition(change);
		this.lastAngle += change;
		pos += change;

		this.pointNeedle(pos);
	}

	shake() {
		this.spinRandomly();
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

	mousedown() {
		this.wasAutoSpin = this.autoSpin;
		if (this.autoSpin) {
			this.stopAutospin();
		}

		this.dragMomentum.reset();
	}

	mousemove(oldAngle, newAngle) {
		if (newAngle !== oldAngle) {
			this.pointer.stop();
			this.pointer.shiftPosition(smallestAngle(newAngle - oldAngle));
		}
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

	reenter() {
		if (this.autoSpin) {
			this.stopAutospin();
		} else {
			this.spinRandomly();
		}
	}

	start() {
		this.inner.addEventListener('dblclick', this.dblclick);
		this.mouseDrag.register(this.inner);
		if (this.autoSpin) {
			this.spinRandomly();
		}
	}

	stop() {
		this.inner.removeEventListener('dblclick', this.dblclick);
		this.mouseDrag.unregister(this.inner);
		this.mouseDrag.abort();
		clearTimeout(this.nextFlick);
	}

	resize(width, height) {
	}

	dom() {
		return this.inner;
	}
};
