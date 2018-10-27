const pixelRatio = Math.max(1, Math.min(4, window.devicePixelRatio || 1));

function setCanvasSize(canvas, width, height, maxOversample) {
	const oversample = Math.max(pixelRatio, Math.min(pixelRatio * 2, maxOversample));
	const w = Math.round(width * oversample);
	const h = Math.round(height * oversample);
	canvas.width = w;
	canvas.height = h;
	canvas.style.width = width + 'px';
	canvas.style.height = height + 'px';
	return oversample;
}

export default class Canvas {
	constructor(width, height, options = {}, {maxOversampleResolution = 0} = {}) {
		const canvas = document.createElement('canvas');
		this.maxOversample = maxOversampleResolution;
		this.pixRto = setCanvasSize(canvas, width, height, this.maxOversample);
		this.gl = canvas.getContext('webgl', options);
	}

	resize(width, height) {
		this.pixRto = setCanvasSize(this.gl.canvas, width, height, this.maxOversample);
		this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
	}

	width() {
		return this.gl.drawingBufferWidth;
	}

	height() {
		return this.gl.drawingBufferHeight;
	}

	pixelRatio() {
		return this.pixRto;
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
