export default `
	uniform lowp mat4 projview;

	attribute vec4 pos;

	varying lowp float side;
	varying lowp vec3 p;
	varying lowp vec2 t;
	varying lowp float thickness;

	void main() {
		side = sign(pos.z);
		p = pos.xyz;
		t = vec2(2.0 - side - pos.x * side, pos.y + 1.0) * 0.25;
		thickness = abs(pos.z);

		gl_Position = projview * pos;
	}
`;
