const BOARD_WIDTH = 310;
const BOARD_HEIGHT = 310;
const SPINNER_SIZE = 250;
const SPINNER_CORE_SIZE = 160;

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

export default class Contortion {
	constructor() {
		this.inner = document.createElement('div');

		this.board = make('div', 'board');
		setSize(this.board, BOARD_WIDTH, BOARD_HEIGHT);
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

		const needle = make('div', 'needle');
		const needleShadow = make('div', 'needle-shadow');
		const pin = make('div', 'pin');

		segments.appendChild(make('div', 'hbeam'));
		segments.appendChild(make('div', 'vbeam'));
		segments.appendChild(segmentsCore);
		this.board.appendChild(boardB1);
		this.board.appendChild(boardB2);
		this.board.appendChild(segments);
		this.board.appendChild(outline);
		this.board.appendChild(make('div', 'left-hand'));
		this.board.appendChild(make('div', 'right-hand'));
		this.board.appendChild(make('div', 'left-foot'));
		this.board.appendChild(make('div', 'right-foot'));
		this.board.appendChild(needleShadow);
		this.board.appendChild(needle);
		this.board.appendChild(pin);
		this.inner.appendChild(this.board);
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

	start() {
	}

	stop() {
	}

	dom() {
		return this.inner;
	}
};
