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

function updateOrientation() {
	if (window.orientation === 90) {
		document.body.className = 'orient-90';
	} else if (window.orientation === 270) {
		document.body.className = 'orient-270';
	} else {
		document.body.className = '';
	}
}

export function lockPortrait() {
	// No scrolling or zooming, since Safari removed ability to do this via meta
	// Thanks, https://stackoverflow.com/a/38573198/1180785
	window.addEventListener('touchmove', (e) => e.preventDefault(), {passive: false});

	let lastTouchEnd = 0;
	window.addEventListener('touchend', (e) => {
		const now = Date.now();
		if (now < lastTouchEnd + 300) {
			e.preventDefault();
		}
		lastTouchEnd = now;
	}, {passive: false});

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
