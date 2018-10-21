export default `
	uniform lowp mat4 projview;
	attribute vec4 pos;
	attribute vec3 norm;
	varying lowp vec3 p;
	varying lowp vec3 n;
	void main() {
		p = pos.xyz;
		n = norm;
		gl_Position = projview * pos;
	}
`;
