const BALL_SIZE = 350;
const HOLE_SIZE = 180;
const CHAMFER_SIZE = 3;

function make(tag, className) {
	const o = document.createElement(tag);
	o.className = className;
	return o;
}

function setSize(o, size) {
	o.style.width = `${size}px`;
	o.style.height = `${size}px`;
	o.style.marginLeft = `${-size / 2}px`;
	o.style.marginTop = `${-size / 2}px`;
}

export default class Answers {
	constructor(randomSource) {
		this.inner = document.createElement('div');

		const ball = make('div', 'ball');
		setSize(ball, BALL_SIZE);

		const chamfer = make('div', 'chamfer');
		setSize(chamfer, HOLE_SIZE + CHAMFER_SIZE * 2);

		const hole = make('div', 'hole');
		setSize(hole, HOLE_SIZE);

		ball.appendChild(make('div', 'shine'));
		ball.appendChild(chamfer);
		ball.appendChild(hole);

		this.inner.appendChild(ball);
	}

	title() {
		return 'Answers Ball';
	}

	info() {
		return (
			'Hold face-down and shake while\n' +
			'asking or thinking of a question'
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
