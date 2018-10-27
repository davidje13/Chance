export default {
	needleVert: `
		uniform lowp float startAngle;
		uniform lowp float sweepAngle;
		uniform lowp vec2 centre;
		uniform lowp vec2 size;
		uniform lowp vec2 texTL;
		uniform lowp vec2 texSize;

		attribute vec3 pos;

		varying lowp vec2 t;

		const lowp vec2 invY = vec2(1.0, -1.0);

		void main() {
			lowp float angle = startAngle + pos.z * sweepAngle;
			lowp vec2 shape = (pos.xy - 0.5) * size;
			gl_Position = vec4(
				centre + cos(angle) * shape * invY - sin(angle) * shape.yx,
				0.0,
				1.0
			);
			t = texTL + pos.xy * texSize;
		}
	`,

	coverVert: `
		attribute vec4 pos;
		attribute vec2 tex;

		varying lowp vec2 t;

		void main() {
			gl_Position = pos;
			t = tex;
		}
	`,

	frag: `
		uniform mediump float opacity;
		uniform sampler2D atlas;

		varying lowp vec2 t;

		void main() {
			gl_FragColor = texture2D(atlas, t) * opacity;
		}
	`,
};
