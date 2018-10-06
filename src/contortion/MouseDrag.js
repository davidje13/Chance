export default class MouseDrag {
	constructor(beginFn, moveFn, endFn, eventTransformFn = null) {
		this.beginFn = beginFn;
		this.moveFn = moveFn;
		this.endFn = endFn;
		this.eventTransformFn = eventTransformFn || ((e) => e);
		this.previous = null;
		this.touching = false;

		this._mousedown = this._mousedown.bind(this);
		this._mousemove = this._mousemove.bind(this);
		this._mouseup = this._mouseup.bind(this);

		this._touchstart = this._touchstart.bind(this);
		this._touchmove = this._touchmove.bind(this);
		this._touchend = this._touchend.bind(this);
	}

	register(target) {
		target.addEventListener('mousedown', this._mousedown, {passive: false});
		target.addEventListener('touchstart', this._touchstart, {passive: false});
	}

	unregister(target) {
		target.removeEventListener('mousedown', this._mousedown);
		target.removeEventListener('touchstart', this._touchstart);
	}

	abort() {
		window.removeEventListener('mousemove', this._mousemove);
		window.removeEventListener('mouseup', this._mouseup);
		window.removeEventListener('touchmove', this._touchmove);
		window.removeEventListener('touchend', this._touchend);
		window.removeEventListener('touchcancel', this._touchend);
		this.touching = false;
	}

	_mousedown(e) {
		e.preventDefault();
		window.addEventListener('mousemove', this._mousemove, {passive: false});
		window.addEventListener('mouseup', this._mouseup, {passive: false});

		this.previous = this.eventTransformFn(e);
		this.beginFn(this.previous);
	}

	_mousemove(e) {
		e.preventDefault();
		const value = this.eventTransformFn(e);
		this.moveFn(this.previous, value);
		this.previous = value;
	}

	_mouseup(e) {
		e.preventDefault();
		this._mousemove(e);
		this.endFn(this.previous);
		this.abort();
	}

	_touchstart(e) {
		e.preventDefault();
		if (this.touching) {
			return;
		}
		window.addEventListener('touchmove', this._touchmove, {passive: false});
		window.addEventListener('touchend', this._touchend, {passive: false});
		window.addEventListener('touchcancel', this._touchend, {passive: false});

		this.previous = this.eventTransformFn(e.touches[0]);
		this.beginFn(this.previous);
	}

	_touchmove(e) {
		e.preventDefault();
		const value = this.eventTransformFn(e.touches[0]);
		this.moveFn(this.previous, value);
		this.previous = value;
	}

	_touchend(e) {
		e.preventDefault();
		if (e.touches.length !== 0) {
			return;
		}
		if (e.changedTouches.length > 0) {
			const value = this.eventTransformFn(e.changedTouches[0]);
			this.moveFn(this.previous, value);
			this.previous = value;
		}
		this.endFn(this.previous);
		this.abort();
	}
};
