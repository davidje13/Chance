export default `
	uniform lowp mat3 rot;
	uniform lowp float twoToneRad;
	uniform lowp float opacity;

	const lowp vec3 lightDir = vec3(0.0, 0.0, 1.0);
	const lowp vec3 shineDir = normalize(vec3(0.0, 1.0, 2.0));

	const lowp vec3 ambientCol1 = vec3(0.3);
	const lowp vec3 lightCol1 = vec3(0.7);
	const lowp vec4 shineCol1 = vec4(1.0, 1.0, 1.0, 0.5);
	const lowp vec3 baseCol1 = vec3(0.88, 0.85, 0.82);

	const lowp vec3 ambientCol2 = vec3(0.3);
	const lowp vec3 lightCol2 = vec3(0.7);
	const lowp vec4 shineCol2 = vec4(1.0, 1.0, 0.6, 0.5);
	const lowp vec3 baseCol2 = vec3(0.82, 0.78, 0.33);

	void apply(in lowp vec3 pos, in lowp vec3 norm, in lowp vec3 ray) {
		lowp float tone = step(twoToneRad * twoToneRad, dot(pos.xy, pos.xy));
		lowp vec3 ambientCol = mix(ambientCol1, ambientCol2, tone);
		lowp vec3 lightCol = mix(lightCol1, lightCol2, tone);
		lowp vec4 shineCol = mix(shineCol1, shineCol2, tone);
		lowp vec3 baseCol = mix(baseCol1, baseCol2, tone);
		gl_FragColor = vec4(
			mix(
				baseCol * (ambientCol + lightCol * dot(rot * norm, lightDir)),
				shineCol.rgb,
				smoothstep(0.49, 0.51, dot(rot * reflect(ray, norm), shineDir)) * shineCol.a
			),
			1.0
		) * opacity;
	}
`;
