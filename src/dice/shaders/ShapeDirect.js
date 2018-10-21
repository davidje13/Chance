export default `
	uniform lowp mat3 rot;
	uniform highp vec3 eye;
	varying lowp vec3 p;
	varying lowp vec3 n;

	void main() {
		lowp vec3 pos = p;
		lowp vec3 ray = normalize(p - eye);
		lowp vec3 norm = normalize(n);

		lowp vec4 faceTex = applyFace(pos, norm, ray);
		lowp vec3 matt = faceTex.rgb + baseColAt(pos) * (1.0 - faceTex.a);
		gl_FragColor = applyLighting(matt, rot * norm, rot * reflect(ray, norm));
	}
`;
