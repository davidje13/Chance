import DepthFrag from '../../3d/DepthFrag.js';

const SHAPE_FRAG = `
	uniform sampler2D normalMap;
	uniform lowp vec2 normalMapSize; // textureSize(normalMap)

	varying lowp float thickness;

	const lowp float ipi2 = -0.5 / 3.14159265359;
	const lowp float edgeStart = 0.75;

	lowp vec2 edgeUvAt(in lowp vec3 pos) {
		return vec2(
			edgeStart + atan(pos.y, pos.x) * ipi2,
			pos.z / thickness * 0.03125 + 0.5625
		);
	}

	lowp float edgeDepthAt(in lowp vec3 pos) {
		return texture2D(normalMap, edgeUvAt(pos)).w;
	}

	lowp vec3 normalAt(in lowp vec2 uv, in lowp vec3 displaySize, in lowp vec2 textureRegion) {
		lowp vec3 scale = displaySize.yzx * displaySize.zxy; // 1.0 / displaySize
		scale.xy *= textureRegion * normalMapSize * 0.5; // 0.5 = 1 / scale set by Texture.depthToNormals
		return normalize(vec3(texture2D(normalMap, uv).xy - (128.0 / 255.0), 1.0) * scale);
	}

	lowp vec3 edgeNormalAt(in lowp vec3 pos, in lowp vec3 displaySize) {
		return normalAt(edgeUvAt(pos), displaySize, vec2(1.0, 0.0625));
	}

	lowp vec3 faceNormalAt(in lowp vec2 uv, in lowp vec3 displaySize) {
		return normalAt(uv, displaySize, vec2(0.5, 0.5));
	}
`;

const EDGE_SHAPE_FRAG = `
	lowp float edgePenetrationAt(in highp vec3 pos) {
		return 1.0 - length(pos.xy);
	}

	lowp vec3 rotatedEdgeNormalAt(in lowp vec3 pos, in lowp vec3 displaySize) {
		lowp mat3 faceD;
		faceD[2] = vec3(normalize(pos.xy), 0.0);
		faceD[1] = vec3(0.0, 0.0, 1.0);
		faceD[0] = cross(faceD[2], faceD[1]);

		return faceD * edgeNormalAt(pos, displaySize);
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
	uniform lowp float edgeMaxDepth;
	uniform lowp float punchRad;

	varying lowp float side;
	varying lowp vec3 p;
	varying lowp vec2 t;

	const lowp float pi2 = 3.14159265359 * 2.0;

	void applyFlatFace(in lowp vec3 ray, in lowp float depthLimit) {
		lowp vec3 faceD = vec3(-side, 1.0, side);
		lowp vec3 texSpaceRay = ray * faceD;
		lowp float zmult = -1.0 / texSpaceRay.z;
		lowp vec2 duv = texSpaceRay.xy * zmult * 0.25;

		lowp float depth = depthAt(normalMap, t, duv, maxDepth, min(maxDepth, depthLimit));
		lowp vec3 pos = p + ray * depth * zmult;

		lowp vec3 faceDisplaySize = vec3(2.0, 2.0, maxDepth);
		apply(pos, faceD * faceNormalAt(t + duv * depth, faceDisplaySize), ray);
	}

	void main() {
		lowp vec3 gaze = normalize(p - eye);
		lowp float edgeInnerRad = 1.0 - edgeMaxDepth;
		lowp float edgeInnerRad2 = edgeInnerRad * edgeInnerRad;
		lowp float surfaceRadius2 = dot(p.xy, p.xy);

		lowp vec3 ray2d = gaze * inversesqrt(dot(gaze.xy, gaze.xy));
		lowp float rayzdir = sign(ray2d.z);
		highp float er = dot(p.xy, ray2d.xy);
		highp float root = er * er - surfaceRadius2;

		if (surfaceRadius2 > edgeInnerRad2) {
			if (root < -1.0) {
				discard;
			}
			lowp float dir = sign(dot(p.xy, ray2d.xy));
			highp float capL = sqrt(root + 1.0) * dir;
			highp vec3 pos = p + ray2d * (capL - er);

			highp vec3 cap;
			bool clipped = true;
			if (dir < 0.0) {
				// front face (trace from pos to back face)
				if (root > -edgeInnerRad2) {
					capL = sqrt(root + edgeInnerRad2);
					clipped = false;
				}
				cap = p - ray2d * (capL + er);

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

			lowp float d = edgeBoundryAt(pos, cap - pos, edgeMaxDepth);
			if (clipped && d == 1.0) {
				discard;
			}
			pos += (cap - pos) * d;

			lowp float compare = pos.z * rayzdir;
			if (compare > -thickness) {
				if (compare > thickness) {
					discard;
				}
				lowp vec3 edgeDisplaySize = vec3(pi2, thickness * 2.0, edgeMaxDepth);
				apply(pos, rotatedEdgeNormalAt(pos, edgeDisplaySize), gaze);
				return;
			}
		} else if (surfaceRadius2 < punchRad * punchRad) {
			highp vec3 pos = p + ray2d * (sqrt(root + punchRad * punchRad) - er);
			if (pos.z * rayzdir > thickness) {
				discard;
			}
			apply(pos, vec3(-pos.xy, 0.0) / punchRad, gaze);
			return;
		}

		applyFlatFace(
			gaze,
			ray2d.z * rayzdir * (sqrt(root + 1.0) - er)
		);
	}
`;
