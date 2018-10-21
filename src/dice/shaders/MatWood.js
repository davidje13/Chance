export default `
	uniform lowp mat4 textureVolumeTransform;

	lowp vec3 baseColAt(in lowp vec3 pos) {
		lowp vec4 woodPos = textureVolumeTransform * vec4(pos, 1.0);
		lowp float wood = fract(length(woodPos.xy));
		return mix(vec3(0.88, 0.66, 0.48), vec3(0.86, 0.62, 0.44), wood);
	}
`;
