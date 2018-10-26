export function make(tag, className = '') {
	const o = document.createElement(tag);
	o.className = className;
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
