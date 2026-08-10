export default ({layerSteps = 4, binarySearchSteps = 2, linearInterpolation = true} = {}) => `
	lowp float intersectionX(lowp float x1, lowp float x2, lowp float y1, lowp float y2) {
		// returns intersection with line y = x
		return (x2 * y1 - x1 * y2) / (x2 - x1 + y1 - y2);
	}

	lowp float depthAt(
		in sampler2D normalMap,
		in lowp vec2 uv,
		in lowp vec2 duv,
		in lowp float maxDepth,
		in lowp float depthLimit
	) {
		// thanks, http://apoorvaj.io/exploring-bump-mapping-with-webgl.html
		lowp float lastD = 0.0;
		lowp float nextD = depthLimit;
		lowp float lastDPos = 0.0;
		lowp float nextDPos = 0.0;
		lowp float depthScale = depthLimit * ${(1 / layerSteps).toFixed(6)};

		// layer search
		for (lowp int i = 0; i < ${layerSteps}; ++ i) {
			lowp float curD = texture2D(normalMap, uv + duv * nextDPos).w * maxDepth;
			if (curD <= nextDPos) {
				nextD = curD;
				break;
			}
			lastD = curD;
			lastDPos = nextDPos;
			nextDPos += depthScale;
		}
		if (nextDPos == lastDPos) {
			return lastDPos;
		}

		// binary search
		for (lowp int i = 0; i < ${binarySearchSteps}; ++ i) {
			lowp float curDPos = (lastDPos + nextDPos) * 0.5;
			lowp float curD = texture2D(normalMap, uv + duv * curDPos).w * maxDepth;
			if (curD <= curDPos) {
				nextDPos = curDPos;
				nextD = curD;
			} else {
				lastDPos = curDPos;
				lastD = curD;
			}
		}

		// linear interpolation
		return ${linearInterpolation ? 'intersectionX(lastDPos, nextDPos, lastD, nextD)' : 'lastDPos'};
	}
`;
