export default `
	uniform lowp mat3 rot;
	uniform highp vec3 eye;
	uniform lowp float radius;
	uniform lowp float invFaceRad;
	uniform lowp float rounding;
	varying lowp vec3 p;
	varying lowp vec3 n;

	void main() {
		lowp vec3 ray = normalize(p - eye);
		lowp float lo = -dot(ray, eye);
		lowp float root = lo * lo + radius * radius - dot(eye, eye);
		if (root < 0.0) {
			discard;
		}
		root = sqrt(root);
		highp float dSphereNear = lo - root;
		highp float dShapeNear = dot(p - eye, ray);
		mediump vec3 pos;
		if (dShapeNear > dSphereNear) {
			highp float dSphereFar = lo + root;
			if (dShapeNear > dSphereFar) {
				discard;
			}
			pos = p;
		} else {
			pos = eye + ray * dSphereNear;
			if (any(greaterThan(pos * sign(ray), vec3(1.0)))) {
				discard;
			}
		}
		lowp vec3 norm = normalize(mix(
			n,
			pos,
			smoothstep(1.0 - rounding, 1.0 + rounding, length(pos - n) * invFaceRad)
		));

		lowp vec4 faceTex = applyFace(pos, norm, ray);
		lowp vec3 matt = faceTex.rgb + baseColAt(pos) * (1.0 - faceTex.a);
		gl_FragColor = applyLighting(matt, rot * norm, rot * reflect(ray, norm));
	}
`;
