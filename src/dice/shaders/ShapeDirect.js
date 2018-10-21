export default `
	uniform highp vec3 eye;
	varying lowp vec3 p;
	varying lowp vec3 n;

	void main() {
		lowp vec3 pos = p;
		lowp vec3 ray = normalize(p - eye);
		lowp vec3 norm = normalize(n);

		apply(pos, norm, ray);
	}
`;
