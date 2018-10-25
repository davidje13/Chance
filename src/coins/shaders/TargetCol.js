export default `
	uniform lowp mat3 rot;
	uniform lowp float twoToneRad;

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
		lowp vec3 ambientCol;
		lowp vec3 lightCol;
		lowp vec4 shineCol;
		lowp vec3 baseCol;
		if (dot(pos.xy, pos.xy) < twoToneRad * twoToneRad) {
			ambientCol = ambientCol1;
			lightCol = lightCol1;
			shineCol = shineCol1;
			baseCol = baseCol1;
		} else {
			ambientCol = ambientCol2;
			lightCol = lightCol2;
			shineCol = shineCol2;
			baseCol = baseCol2;
		}
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
