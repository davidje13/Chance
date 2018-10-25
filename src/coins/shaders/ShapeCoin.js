import DepthFrag from '../../3d/DepthFrag.js';

export default DepthFrag() + `
	uniform sampler2D normalMap;
	uniform highp vec3 eye;
	uniform lowp float maxDepth;

	varying lowp vec3 p;
	varying lowp vec3 n;
	varying lowp vec2 t;
	varying lowp float thickness;

	lowp vec3 normalAt(in lowp vec2 uv) {
		return texture2D(normalMap, uv).xyz * 2.0 - 1.0;
	}

	void main() {
		lowp vec3 ray = normalize(p - eye);
		lowp float rad = length(p.xy);
		if (rad > 1.0) {
			highp float ee = dot(eye.xy, eye.xy);
			highp float er = dot(eye.xy, ray.xy);
			highp float rr = dot(ray.xy, ray.xy);
			highp float root = er * er - ee * rr + rr;
			if (root < 0.0) {
				discard;
			}
			root = sqrt(root);
			highp float l = (-er - root) / rr;
			lowp vec3 pos = eye + ray * l;
			lowp vec3 norm = vec3(pos.xy, 0.0);
			if (pos.z < -thickness || pos.z > thickness) {
				discard;
			}
			lowp float bumpHeight = max(-dot(ray, norm) * 0.8, 0.0);
			lowp float bump = atan(pos.y / pos.x) * 52.0;
			lowp vec2 bumpNorm = normalize(vec2(-sin(bump) * sign(cos(bump)) * bumpHeight, 1.0));
			norm.xy = bumpNorm.y * norm.xy + bumpNorm.x * vec2(1.0, -1.0) * norm.yx;
			apply(pos, normalize(norm), ray);
			return;
		}

		lowp vec2 uv = t;
		lowp mat3 faceD;
		faceD[2] = n;
		faceD[1] = vec3(0.0, 1.0, 0.0);
		faceD[0] = cross(faceD[2], faceD[1]);
		lowp vec3 texSpaceRay = ray * faceD;
		lowp float zmult = -1.0 / texSpaceRay.z;
		lowp vec2 duv = texSpaceRay.xy * zmult * 0.5;

		lowp vec2 dd = (step(0.0, duv) - uv) / duv;

		lowp float depthLimit = min(maxDepth, min(dd.x, dd.y));
		lowp float depth = depthAt(normalMap, uv, duv, maxDepth, depthLimit);
		lowp vec3 pos = p + ray * depth * zmult;
		uv += duv * depth;

		apply(pos, faceD * normalAt(uv), ray);
	}
`;
