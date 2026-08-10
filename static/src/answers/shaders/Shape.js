export default {
	vert: `
		uniform mat4 projview;

		attribute vec4 pos;
		attribute vec2 faceTex;
		attribute vec2 netTex;

		varying highp vec2 faceUV;
		varying highp vec2 netUV;
		varying lowp float dp;

		void main() {
			gl_Position = projview * pos;
			dp = gl_Position.z;
			faceUV = faceTex;
			netUV = netTex;
		}
	`,
	frag: `
		uniform lowp float bumpSteps;
		uniform lowp float bumpPos;
		uniform lowp float fogDepth;
		uniform sampler2D atlas;
		uniform sampler2D tiles;

		varying highp vec2 faceUV;
		varying highp vec2 netUV;
		varying lowp float dp;

		const lowp vec3 fog = vec3(0.0, 0.3, 0.9);
		const lowp vec3 abyss = vec3(0.0);

		void main() {
			if (dp > 0.5) {
				discard;
			}
			gl_FragColor = vec4(
				mix(
					texture2D(atlas, faceUV).xyz,
					mix(fog, abyss, max(dp, 0.0) * 2.0),
					smoothstep(dp, 0.0, fogDepth)
				),
				1.0
			) * min(texture2D(tiles, netUV).r * bumpSteps - bumpPos, 1.0);
		}
	`,
};
