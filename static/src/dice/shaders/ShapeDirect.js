export default `
	uniform highp vec3 eye;

	varying lowp vec3 p;
	varying lowp vec3 n;

	void main() {
		apply(p, normalize(n), normalize(p - eye));
	}
`;
