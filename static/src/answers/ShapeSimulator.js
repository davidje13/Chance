import {M4} from '../math/Matrix.js';
import {V3} from '../math/Vector.js';
import Quaternion from '../math/Quaternion.js';

// Simulate a shape which is free to move in 1 dimension and free to rotate in
// all directions, with a flat surface at z = 0

export default class ShapeSimulator {
	constructor(shapePoints, maxDepth) {
		this.shapePoints = shapePoints;
		this.maxDepth = maxDepth;
		this.ang = Quaternion.identity();
		this.vel = new V3();
		this.dep = 0;
		this.g = 0;
	}

	setDepth(d) {
		this.dep = d;
	}

	setGravity(g) {
		this.g = g;
	}

	randomise(randomSource, {
		driftSpeed = Math.PI * 0.5,
		spinSpeed = Math.PI * 0.2,
	} = {}) {
		this.ang = Quaternion.random(randomSource);
		const vdir = randomSource.nextFloat() * Math.PI * 2;
		this.vel.x = Math.sin(vdir) * driftSpeed;
		this.vel.y = Math.cos(vdir) * driftSpeed;
		this.vel.z = randomSource.nextFloat() * spinSpeed;
	}

	applyRotationImpulse(impulse) {
		this.vel.add(impulse);
	}

	step(deltaTm) {
		const gv = this.g * deltaTm;
		this.dep = Math.min(this.maxDepth, this.dep - gv);

		const rotation = Quaternion.fromAngularVelocity(V3.multScalar(this.vel, deltaTm));

		this.ang = rotation.mult(this.ang);
		this.ang.normalise(); // not required, but avoids numeric errors

		const mView = this.rotationMatrix();
		let maxZ = 0;
		let forceVelX = 0;
		let forceVelY = 0;
		for (const pt of this.shapePoints) {
			const p = mView.apply(pt);
			if (p[2] > maxZ) {
				maxZ = p[2];
			}
			const penetration = p[2] - this.dep;
			if (penetration > 0) {
				// axis of rotation is 90deg from point of collision
				forceVelX -= p[1] * penetration * 5;
				forceVelY += p[0] * penetration * 5;
			}
		}

		let friction = 0.5;
		if (this.dep <= maxZ) {
			this.dep = maxZ;
			friction = 0.7;
		}

		this.vel.multScalar(Math.pow(1 - friction, deltaTm));
		this.vel.x += forceVelX;
		this.vel.y += forceVelY;
	}

	angle() {
		return this.ang;
	}

	rotationMatrix() {
		return M4.fromQuaternion(this.ang);
	}

	depth() {
		return this.dep;
	}
};
