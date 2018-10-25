export default `
	uniform lowp mat4 projview;

	attribute vec4 pos;

	varying lowp vec3 p;
	varying lowp vec3 n;
	varying lowp vec2 t;
	varying lowp float thickness;

	void main() {
		p = pos.xyz;
		n = vec3(0.0, 0.0, sign(p.z));
		if (p.z > 0.0) {
			t = vec2(-p.x, p.y) * 0.25 + vec2(0.25, 0.25);
		} else {
			t = p.xy * 0.25 + vec2(0.75, 0.25);
		}
		thickness = abs(pos.z);
		gl_Position = projview * pos;
	}
`;
