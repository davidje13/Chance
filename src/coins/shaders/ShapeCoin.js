import DepthFrag from '../../3d/DepthFrag.js';

const SHAPE_FRAG = `
	uniform sampler2D normalMap;

	varying lowp float thickness;

	const lowp float ipi2 = -0.5 / 3.14159265359;

	lowp vec2 edgeUvAt(in lowp vec3 pos) {
		return vec2(
			0.5 + atan(pos.y, pos.x) * ipi2,
			pos.z / thickness * 0.03125 + 0.5625
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
	uniform lowp float punchRad;

	varying lowp float side;
	varying lowp vec3 p;
	varying lowp vec2 t;

	void applyFlatFace(in lowp vec3 ray) {
		lowp vec3 faceD = vec3(-side, 1.0, side);
		lowp vec3 texSpaceRay = ray * faceD;
		lowp float zmult = -1.0 / texSpaceRay.z;
		lowp vec2 duv = texSpaceRay.xy * zmult * 0.5;

		lowp vec2 dd = (step(0.0, duv) - t) / duv;

		lowp float depthLimit = min(maxDepth, min(dd.x, dd.y));
		lowp float depth = depthAt(normalMap, t, duv, maxDepth, depthLimit);
		lowp vec3 pos = p + ray * depth * zmult * 2.0;

		apply(pos, faceD * normalAt(t + duv * depth), ray);
	}

	void main() {
		highp vec3 gaze = p - eye;
		lowp float edgeInnerRad = 1.0 - maxDepth;
		lowp float surfaceRadius2 = dot(p.xy, p.xy);

		lowp vec3 ray2d = gaze / length(gaze.xy);
		lowp float rayzdir = sign(ray2d.z);
		highp float ee = dot(eye.xy, eye.xy);
		highp float er = dot(eye.xy, ray2d.xy);
		highp float root = er * er - ee;

		if (surfaceRadius2 > edgeInnerRad * edgeInnerRad) {
			if (root < -1.0) {
				discard;
			}
			lowp float dir = sign(dot(p.xy, ray2d.xy));
			root = sqrt(root + 1.0) * dir;
			highp vec3 pos = eye + ray2d * (root - er);

			highp vec3 cap;
			bool clipped = true;
			if (dir < 0.0) {
				// front face (trace from pos to back face)
				highp float capL = root;

				root = er * er - ee + edgeInnerRad * edgeInnerRad;
				if (root > 0.0) {
					capL = sqrt(root);
					clipped = false;
				}
				cap = eye - ray2d * (capL + er);

				if (dot(p - pos, ray2d) > 0.0) {
					pos = p;
				}
			} else {
				// back face (trace from p to pos)
				if (surfaceRadius2 > 1.0) {
					discard;
				}
				cap = pos;
				pos = p;
			}
			if (cap.z * rayzdir > thickness) {
				cap = pos + (thickness * rayzdir - pos.z) * ray2d / ray2d.z;
				clipped = true;
			}

			lowp float d = edgeBoundryAt(pos, cap - pos, maxDepth);
			if (clipped && d == 1.0) {
				discard;
			}
			pos += (cap - pos) * d;

			lowp float compare = pos.z * rayzdir;
			if (compare > -thickness) {
				if (compare > thickness) {
					discard;
				}
				apply(pos, rotatedEdgeNormalAt(pos), normalize(gaze));
				return;
			}
		} else if (surfaceRadius2 < punchRad * punchRad) {
			highp vec3 pos = eye + ray2d * (sqrt(root + punchRad * punchRad) - er);
			if (pos.z * rayzdir > thickness) {
				discard;
			}
			apply(pos, vec3(-pos.xy, 0.0) / punchRad, normalize(gaze));
			return;
		}

		applyFlatFace(normalize(gaze));
	}
`;
