const pixelRatio = window.devicePixelRatio || 1;

function setCanvasSize(canvas, width, height, oversample) {
	const w = Math.round(width * pixelRatio * oversample);
	const h = Math.round(height * pixelRatio * oversample);
	canvas.width = w;
	canvas.height = h;
	canvas.style.width = width + 'px';
	canvas.style.height = height + 'px';
}

export default class Canvas {
	constructor(width, height, options = {}, {oversample = 1} = {}) {
		const canvas = document.createElement('canvas');
		this.oversample = oversample;
		setCanvasSize(canvas, width, height, this.oversample);
		this.gl = canvas.getContext('webgl', options);
	}

	resize(width, height) {
		setCanvasSize(this.gl.canvas, width, height, this.oversample);
		this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
	}

	width() {
		return this.gl.canvas.width;
	}

	height() {
		return this.gl.canvas.height;
	}

	pixelRatio() {
		return pixelRatio * this.oversample;
	}

	displayWidth() {
		return this.width() / this.pixelRatio();
	}

	displayHeight() {
		return this.height() / this.pixelRatio();
	}

	dom() {
		return this.gl.canvas;
	}
};
