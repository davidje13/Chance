import DepthFrag from '../../3d/DepthFrag.js';

export default DepthFrag() + `
	uniform sampler2D atlas;
	uniform sampler2D normalMap;
	uniform lowp vec2 normalMapSize; // textureSize(normalMap)
	uniform lowp float dotOpacity;
	uniform lowp float maxDepth;
	uniform lowp vec2 uvOrigin;

	const lowp vec2 regionSize = vec2(0.25, 0.25);

	lowp vec3 normalAt(in lowp vec2 uv, in lowp vec3 displaySize, in lowp vec2 textureRegion) {
		lowp vec3 scale = displaySize.yzx * displaySize.zxy; // 1.0 / displaySize
		scale.xy *= textureRegion * normalMapSize * 0.5; // 0.5 = 1 / scale set by Texture.depthToNormals
		return normalize(vec3(texture2D(normalMap, uv).xy - (128.0 / 255.0), 1.0) * scale);
	}

	lowp vec3 faceNormalAt(in lowp vec2 uv) {
		return normalAt(uv, vec3(2.0, 2.0, maxDepth), vec2(0.25, 0.25));
	}

	lowp vec4 colourAt(in lowp vec2 uv) {
		return texture2D(atlas, uv);
	}

	lowp vec4 getCubeUV(in lowp vec3 pos, out lowp mat3 faceD) {
		lowp vec2 region;
		lowp vec3 pp = abs(pos);
		if (pp.x > pp.y && pp.x > pp.z) {
			region = vec2(2.0, pos.x);
			faceD[0] = vec3(0.0, -1.0, 0.0);
			faceD[1] = vec3(0.0, 0.0, sign(pos.x));
		} else if (pp.y > pp.z) {
			region = vec2(1.0, pos.y);
			faceD[0] = vec3(0.0, 0.0, -1.0);
			faceD[1] = vec3(sign(pos.y), 0.0, 0.0);
		} else {
			region = vec2(0.0, pos.z);
			faceD[0] = vec3(-1.0, 0.0, 0.0);
			faceD[1] = vec3(0.0, sign(pos.z), 0.0);
		}
		faceD[2] = cross(faceD[1], faceD[0]);
		region.y = step(0.0, region.y);
		lowp vec2 segmentUV = (pos * faceD).xy * 0.5 + 0.5;
		return vec4((region + segmentUV) * regionSize, segmentUV);
	}

	lowp vec4 applyFace(inout lowp vec3 pos, inout lowp vec3 norm, in lowp vec3 ray) {
		lowp mat3 faceD;
		lowp vec4 uv = getCubeUV(pos, faceD);
		uv.xy += uvOrigin;
		lowp vec3 texSpaceRay = ray * faceD;
		lowp float zmult = -1.0 / texSpaceRay.z;
		lowp vec2 duv = texSpaceRay.xy * zmult * 0.5;

		lowp vec2 dd = (step(0.0, duv) - uv.zw) / duv;
		duv *= regionSize;

		lowp float depthLimit = min(maxDepth, min(dd.x, dd.y));
		lowp float depth = depthAt(normalMap, uv.xy, duv, maxDepth, depthLimit);
		pos += ray * depth * zmult;
		uv.xy += duv * depth;

		faceD[2] = norm;
		norm = faceD * faceNormalAt(uv.xy);

		return colourAt(uv.xy) * dotOpacity;
	}
`;
