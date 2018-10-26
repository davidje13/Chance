import DepthFrag from '../../3d/DepthFrag.js';

const SHAPE_FRAG = `
	uniform sampler2D normalMap;

	varying lowp float thickness;

	const lowp float pi2 = 3.14159265359 * 2.0;

	lowp vec2 edgeUvAt(in lowp vec3 pos) {
		return vec2(
			0.5 - atan(pos.y, pos.x) / pi2,
			(pos.z * 0.5 / thickness + 0.5) * 0.0625 + 0.53125
		);
	}

	lowp float edgeDepthAt(in lowp vec3 pos) {
		return texture2D(normalMap, edgeUvAt(pos)).w;
	}

	lowp vec3 edgeNormalAt(in lowp vec3 pos) {
		return texture2D(normalMap, edgeUvAt(pos)).xyz * 2.0 - 1.0;
	}

	lowp vec3 normalAt(in lowp vec2 uv) {
		return texture2D(normalMap, uv).xyz * 2.0 - 1.0;
	}
`;

const EDGE_SHAPE_FRAG = `
	lowp float edgePenetrationAt(in highp vec3 pos) {
		return 1.0 - length(pos.xy);
	}

	lowp vec3 rotatedEdgeNormalAt(in lowp vec3 pos) {
		lowp mat3 faceD;
		faceD[2] = vec3(normalize(pos.xy), 0.0);
		faceD[1] = vec3(0.0, 0.0, 1.0);
		faceD[0] = cross(faceD[2], faceD[1]);

		return faceD * edgeNormalAt(pos);
	}
`;

const EdgeBoundaryFrag = ({layerSteps = 6, binarySearchSteps = 3} = {}) => `
	lowp float edgeBoundryAt(
		in highp vec3 pos,
		in highp vec3 dpos,
		in lowp float maxDepth
	) {
		lowp float lastD = 0.0;
		lowp float nextD = 1.0;
		lowp float lastP = 0.0;
		lowp float nextP = 0.0;
		lowp float stepP = ${(1 / layerSteps).toFixed(6)};

		// layer search
		for (lowp int i = 0; i < ${layerSteps}; ++ i) {
			highp vec3 p = pos + dpos * nextP;
			lowp float curD = edgeDepthAt(p) * maxDepth;
			if (curD <= edgePenetrationAt(p)) {
				nextD = curD;
				break;
			}
			lastD = curD;
			lastP = nextP;
			nextP += stepP;
		}
		if (nextP == lastP) {
			return lastP;
		}

		// binary search
		for (lowp int i = 0; i < ${binarySearchSteps}; ++ i) {
			lowp float curP = (lastP + nextP) * 0.5;
			highp vec3 p = pos + dpos * curP;
			lowp float curD = edgeDepthAt(p) * maxDepth;
			if (curD <= edgePenetrationAt(p)) {
				nextP = curP;
				nextD = curD;
			} else {
				lastP = curP;
				lastD = curD;
			}
		}
		if (nextD == 1.0) {
			return 1.0;
		}

		return lastP;
	}
`;

export default DepthFrag({layerSteps: 8}) + SHAPE_FRAG + EDGE_SHAPE_FRAG + EdgeBoundaryFrag() + `
	uniform highp vec3 eye;
	uniform lowp float maxDepth;

	varying lowp vec3 p;
	varying lowp vec3 n;
	varying lowp vec2 t;

	void main() {
		lowp vec3 ray = normalize(p - eye);
		lowp float edgeInnerRad = 1.0 - maxDepth;
		if (dot(p.xy, p.xy) > edgeInnerRad * edgeInnerRad) {
			highp float ee = dot(eye.xy, eye.xy);
			highp float er = dot(eye.xy, ray.xy);
			highp float rr = dot(ray.xy, ray.xy);
			highp float root = er * er - ee * rr + rr;
			if (root < 0.0) {
				discard;
			}
			lowp float dir = sign(dot(p.xy, ray.xy));
			root = sqrt(root) * dir;
			highp float l = (root - er) / rr;
			highp vec3 pos = eye + ray * l;

			highp vec3 cap;
			bool clipped = true;
			if (dir < 0.0) {
				// front face (trace from pos to back face)
				highp float capL = (-root - er) / rr;

				ee = dot(eye.xy, eye.xy);
				er = dot(eye.xy, ray.xy);
				rr = dot(ray.xy, ray.xy);
				root = er * er - ee * rr + edgeInnerRad * edgeInnerRad * rr;
				if (root > 0.0) {
					capL = (-sqrt(root) - er) / rr;
					clipped = false;
				}
				cap = eye + ray * capL;

				if (dot(p - pos, ray) > 0.0) {
					pos = p;
				}
			} else {
				// back face (trace from p to pos)
				if (dot(p.xy, p.xy) > 1.0) {
					discard;
				}
				cap = pos;
				pos = p;
			}
			if (cap.z * sign(ray.z) > thickness) {
				cap = pos + (thickness * sign(ray.z) - pos.z) * ray / ray.z;
				clipped = true;
			}

			lowp float d = edgeBoundryAt(pos, cap - pos, maxDepth);
			if (clipped && d == 1.0) {
				discard;
			}
			pos += (cap - pos) * d;

			lowp float compare = pos.z * sign(ray.z);
			if (compare > thickness) {
				discard;
			} else if (compare > -thickness) {
				apply(pos, rotatedEdgeNormalAt(pos), ray);
				return;
			}
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
		lowp vec3 pos = p + ray * depth * zmult * 2.0;
		uv += duv * depth;

		apply(pos, faceD * normalAt(uv), ray);
	}
`;
