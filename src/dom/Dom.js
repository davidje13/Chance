export function make(tag, className = '', innerText = null) {
	const o = document.createElement(tag);
	o.className = className;
	if (innerText !== null) {
		o.innerText = innerText;
	}
	return o;
};

export function addFastClickListener(o, fn) {
	const callback = (e) => {
		if (fn(e) !== false) {
			e.preventDefault();
			e.stopPropagation();
		}
	};
	o.addEventListener('click', callback, {passive: false});
	o.addEventListener('touchend', callback, {passive: false});
	return {
		remove: () => {
			o.removeEventListener('click', callback);
			o.removeEventListener('touchend', callback);
		},
	};
};

export function findEnabled(o) {
	return Array.from((o || document).querySelectorAll('button:not([disabled])'));
}

export function setDisabled(o, disabled) {
	if (Array.isArray(o)) {
		for (const i of o) {
			setDisabled(i, disabled);
		}
	} else if (disabled) {
		o.setAttribute('disabled', 'disabled');
	} else {
		o.removeAttribute('disabled');
	}
};
