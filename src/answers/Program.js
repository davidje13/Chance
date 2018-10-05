function setUniformI(gl, locn, v) {
	if(typeof v === 'number') {
		gl.uniform1i(locn, v);
	} else if(v.length === 1) {
		gl.uniform1iv(locn, v);
	} else if(v.length === 2) {
		gl.uniform2iv(locn, v);
	} else if(v.length === 3) {
		gl.uniform3iv(locn, v);
	} else if(v.length === 4) {
		gl.uniform4iv(locn, v);
	} else {
		throw new Error('Bad vector size ' + v.length);
	}
}

function setUniformF(gl, locn, v) {
	if(typeof v === 'number') {
		gl.uniform1f(locn, v);
	} else if(v.length === 1) {
		gl.uniform1fv(locn, v);
	} else if(v.length === 2) {
		gl.uniform2fv(locn, v);
	} else if(v.length === 3) {
		gl.uniform3fv(locn, v);
	} else if(v.length === 4) {
		gl.uniform4fv(locn, v);
	} else {
		throw new Error('Bad vector size ' + v.length);
	}
}

function setUniformM(gl, locn, v) {
	if(!v.length && v.data) {
		v = v.data;
	}
	if(v.length === 2 * 2) {
		gl.uniformMatrix2fv(locn, false, v);
	} else if(v.length === 3 * 3) {
		gl.uniformMatrix3fv(locn, false, v);
	} else if(v.length === 4 * 4) {
		gl.uniformMatrix4fv(locn, false, v);
	} else {
		throw new Error('Bad matrix size ' + v.length);
	}
}

function setUniform(gl, locn, v, state) {
	if(typeof v === 'number') {
		setUniformF(gl, locn, v);
	} else if(v.tex2D !== undefined) {
		let ind = v.i;
		if(ind === undefined) {
			ind = state.texIndex ++;
		}
		gl.activeTexture(gl.TEXTURE0 + ind);
		gl.bindTexture(gl.TEXTURE_2D, v.tex2D);
		gl.uniform1i(locn, ind);
	} else if(v.i !== undefined) {
		setUniformI(gl, locn, v.i);
	} else if(v.m !== undefined) {
		setUniformM(gl, locn, v.m);
	} else if(v.f !== undefined) {
		setUniformF(gl, locn, v.f);
	} else if(v.data !== undefined || v.length > 4) {
		setUniformM(gl, locn, v);
	} else if(v.length) {
		setUniformF(gl, locn, v);
	} else {
		throw new Error('Unknown value for uniform: ' + v);
	}
}

export default class Program {
	constructor(gl, shaders) {
		this.gl = gl;
		const prog = gl.createProgram();
		shaders.forEach((shader) => gl.attachShader(prog, shader.shader()));
		gl.linkProgram(prog);
		if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
			throw new Error('Failed to link program: ' + gl.getProgramInfoLog(prog));
		}
		gl.validateProgram(prog);
		if(!gl.getProgramParameter(prog, gl.VALIDATE_STATUS)) {
			throw new Error('Failed to validate program: ' + gl.getProgramInfoLog(prog));
		}
		this.prog = prog;
		this.params = {};
	}

	program() {
		return this.prog;
	}

	findUniform(name) {
		return (
			this.params[name] ||
			(this.params[name] = this.gl.getUniformLocation(this.prog, name))
		);
	}

	findAttribute(name) {
		return (
			this.params[name] ||
			(this.params[name] = this.gl.getAttribLocation(this.prog, name))
		);
	}

	uniform(map) {
		const state = {texIndex: 0};
		for(const attr of Object.keys(map)) {
			setUniform(this.gl, this.findUniform(attr), map[attr], state);
		}
	}

	use(uniforms = {}) {
		this.gl.useProgram(this.prog);
		this.uniform(uniforms);
	}

	vertexAttribPointer(map) {
		for(const attr of Object.keys(map)) {
			const locn = this.findAttribute(attr);
			const v = map[attr];
			this.gl.enableVertexAttribArray(locn);
			this.gl.vertexAttribPointer(
				locn,
				v.size,
				v.type,
				v.normalized || false,
				v.stride || 0,
				v.offset || 0
			);
		}
	}
};