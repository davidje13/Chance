export default class MouseDrag {
	constructor(moveFn, endFn, eventTransformFn = null) {
		this.moveFn = moveFn;
		this.endFn = endFn;
		this.eventTransformFn = eventTransformFn || ((e) => e);
		this.previous = null;

		this._mousemove = this._mousemove.bind(this);
		this._mouseup = this._mouseup.bind(this);
	}

	begin(e) {
		window.addEventListener('mousemove', this._mousemove);
		window.addEventListener('mouseup', this._mouseup);

		this.previous = this.eventTransformFn(e);
	}

	abort() {
		window.removeEventListener('mousemove', this._mousemove);
		window.removeEventListener('mouseup', this._mouseup);
	}

	_mousemove(e) {
		const value = this.eventTransformFn(e);
		this.moveFn(this.previous, value);
		this.previous = value;
	}

	_mouseup(e) {
		this._mousemove(e);
		this.endFn(this.previous);
		this.abort();
	}
};
