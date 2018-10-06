export function addFavicon() {
	const faviconLink = document.createElement('link');
	faviconLink.setAttribute('rel', 'icon');
	document.head.appendChild(faviconLink);
	return faviconLink;
}

export function isPortrait() {
	if (!window.orientation) {
		return true;
	} else {
		return (window.orientation % 180 === 0);
	}
}

export function supportsOrientation() {
	return window.orientation !== undefined;
}

const ORIENTATION_CLASSNAMES = ['', 'orient-90', '', 'orient-270'];

function updateOrientation() {
	const angle = Math.round(((window.orientation + 360) % 360) / 90);
	document.body.className = ORIENTATION_CLASSNAMES[angle];
}

export function lockPortrait() {
	// No scrolling or zooming, since Safari removed ability to do this via meta
	// Thanks, https://stackoverflow.com/a/38573198/1180785
	window.addEventListener('touchmove', (e) => e.preventDefault(), {passive: false, capture: true});

	let lastTouchEnd = 0;
	window.addEventListener('touchend', (e) => {
		const now = Date.now();
		if (now < lastTouchEnd + 500) {
			e.preventDefault();
			const event = new MouseEvent('dblclick');
			let o = e.target;
			while (o && o !== document.body) {
				o.dispatchEvent(event);
				o = o.parentNode;
			}
		}
		lastTouchEnd = now;
	}, {passive: false, capture: true});

	if (supportsOrientation()) {
		window.addEventListener('orientationchange', updateOrientation);
		updateOrientation();
	} else {
		document.body.className = 'nonrotating';
	}

	// Lock portrait on devices which support it
	(
		screen.lockOrientation ||
		screen.mozLockOrientation ||
		screen.msLockOrientation ||
		(() => null)
	)('portrait');
}
