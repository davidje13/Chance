export function addFavicon() {
	const faviconLink = document.createElement('link');
	faviconLink.setAttribute('rel', 'icon');
	document.head.appendChild(faviconLink);
	return faviconLink;
}

const CLICK_RAD = 20;

function legacyUpdateOrientation() {
	const angle = Math.round(((window.orientation + 360) % 360) / 90);
	document.body.className = ['', 'orient-90', '', 'orient-270'][angle];
}

function updateOrientation() {
	switch (screen.orientation.type) {
		case 'portrait-primary':
		case 'portrait-secondary':
			document.body.className = '';
			break;
		case 'landscape-primary':
			document.body.className = 'orient-90';
			break;
		case 'landscape-secondary':
			document.body.className = 'orient-270';
			break;
		}
}

function anyParentScrollable(target) {
	let o = target;
	while (o && o.dataset) {
		if (o.dataset.allowScroll) {
			return true;
		}
		o = o.parentNode;
	}
	return false;
}

function dispatchEvent(event, target) {
	let o = target;
	while (o && o !== document.body) {
		if (!o.dispatchEvent(event)) {
			return;
		}
		o = o.parentNode;
	}
	window.dispatchEvent(event);
}

function blockScroll(e) {
	if (!anyParentScrollable(e.target)) {
		e.preventDefault();
	}
}

function block(e) {
	e.preventDefault();
}

export function lockPortrait(resizeFn = null) {
	// No scrolling or zooming, since Safari removed ability to do this via meta
	// Thanks, https://stackoverflow.com/a/38573198/1180785
	window.addEventListener('touchmove', blockScroll, {passive: false, capture: true});
	window.addEventListener('gesturestart', block, {passive: false, capture: true});

	let clickStart = null;
	let lastTouchEnd = 0;
	window.addEventListener('touchstart', (e) => {
		clickStart = {x: e.pageX, y: e.pageY};
	});
	window.addEventListener('touchcancel', (e) => {
		clickStart = null;
	});
	window.addEventListener('touchend', (e) => {
		e.preventDefault();
		if (clickStart === null) {
			lastTouchEnd = 0;
			clickStart = null;
			return;
		}
		if (anyParentScrollable(e.target)) {
			if (
				Math.abs(e.pageX - clickStart.x) > CLICK_RAD ||
				Math.abs(e.pageY - clickStart.y) > CLICK_RAD
			) {
				lastTouchEnd = 0;
				clickStart = null;
				return;
			}
		}
		const now = Date.now();
		dispatchEvent(new MouseEvent('click'), e.target);
		if (now < lastTouchEnd + 500) {
			dispatchEvent(new MouseEvent('dblclick'), e.target);
		}
		lastTouchEnd = now;
		clickStart = null;
	}, {passive: false, capture: true});

	if (screen.orientation) {
		Promise.resolve().then(() => screen.orientation.lock('natural')).catch(() => {
			window.addEventListener('orientationchange', updateOrientation);
			if (resizeFn !== null) {
				window.addEventListener('orientationchange', resizeFn);
			}
			updateOrientation();
		});
	} else if (window.orientation !== undefined) {
		window.addEventListener('orientationchange', legacyUpdateOrientation);
		if (resizeFn !== null) {
			window.addEventListener('orientationchange', resizeFn);
		}
		legacyUpdateOrientation();
	}
	if (resizeFn !== null) {
		window.addEventListener('resize', resizeFn);
	}
}
