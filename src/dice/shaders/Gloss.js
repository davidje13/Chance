export default `
	uniform lowp vec3 ambientCol;
	uniform lowp vec3 lightCol;
	uniform lowp vec4 shineCol;

	uniform lowp vec3 lightDir;
	uniform lowp vec3 shineDir;

	lowp vec4 applyLighting(
		in lowp vec3 matt,
		in lowp vec3 norm,
		in lowp vec3 ref
	) {
		return vec4(
			mix(
				matt * (ambientCol + lightCol * dot(norm, lightDir)),
				shineCol.rgb,
				smoothstep(0.49, 0.51, dot(ref, shineDir)) * shineCol.a
			),
			1.0
		);
	}
`;
