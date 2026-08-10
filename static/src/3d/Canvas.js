const pixelRatio = Math.max(1, Math.min(4, window.devicePixelRatio || 1));

function setCanvasSize(canvas, width, height, maxOversample) {
	const oversample = Math.max(pixelRatio, Math.min(pixelRatio * 2, maxOversample));
	const w = Math.round(width * oversample);
	const h = Math.round(height * oversample);
	canvas.width = w;
	canvas.height = h;
	canvas.style.width = width + 'px';
	canvas.style.height = height + 'px';
}

export default class Canvas {
	constructor(width, height, options = {}, {maxOversampleResolution = 0} = {}) {
		const canvas = document.createElement('canvas');
		this.maxOversample = maxOversampleResolution;
		setCanvasSize(canvas, width, height, this.maxOversample);
		this.gl = canvas.getContext('webgl', options);
		this.vp = [0, 0, this.gl.canvas.width, this.gl.canvas.height];
		this._updateGlViewport();
	}

	resize(width, height) {
		setCanvasSize(this.gl.canvas, width, height, this.maxOversample);
		this.vp = [0, 0, this.gl.canvas.width, this.gl.canvas.height];
		this._updateGlViewport();
	}

	setViewport(viewport, flipY = true) {
		const cw = this.gl.canvas.clientWidth;
		const ch = this.gl.canvas.clientHeight;
		const scaleX = this.gl.canvas.width / cw;
		const scaleY = this.gl.canvas.height / ch;
		this.vp = [
			viewport[0] * scaleX,
			(flipY ? ch - viewport[1] - viewport[3] : viewport[1]) * scaleY,
			viewport[2] * scaleX,
			viewport[3] * scaleY,
		];
		this._updateGlViewport();
	}

	setViewportRaw(viewport) {
		this.vp = viewport;
		this._updateGlViewport();
	}

	_updateGlViewport() {
		this.gl.viewport(this.vp[0], this.vp[1], this.vp[2], this.vp[3]);
	}

	bufferWidth() {
		return this.gl.drawingBufferWidth;
	}

	bufferHeight() {
		return this.gl.drawingBufferHeight;
	}

	displayWidth() {
		return this.gl.canvas.clientWidth;
	}

	displayHeight() {
		return this.gl.canvas.clientHeight;
	}

	viewportDisplayWidth() {
		return this.vp[2] * this.gl.canvas.clientWidth / this.gl.canvas.width;
	}

	viewportDisplayHeight() {
		return this.vp[3] * this.gl.canvas.clientHeight / this.gl.canvas.height;
	}

	dom() {
		return this.gl.canvas;
	}
};
