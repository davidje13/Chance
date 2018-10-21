export default class Queue {
	constructor(capacity = 32) {
		this.values = [];
		this.values.length = (capacity || 1);
		this.tail = 0;
		this.length = 0;
	}

	reserve(newCap) {
		const newValues = [];
		newValues.length = (newCap || 1);

		const newLength = Math.min(this.length, newCap);
		const oldCap = this.values.length;
		const start = this.tail + this.length - newLength;

		for (let i = 0; i < newLength; ++ i) {
			newValues[i] = this.values[(start + i) % oldCap];
		}

		this.values = newValues;
		this.length = newLength;
		this.tail = 0;
	}

	_checkCapacity() {
		if (this.length === this.values.length) {
			this.reserve(this.length * 2);
		}
	}

	clear() {
		this.length = 0;
	}

	push_head(v) {
		this._checkCapacity();
		this.values[(this.tail + this.length) % this.values.length] = v;
		++ this.length;
	}

	push_tail(v) {
		this._checkCapacity();
		this.values[this.tail] = v;
		this.tail = this.tail ? (this.tail - 1) : this.values.length;
		++ this.length;
	}

	peek(pos) {
		if (pos < 0 || pos >= this.length) {
			return undefined;
		}
		return this.values[(this.tail + pos) % this.values.length];
	}

	peek_head() {
		return this.peek(this.length - 1);
	}

	peek_tail() {
		return this.length ? this.values[this.tail] : undefined;
	}

	_remove(rawIndex) {
		const v = this.values[rawIndex];
		this.values[rawIndex] = undefined;
		return v;
	}

	pop_head() {
		if (!this.length) {
			return undefined;
		}
		-- this.length;
		return this._remove((this.tail + this.length) % this.values.length);
	}

	pop_tail() {
		if (!this.length) {
			return undefined;
		}
		-- this.length;
		const v = this._remove(this.tail);
		this.tail = (this.tail + 1) % this.values.length;
		return v;
	}
};
