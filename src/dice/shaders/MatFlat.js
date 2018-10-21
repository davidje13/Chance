export default `
	uniform lowp vec3 matt;

	lowp vec3 baseColAt(in lowp vec3 pos) {
		return matt;
	}
`;
