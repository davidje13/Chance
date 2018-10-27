export default {
	vert: `
		uniform lowp mat4 projview;

		attribute highp vec4 pos;
		attribute lowp vec2 tex;

		varying lowp vec2 t;

		void main() {
			gl_Position = projview * pos;
			t = tex;
		}
	`,

	frag: `
		uniform sampler2D atlas;
		uniform lowp vec2 pixsize;
		uniform lowp float opacity;

		varying lowp vec2 t;

		const lowp vec4 d1raw = vec4(2.5,  1.5, -1.5, 2.5);
		const lowp vec4 d2raw = vec4(5.5, -1.5,  1.5, 5.5);

		const lowp float m0 = 0.2;
		const lowp float m1 = 0.15;
		const lowp float m2 = 0.05;

		void main() {
			lowp vec4 d1 = d1raw * pixsize.xyxy;
			lowp vec4 d2 = d2raw * pixsize.xyxy;

			gl_FragColor = (
				texture2D(atlas, t) * m0 +
				(
					texture2D(atlas, t + d1.xy) +
					texture2D(atlas, t + d1.zw) +
					texture2D(atlas, t - d1.xy) +
					texture2D(atlas, t - d1.zw)
				) * m1 +
				(
					texture2D(atlas, t + d2.xy) +
					texture2D(atlas, t + d2.zw) +
					texture2D(atlas, t - d2.xy) +
					texture2D(atlas, t - d2.zw)
				) * m2
			) * opacity;
		}
	`,
};
