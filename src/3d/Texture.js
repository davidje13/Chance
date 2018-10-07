export default class Texture {
	constructor(gl, type, params) {
		this.gl = gl;
		this.type = type;
		this.tex = gl.createTexture();
		this.bind();
		for(const pname of Object.keys(params)) {
			gl.texParameteri(type, pname, params[pname]);
		}
	}

	setSolid(r, g, b, a) {
		this.set(1, 1, {
			data: Uint8Array.from([r, g, b, a]),
		});
	}

	set(width, height, {
		channels = null,
		internalChannels = null,
		type = null,
		data = null,
		border = 0,
	} = {}) {
		const gl = this.gl;
		this.bind();
		if (channels === null) {
			channels = gl.RGBA;
		}
		if (internalChannels === null) {
			internalChannels = channels;
		}
		if (type === null) {
			type = gl.UNSIGNED_BYTE;
		}
		gl.texImage2D(
			this.type,
			0,
			internalChannels,
			width,
			height,
			border,
			channels,
			type,
			data
		);
	}

	loadImage(url, mipMap = false) {
		const gl = this.gl;

		return new Promise((accept, reject) => {
			const img = new Image();
			img.addEventListener('load', () => {
				this.bind();
				gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
				gl.texImage2D(this.type, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
				accept(this);
			});
			img.addEventListener('error', () => reject(this));
			img.src = url;
		});
	}

	bind(index = 0) {
		const gl = this.gl;

		gl.activeTexture(gl.TEXTURE0 + index);
		gl.bindTexture(this.type, this.tex);
		return {i: index};
	}
};

export class Texture2D extends Texture {
	constructor(gl, params) {
		super(gl, gl.TEXTURE_2D, params);
	}
};
