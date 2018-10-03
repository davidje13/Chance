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
		const gl = this.gl;
		this.bind();
		gl.texImage2D(this.type, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, Uint8Array.from([r, g, b, a]));
	}

	loadImage(url, mipMap = false) {
		const gl = this.gl;

		return new Promise((accept, reject) => {
			const img = new Image();
			img.addEventListener('load', () => {
				this.bind();
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
