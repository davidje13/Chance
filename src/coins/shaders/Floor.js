export default {
	vert: `
		uniform lowp mat4 projview;
		uniform lowp float pixw;
		uniform lowp float pixh;

		attribute vec4 pos;
		attribute vec2 tex;

		varying lowp vec2 t;
		varying lowp vec2 d1;
		varying lowp vec2 d2;
		varying lowp float m0;
		varying lowp float m1;
		varying lowp float m2;

		void main() {
			gl_Position = projview * pos;
			t = tex;
			lowp vec2 pix = vec2(1.0 / pixw, 1.0 / pixh);
			d1 = vec2(2.5, 1.5) * pix;
			d2 = vec2(5.5, -1.5) * pix;
			m0 = 0.2;
			m1 = 0.15;
			m2 = 0.05;
		}
	`,
	frag: `
		uniform mediump float opacity;
		uniform sampler2D atlas;

		varying lowp vec2 t;
		varying lowp vec2 d1;
		varying lowp vec2 d2;
		varying lowp float m0;
		varying lowp float m1;
		varying lowp float m2;

		void main() {
			lowp vec2 d1b = vec2(-d1.y, d1.x);
			lowp vec2 d2b = vec2(-d2.y, d2.x);
			gl_FragColor = (
				texture2D(atlas, t) * m0 +
				(
					texture2D(atlas, t + d1) +
					texture2D(atlas, t + d1b) +
					texture2D(atlas, t - d1) +
					texture2D(atlas, t - d1b)
				) * m1 +
				(
					texture2D(atlas, t + d2) +
					texture2D(atlas, t + d2b) +
					texture2D(atlas, t - d2) +
					texture2D(atlas, t - d2b)
				) * m2
			) * opacity;
		}
	`,
};
