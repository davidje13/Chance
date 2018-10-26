export default `
	uniform lowp float opacity;

	void apply(in lowp vec3 pos, in lowp vec3 norm, in lowp vec3 ray) {
		gl_FragColor = vec4(0.0, 0.0, 0.0, opacity);
	}
`;
