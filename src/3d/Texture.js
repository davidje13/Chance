function loadImage(url) {
	return new Promise((accept, reject) => {
		const img = new Image();
		img.addEventListener('load', () => accept(img));
		img.addEventListener('error', reject);
		img.src = url;
	});
}

function imageToData(img) {
	const w = img.width;
	const h = img.height;
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d');
	ctx.drawImage(img, 0, 0);
	return ctx.getImageData(0, 0, w, h);
}

function createImageData(w, h) {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	return ctx.createImageData(w, h);
}

function lumToAlpha(data) {
	const w = data.width;
	const h = data.height;
	const d = data.data;

	for (let i = 0; i < w * h; ++ i) {
		d[i * 4 + 3] = 255 - d[i * 4];
	}

	return data;
}

function depthToNormals(data, channelX, channelY) {
	const w = data.width;
	const h = data.height;
	const d = data.data;

	const gradientScale = 2.0;

	for (let y = 0; y < h; ++ y) {
		const pN0 = ((y + h - 1) % h) * w;
		const pC0 = y * w;
		const pS0 = ((y + 1) % h) * w;
		for (let x = 0; x < w; ++ x) {
			const xE = (x + 1) % w;
			const xW = (x + w - 1) % w;

			const dN  = d[(pN0 + x ) * 4 + 3];
			const dE  = d[(pC0 + xE) * 4 + 3];
			const dS  = d[(pS0 + x ) * 4 + 3];
			const dW  = d[(pC0 + xW) * 4 + 3];
			const dNE = d[(pN0 + xE) * 4 + 3];
			const dNW = d[(pN0 + xW) * 4 + 3];
			const dSE = d[(pS0 + xE) * 4 + 3];
			const dSW = d[(pS0 + xW) * 4 + 3];

			const dx = (dE - dW) * 2 + dNE - dNW + dSE - dSW;
			const dy = (dS - dN) * 2 + dSE - dNE + dSW - dNW;
			const p = (pC0 + x) * 4;
			d[p + channelX] = dx * gradientScale / 8 + 128;
			d[p + channelY] = dy * gradientScale / 8 + 128;
		}
	}

	return data;
}

function depthToOcclusion(data, channel) {
	const w = data.width;
	const h = data.height;
	const d = data.data;

	const occScale = 2.0;
	const spread = 2;

	for (let y = 0; y < h; ++ y) {
		const pN0 = ((y + h - spread) % h) * w;
		const pC0 = y * w;
		const pS0 = ((y + spread) % h) * w;
		for (let x = 0; x < w; ++ x) {
			const xE = (x + spread) % w;
			const xW = (x + w - spread) % w;

			const d0  = d[(pC0 + x ) * 4 + 3];
			const dN  = d[(pN0 + x ) * 4 + 3];
			const dE  = d[(pC0 + xE) * 4 + 3];
			const dS  = d[(pS0 + x ) * 4 + 3];
			const dW  = d[(pC0 + xW) * 4 + 3];
			const dNE = d[(pN0 + xE) * 4 + 3];
			const dNW = d[(pN0 + xW) * 4 + 3];
			const dSE = d[(pS0 + xE) * 4 + 3];
			const dSW = d[(pS0 + xW) * 4 + 3];

			const occ = d0 - ((dN + dE + dS + dW) * 2 + dNE + dNW + dSE + dSW) / 12;

			d[(pC0 + x) * 4 + channel] = Math.floor(occ * occScale);
		}
	}

	return data;
}

function blurChannel(data, channel) {
	const w = data.width;
	const h = data.height;
	const d = data.data;

	const input = new Uint8Array(w * h);

	for (let i = 0; i < w * h; ++ i) {
		input[i] = d[i * 4 + channel];
	}
	for (let y = 0; y < h; ++ y) {
		const pN0 = ((y + h - 1) % h) * w;
		const pC0 = y * w;
		const pS0 = ((y + 1) % h) * w;
		for (let x = 0; x < w; ++ x) {
			const xE = (x + 1) % w;
			const xW = (x + w - 1) % w;

			const d0  = input[pC0 + x ];
			const dN  = input[pN0 + x ];
			const dE  = input[pC0 + xE];
			const dS  = input[pS0 + x ];
			const dW  = input[pC0 + xW];
			const dNE = input[pN0 + xE];
			const dNW = input[pN0 + xW];
			const dSE = input[pS0 + xE];
			const dSW = input[pS0 + xW];

			const v = (
				d0 * 0.5 +
				(dN + dE + dS + dW) * 0.075 +
				(dNE + dNW + dSE + dSW) * 0.05
			);
			d[(pC0 + x) * 4 + channel] = Math.round(v);
		}
	}

	return data;
}

function premultiply(data) {
	const n = data.width * data.height;
	const d = data.data;

	for (let i = 0; i < n; ++ i) {
		const p = i * 4;
		const a = d[p + 3];
		if (a === 0) {
			d[p    ] = 0;
			d[p + 1] = 0;
			d[p + 2] = 0;
		} else if (a !== 255) {
			d[p    ] = (d[p    ] * a) / 255;
			d[p + 1] = (d[p + 1] * a) / 255;
			d[p + 2] = (d[p + 2] * a) / 255;
		}
	}

	return data;
}

function downsampleData(data) {
	const w = data.width;
	const w2 = Math.floor(data.width / 2);
	const h2 = Math.floor(data.height / 2);
	const d2 = createImageData(w2, h2);
	const d = data.data;
	const w4 = w * 4;

	for (let y = 0; y < h2; ++ y) {
		for (let x = 0; x < w2; ++ x) {
			const p = (y * w + x) * 8;
			const p2 = (y * w2 + x) * 4;
			for (let c = 0; c < 4; ++ c) {
				d2.data[p2 + c] = (
					d[p + c] +
					d[p + c + 4] +
					d[p + c + w4] +
					d[p + c + w4 + 4]
				) * 0.25;
			}
		}
	}

	return d2;
}

function scaleDownsampledNormalMap(data) {
	const n = data.width * data.height;
	const d = data.data;

	for (let i = 0; i < n; ++ i) {
		const p = i * 4;
		d[p    ] = ((d[p    ] - 128) * 2) + 128;
		d[p + 1] = ((d[p + 1] - 128) * 2) + 128;
	}

	return data;
}

export default class Texture {
	constructor(gl, type, params = {}) {
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
			data: Uint8Array.from([r * 255, g * 255, b * 255, a * 255]),
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

	generateMipmap() {
		this.bind();
		gl.generateMipmap(this.type);
	}

	_uploadData(data, {premultiplyAlpha = true}) {
		const gl = this.gl;
		this.bind();
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiplyAlpha);
		gl.texImage2D(this.type, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
		return {texture: this, width: data.width, height: data.height};
	}

	loadImage(url, {
		premultiplyAlpha = true,
		downsample = false,
	} = {}) {
		if (downsample) {
			return loadImage(url)
				.then(imageToData)
				.then((data) => premultiplyAlpha ? premultiply(data) : data)
				.then((data) => downsample ? downsampleData(data) : data)
				.then((data) => this._uploadData(data, {premultiplyAlpha: false}));
		} else {
			return loadImage(url)
				.then((img) => this._uploadData(img, {premultiplyAlpha}));
		}
	}

	generateNormalMap(url, {downsample = false} = {}) {
		return loadImage(url)
			.then(imageToData)
			.then((data) => lumToAlpha(data))
			.then((data) => depthToNormals(data, 0, 1))
			.then((data) => downsample ? scaleDownsampledNormalMap(downsampleData(data)) : data)
			.then((data) => this._uploadData(data, {premultiplyAlpha: false}));
	}

	convertNormalMap(data, {downsample = false} = {}) {
		return Promise.resolve(data)
			.then((data) => lumToAlpha(data))
			.then((data) => depthToNormals(data, 0, 1))
			.then((data) => downsample ? scaleDownsampledNormalMap(downsampleData(data)) : data)
			.then((data) => this._uploadData(data, {premultiplyAlpha: false}));
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
