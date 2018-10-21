import {M4} from '../math/Matrix.js';
import Quaternion from '../math/Quaternion.js';
import {load} from '../libs/GoblinWrapper.js';

export default class DiceSimulator {
	constructor(shapePoints, maxDepth) {
		this.dice = [];
		this.region = {width: 0, height: 0, depth: 0};
		this.firing = false;
		this.fireDone = null;

		this.dirty = true;
		this.goblin = null;

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
		const d = this.region.depth;
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
		this.floor.friction = 0.9;
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

		if (this.firing) {
			this.world.gravity = new Goblin.Vector3(0, 0, 20);
		} else {
			this.world.gravity = new Goblin.Vector3(0, 0, -98);
		}

		for (const die of this.dice) {
			die.physical = new Goblin.RigidBody(
				new Goblin.BoxShape(1, 1, 1),
				1
			);
			die.physical.position.x = die.position.x;
			die.physical.position.y = die.position.y;
			die.physical.position.z = die.position.z;
			die.physical.linear_velocity.x = die.velocity.x;
			die.physical.linear_velocity.y = die.velocity.y;
			die.physical.linear_velocity.z = die.velocity.z;
			die.physical.angular_velocity.x = die.rvel.x;
			die.physical.angular_velocity.y = die.rvel.y;
			die.physical.angular_velocity.z = die.rvel.z;

			die.physical.rotation.x = die.rotation.data[0];
			die.physical.rotation.y = die.rotation.data[1];
			die.physical.rotation.z = die.rotation.data[2];
			die.physical.rotation.w = die.rotation.data[3];
			this.world.addRigidBody(die.physical);
		}
	}

	step(deltaTm) {
		if (!this.goblin) {
			return;
		}
		if (this.dirty) {
			this.buildSimulation();
		}

		this.world.step(deltaTm);

		let allOffscreen = true;
		const buffer = [];
		for (const die of this.dice) {
			if (die.physical === null) {
				continue;
			}
			if (die.physical.position.z < -this.region.depth + 1) {
				die.physical.position.z = -this.region.depth + 1;
				die.physical.linear_velocity.z = 0;
			}
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
			if (die.position.z < 0) {
				allOffscreen = false;
			}
		}
		if (this.firing && allOffscreen) {
			this.firing = false;
			this.fireDone();
			this.fireDone = null;
		}
	}

	getDice() {
		return this.dice;
	}
};
