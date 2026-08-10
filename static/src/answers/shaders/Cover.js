export default {
	vert: `
		attribute vec4 pos;
		attribute vec2 tex;
		varying lowp vec2 t;
		void main() {
			gl_Position = pos;
			t = tex;
		}
	`,
	frag: `
		uniform sampler2D atlas;
		varying lowp vec2 t;
		void main() {
			gl_FragColor = texture2D(atlas, t);
		}
	`,
};
