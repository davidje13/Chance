const BOARD_WIDTH = 280;
const BOARD_HEIGHT = 280;

export default class Contortion {
	constructor() {
		this.inner = document.createElement('div');

		this.board = document.createElement('div');
		this.board.className = 'board';
		this.board.style.width = `${BOARD_WIDTH}px`;
		this.board.style.height = `${BOARD_HEIGHT}px`;
		this.board.style.marginLeft = `${-BOARD_WIDTH / 2}px`;
		this.board.style.marginTop = `${-BOARD_HEIGHT / 2}px`;
		const boardB1 = document.createElement('div');
		boardB1.className = 'b1';
		const boardB2 = document.createElement('div');
		boardB2.className = 'b2';
		this.board.appendChild(boardB1);
		this.board.appendChild(boardB2);
		this.inner.appendChild(this.board);
	}

	start() {
	}

	stop() {
	}

	dom() {
		return this.inner;
	}
};
