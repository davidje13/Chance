export default `
	uniform lowp mat4 textureVolumeTransform;

	const lowp vec3 col1 = vec3(0.88, 0.66, 0.48);
	const lowp vec3 col2 = vec3(0.86, 0.62, 0.44);

	lowp vec3 baseColAt(in lowp vec3 pos) {
		lowp vec4 woodPos = textureVolumeTransform * vec4(pos, 1.0);
		lowp float wood = fract(length(woodPos.xy));
		return mix(col1, col2, wood);
	}
`;
