export default class Framebuffer {
	constructor(canvas, texture) {
		this.canvas = canvas;
		this.viewport = null;
		this.oldViewport = null;
		this.assumedOldTarget = null;

		const gl = canvas.gl;
		this.fb = gl.createFramebuffer();
		this.bind();
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.tex, 0);
		this.unbind();
	}

	bind({assumeSameEnv = false} = {}) {
		const gl = this.canvas.gl;
		if (assumeSameEnv && this.assumedOldTarget !== null) {
			this.oldTarget = this.assumedOldTarget;
		} else {
			this.oldTarget = gl.getParameter(gl.FRAMEBUFFER_BINDING);
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
		if (this.viewport !== null) {
			this.oldViewport = this.canvas.vp;
			this.canvas.setViewportRaw(this.viewport);
		}
		this.assumedOldTarget = this.oldTarget;
	}

	unbind() {
		const gl = this.canvas.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.oldTarget);
		if (this.oldViewport !== null) {
			this.canvas.setViewportRaw(this.oldViewport);
			this.oldViewport = null;
		}
	}

	static bestSupportedTargetPrecision(gl) {
		const extensions = gl.getSupportedExtensions();
		if (extensions.includes('WEBGL_color_buffer_float')) {
			gl.getExtension('WEBGL_color_buffer_float');
			gl.getExtension('OES_texture_float');
			return gl.FLOAT;
		}
		if (extensions.includes('EXT_color_buffer_half_float')) {
			gl.getExtension('EXT_color_buffer_half_float');
			return gl.getExtension('OES_texture_half_float').HALF_FLOAT_OES;
		}
		return gl.UNSIGNED_BYTE;
	}
};
