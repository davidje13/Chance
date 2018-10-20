const pixelRatio = window.devicePixelRatio || 1;

function setCanvasSize(canvas, width, height) {
	const w = Math.round(width * pixelRatio);
	const h = Math.round(height * pixelRatio);
	canvas.width = w;
	canvas.height = h;
	canvas.style.width = width + 'px';
	canvas.style.height = height + 'px';
}

export default class Canvas {
	constructor(width, height, options = {}) {
		const canvas = document.createElement('canvas');
		setCanvasSize(canvas, width, height);
		this.gl = canvas.getContext('webgl', options);
	}

	resize(width, height) {
		setCanvasSize(this.gl.canvas, width, height);
		this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
	}

	width() {
		return this.gl.canvas.width;
	}

	height() {
		return this.gl.canvas.height;
	}

	pixelRatio() {
		return pixelRatio;
	}

	dom() {
		return this.gl.canvas;
	}
};
