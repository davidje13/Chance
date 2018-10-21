let callbacks = [];
let lib = null;

const url = 'https://cdn.jsdelivr.net/npm/goblinphysics@0.9.2/build/goblin.min.js';
const integrity = 'sha256-Nhdvzf9P2US1k0oIoEBMSeAQJelGFLyEEbgwMblfh1I=';
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
		script.setAttribute('integrity', integrity);
		script.setAttribute('crossorigin', 'anonymous');
		script.src = url;
		document.head.appendChild(script);
	}
	return new Promise((resolve) => {
		callbacks.push(resolve);
	});
}
