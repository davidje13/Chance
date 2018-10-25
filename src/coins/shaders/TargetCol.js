export default `
	uniform lowp mat3 rot;

	const lowp vec3 ambientCol = vec3(0.3);
	const lowp vec3 lightCol = vec3(0.7);
	const lowp vec4 shineCol = vec4(1.0, 1.0, 0.6, 0.5);
	const lowp vec3 lightDir = vec3(0.0, 0.0, 1.0);
	const lowp vec3 shineDir = normalize(vec3(0.0, 1.0, 2.0));
	const lowp vec3 baseCol = vec3(0.82, 0.78, 0.33);

	void apply(in lowp vec3 pos, in lowp vec3 norm, in lowp vec3 ray) {
		gl_FragColor = vec4(
			mix(
				baseCol * (ambientCol + lightCol * dot(rot * norm, lightDir)),
				shineCol.rgb,
				smoothstep(0.49, 0.51, dot(rot * reflect(ray, norm), shineDir)) * shineCol.a
			),
			1.0
		);
	}
`;
