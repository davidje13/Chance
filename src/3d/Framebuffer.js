export default class Framebuffer {
	constructor(gl, texture) {
		this.gl = gl;
		this.fb = gl.createFramebuffer();
		this.bind();
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.tex, 0);
		this.unbind();
	}

	bind() {
		const gl = this.gl;
		this.oldTarget = gl.getParameter(gl.FRAMEBUFFER_BINDING);
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
	}

	unbind() {
		const gl = this.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.oldTarget);
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
