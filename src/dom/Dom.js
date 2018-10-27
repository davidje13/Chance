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
		e.preventDefault();
		e.stopPropagation();
		fn(e);
	};
	o.addEventListener('click', callback);
	o.addEventListener('touchend', callback);
	return {
		remove: () => {
			o.removeEventListener('click', callback);
			o.removeEventListener('touchend', callback);
		},
	};
};

export function setDisabled(o, disabled) {
	if (disabled) {
		o.setAttribute('disabled', 'disabled');
	} else {
		o.removeAttribute('disabled');
	}
};
