import {M4} from '../math/Matrix.js';
import {V3} from '../math/Vector.js';
import Quaternion from '../math/Quaternion.js';
import {load} from '../libs/GoblinWrapper.js';

const MOTION_THRESH = 0.01;
const ROTATION_THRESH = 0.1;
const INACTIVITY_THRESH_SECONDS = 0.5;
const DICE_BOX_RAD = 1.05;
const DICE_REAL_RAD = 1;
const STACK_IMPULSE_DELAY_SECONDS = 3;
const ZERO = {x: 0, y: 0, z: 0};

export default class DiceSimulator {
	constructor(shapePoints, maxDepth) {
		this.dice = [];
		this.region = {width: 0, height: 0, depth: 0};
		this.firing = false;
		this.fireDone = null;

		this.dirty = true;
		this.goblin = null;

		this.active = true;
		this.inactivity = 0;
		this.timeToImpulse = 0;

		load().then((lib) => {
			this.goblin = lib;
		});
	}

	setRegion(region) {
		this.region = region;
		this.dirty = true;
	}

	clearDice() {
		this.dice.length = 0;
		this.dirty = true;
	}

	addDie({style}) {
		this.dice.push({
			position: {x: 0, y: 0, z: 0},
			velocity: {x: 0, y: 0, z: 0},
			style,
			rotation: Quaternion.identity(),
			rvel: {x: 0, y: 0, z: 0},
			physical: null,
		});
		this.dirty = true;
	}

	fireOffscreen() {
		for (const die of this.dice) {
			const d = Math.sqrt(die.position.x * die.position.x + die.position.y * die.position.y);
			if (d < 0.1) {
				die.velocity.x = 10;
				die.velocity.y = 0;
			} else {
				die.velocity.x = die.position.x / d * 20;
				die.velocity.y = die.position.y / d * 20;
			}
			die.velocity.z = 50;
		}
		this.dirty = true;
		this.firing = true;
		return new Promise((resolve) => {
			this.fireDone = resolve;
		});
	}

	randomise(randomSource) {
		for (const die of this.dice) {
			die.position.x = (randomSource.nextFloat() - 0.5) * (this.region.width - 3);
			die.position.y = (randomSource.nextFloat() - 0.5) * (this.region.height - 3);
			die.position.z = 0;

			// avoid obscuring camera
			const d2 = V3.dist2(die.position, ZERO);
			if (d2 < 0.1 * 0.1) {
				die.position.x += 2;
			} else if (d2 < 2 * 2) {
				const m = 2 / Math.sqrt(d2);
				die.position.x *= m;
				die.position.y *= m;
			}

			die.velocity.x = (randomSource.nextFloat() - 0.5) * 100.0;
			die.velocity.y = (randomSource.nextFloat() - 0.5) * 100.0;
			die.velocity.z = randomSource.nextFloat() * -20.0;
			die.rotation = Quaternion.random(randomSource);
			die.rvel.x = (randomSource.nextFloat() - 0.5) * 4.0;
			die.rvel.y = (randomSource.nextFloat() - 0.5) * 4.0;
			die.rvel.z = (randomSource.nextFloat() - 0.5) * 4.0;
		}
		this.dirty = true;
		this.firing = false;
		this.fireDone = null;
	}

	buildSimulation() {
		this.dirty = false;
		const Goblin = this.goblin;
		const w = this.region.width;
		const h = this.region.height;
		const d = this.region.depth + DICE_BOX_RAD - DICE_REAL_RAD;
		const thickness = 100;

		// removeRigidBody does not seem to remove all state,
		// so destroy the world each time

		this.world = new Goblin.World(
			new Goblin.SAPBroadphase(),
			new Goblin.NarrowPhase(),
			new Goblin.IterativeSolver()
		);

		this.floor = new Goblin.RigidBody(
			new Goblin.BoxShape(w, h, thickness),
			0
		);
		this.floor.position.z = -d - thickness;
		this.floor.friction = 1.0;
		this.world.addRigidBody(this.floor);

		this.wallLeft = new Goblin.RigidBody(
			new Goblin.BoxShape(thickness, h, d),
			0
		);
		this.wallLeft.position.x = -w * 0.5 - thickness;
		this.wallLeft.friction = 0.0;
		this.world.addRigidBody(this.wallLeft);

		this.wallRight = new Goblin.RigidBody(
			new Goblin.BoxShape(thickness, h, d),
			0
		);
		this.wallRight.position.x = w * 0.5 + thickness;
		this.wallRight.friction = 0.0;
		this.world.addRigidBody(this.wallRight);

		this.wallTop = new Goblin.RigidBody(
			new Goblin.BoxShape(w, thickness, d),
			0
		);
		this.wallTop.position.y = h * 0.5 + thickness;
		this.wallTop.friction = 0.0;
		this.world.addRigidBody(this.wallTop);

		this.wallBottom = new Goblin.RigidBody(
			new Goblin.BoxShape(w, thickness, d),
			0
		);
		this.wallBottom.position.y = -h * 0.5 - thickness;
		this.wallBottom.friction = 0.0;
		this.world.addRigidBody(this.wallBottom);

		this.cameraBubble = new Goblin.RigidBody(
			new Goblin.SphereShape(2.0),
			0
		);
		this.cameraBubble.position.z = -1;
		this.cameraBubble.friction = 0.0;
		this.world.addRigidBody(this.cameraBubble);

		if (this.firing) {
			this.world.gravity = new Goblin.Vector3(0, 0, 20);
		} else {
			this.world.gravity = new Goblin.Vector3(0, 0, -98);
		}

		for (const die of this.dice) {
			die.physical = this.makePhysicalDie(Goblin, die);
			this.world.addRigidBody(die.physical);
		}
	}

	makePhysicalDie(Goblin, die) {
		const body = new Goblin.RigidBody(
			new Goblin.BoxShape(DICE_BOX_RAD, DICE_BOX_RAD, DICE_BOX_RAD),
			1
		);
		body.friction = 0.0;

		body.position.x = die.position.x;
		body.position.y = die.position.y;
		body.position.z = die.position.z;
		body.linear_velocity.x = die.velocity.x;
		body.linear_velocity.y = die.velocity.y;
		body.linear_velocity.z = die.velocity.z;
		body.angular_velocity.x = die.rvel.x;
		body.angular_velocity.y = die.rvel.y;
		body.angular_velocity.z = die.rvel.z;

		body.rotation.x = die.rotation.data[0];
		body.rotation.y = die.rotation.data[1];
		body.rotation.z = die.rotation.data[2];
		body.rotation.w = die.rotation.data[3];

		return body;
	}

	loadDiePosition(die) {
		die.position.x = die.physical.position.x;
		die.position.y = die.physical.position.y;
		die.position.z = die.physical.position.z;
		die.velocity.x = die.physical.linear_velocity.x;
		die.velocity.y = die.physical.linear_velocity.y;
		die.velocity.z = die.physical.linear_velocity.z;
		die.rvel.x = die.physical.angular_velocity.x;
		die.rvel.y = die.physical.angular_velocity.y;
		die.rvel.z = die.physical.angular_velocity.z;

		const rot = die.physical.rotation;
		die.rotation.set([rot.x, rot.y, rot.z, rot.w]);
	}

	nudgeMisaligned() {
		let nudged = false;
		for (const die of this.dice) {
			const depth = die.position.z + this.region.depth;
			if (depth > DICE_REAL_RAD * 2.0) {
				// Stacked
				die.physical.linear_velocity.x = -die.position.x * 2.0;
				die.physical.linear_velocity.y = -die.position.y * 2.0;
				die.physical.linear_velocity.z = 20.0;
				nudged = true;
			} else if (depth > DICE_REAL_RAD * 1.2) {
				// Resting on edge or corner
				die.physical.linear_velocity.x = -die.position.x * 1.0;
				die.physical.linear_velocity.y = -die.position.y * 1.0;
				die.physical.linear_velocity.z = 10.0;
				nudged = true;
			}
		}
		return nudged;
	}

	step(deltaTm) {
		if (!this.goblin) {
			return false;
		}
		if (this.dirty) {
			this.buildSimulation();
			this.active = true;
			this.inactivity = 0;
			this.timeToImpulse = STACK_IMPULSE_DELAY_SECONDS;
		}
		if (!this.active) {
			return false;
		}

		this.world.step(deltaTm);

		const depthLimit = -this.region.depth + DICE_REAL_RAD;

		let allOffscreen = true;
		let motion = false;
		for (const die of this.dice) {
			if (V3.dist2(die.position, die.physical.position) > MOTION_THRESH * MOTION_THRESH) {
				motion = true;
			}
			if (V3.length2(die.physical.angular_velocity) > ROTATION_THRESH * ROTATION_THRESH) {
				motion = true;
			}
			if (die.physical.position.z < 0) {
				allOffscreen = false;
			}
			if (die.physical.position.z < depthLimit) {
				die.physical.position.z = depthLimit;
				die.physical.linear_velocity.z = 0;
			}
			this.loadDiePosition(die);
		}

		if (motion) {
			this.inactivity = 0;
		} else if (deltaTm > 0) {
			this.inactivity += deltaTm;
			if (this.inactivity >= INACTIVITY_THRESH_SECONDS) {
				this.active = false;
			}
		}
		this.timeToImpulse -= deltaTm;
		if (!this.active || this.timeToImpulse <= 0) {
			if (this.nudgeMisaligned()) {
				this.active = true;
				this.inactivity = 0;
			}
			this.timeToImpulse = STACK_IMPULSE_DELAY_SECONDS;
		}
		if (this.firing && allOffscreen) {
			this.firing = false;
			this.fireDone();
			this.fireDone = null;
		}
		return motion;
	}

	getDice() {
		return this.dice;
	}
};
