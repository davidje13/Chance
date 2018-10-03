export default class ModelData {
	constructor(stride = 3) {
		this.gl = null;
		this.stride = stride;
		this.bufData = null;
		this.bufTris = null;
		this.indexCount = 0;
		this.dirtyVertices = false;
		this.dirtyIndices = false;
		this.animatingVertices = false;
		this.animatingIndices = false;
	}

	rebuildVertices() {
	}

	rebuildIndices() {
	}

	setAnimating(animating) {
		this.animatingVertices = animating;
		this.animatingIndices = animating;
	}

	setAnimatingVertices(animating) {
		this.animatingVertices = animating;
	}

	setAnimatingIndices(animating) {
		this.animatingIndices = animating;
	}

	setData(data, mode = null) {
		const gl = this.gl;
		if(mode === null) {
			mode = this.animatingVertices ? gl.STREAM_DRAW : gl.STATIC_DRAW;
		}
		if(!this.bufData) {
			this.bufData = gl.createBuffer();
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, this.bufData);
		gl.bufferData(gl.ARRAY_BUFFER, data, mode);
	}

	setIndices(tris, mode = null) {
		const gl = this.gl;
		if(mode === null) {
			mode = this.animatingIndices ? gl.STREAM_DRAW : gl.STATIC_DRAW;
		}
		if(!this.bufTris) {
			this.bufTris = gl.createBuffer();
		}
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufTris);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tris, mode);
		this.indexCount = tris.length;
	}

	bind(gl) {
		this.gl = gl;
		if(this.dirtyIndices) {
			this.rebuildIndices();
			this.dirtyIndices = false;
		}
		if(this.dirtyVertices) {
			this.rebuildVertices();
			this.dirtyVertices = false;
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, this.bufData);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufTris);
	}

	render(gl, wireframe = false) {
		if(!this.indexCount) {
			return;
		}
		gl.drawElements(
			wireframe ? gl.LINES : gl.TRIANGLES,
			this.indexCount,
			gl.UNSIGNED_SHORT,
			0
		);
	}
};
