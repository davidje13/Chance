let callbacks = [];
let lib = null;

const url = '/external/goblin.0.9.2.js';
const windowObject = 'Goblin';

export function load() {
	if (lib) {
		return Promise.resolve(lib);
	}
	if (callbacks.length === 0) {
		const script = document.createElement('script');
		script.addEventListener('load', () => {
			lib = window[windowObject];
			for (const fn of callbacks) {
				fn(lib);
			}
			callbacks = null;
		}, {once: true});
		script.src = url;
		document.head.appendChild(script);
	}
	return new Promise((resolve) => {
		callbacks.push(resolve);
	});
}
