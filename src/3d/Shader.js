export default class Shader {
	constructor(gl, type, source) {
		this.gl = gl;
		const shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			throw new Error('Failed to compile shader: ' + gl.getShaderInfoLog(shader));
		}
		this.compiled = shader;
		this.params = {};
	}

	shader() {
		return this.compiled;
	}
};

export class VertexShader extends Shader {
	constructor(gl, source) {
		super(gl, gl.VERTEX_SHADER, source);
	}
};

export class FragmentShader extends Shader {
	constructor(gl, source) {
		super(gl, gl.FRAGMENT_SHADER, source);
	}
};
