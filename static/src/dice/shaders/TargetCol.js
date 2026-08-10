export default `
	uniform lowp mat3 rot;

	void apply(in lowp vec3 pos, in lowp vec3 norm, in lowp vec3 ray) {
		lowp vec4 faceTex = applyFace(pos, norm, ray);
		lowp vec3 matt = faceTex.rgb + baseColAt(pos) * (1.0 - faceTex.a);
		gl_FragColor = applyLighting(matt, rot * norm, rot * reflect(ray, norm));
	}
`;
