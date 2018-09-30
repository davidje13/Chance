const BOARD_WIDTH = 310;
const BOARD_HEIGHT = 310;
const SPINNER_SIZE = 250;
const SPINNER_CORE_SIZE = 160;

function make(tag, className) {
	const o = document.createElement(tag);
	o.className = className;
	return o;
}

export default class Contortion {
	constructor() {
		this.inner = document.createElement('div');

		this.board = make('div', 'board');
		this.board.style.width = `${BOARD_WIDTH}px`;
		this.board.style.height = `${BOARD_HEIGHT}px`;
		this.board.style.marginLeft = `${-BOARD_WIDTH / 2}px`;
		this.board.style.marginTop = `${-BOARD_HEIGHT / 2}px`;
		const boardB1 = make('div', 'b1');
		const boardB2 = make('div', 'b2');

		const segments = make('div', 'segments');
		segments.style.width = `${SPINNER_SIZE}px`;
		segments.style.height = `${SPINNER_SIZE}px`;
		segments.style.marginLeft = `${-SPINNER_SIZE / 2}px`;
		segments.style.marginTop = `${-SPINNER_SIZE / 2}px`;

		const segmentsCore = make('div', 'core');
		segmentsCore.style.width = `${SPINNER_CORE_SIZE}px`;
		segmentsCore.style.height = `${SPINNER_CORE_SIZE}px`;
		segmentsCore.style.marginLeft = `${-SPINNER_CORE_SIZE / 2}px`;
		segmentsCore.style.marginTop = `${-SPINNER_CORE_SIZE / 2}px`;

		const needle = make('div', 'needle');
		const needleShadow = make('div', 'needle-shadow');
		const pin = make('div', 'pin');

		segments.appendChild(make('div', 'hbeam'));
		segments.appendChild(make('div', 'vbeam'));
		segments.appendChild(segmentsCore);
		this.board.appendChild(boardB1);
		this.board.appendChild(boardB2);
		this.board.appendChild(segments);
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
