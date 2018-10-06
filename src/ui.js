import TabBar from './TabBar.js';
import RandomSource from './RandomSource.js';
import Dice from './dice/dice.js';
import Coins from './coins/coins.js';
import Numbers from './numbers/numbers.js';
import Contortion from './contortion/contortion.js';
import Answers from './answers/answers.js';

const nav = document.getElementById('tabs');
const container = document.getElementById('content');
const title = document.getElementById('title');
const info = document.getElementById('info');

const faviconLink = document.createElement('link');
faviconLink.setAttribute('rel', 'icon');
document.head.appendChild(faviconLink);

const tabs = new TabBar();

tabs.addEventListener('leave', (tabs, id, {runner}) => {
	runner.stop();
	container.removeChild(runner.dom());
});

tabs.addEventListener('enter', (tabs, id, {runner}) => {
	title.innerText = runner.title();
	info.innerText = runner.info();
	container.className = id;
	faviconLink.setAttribute('href', 'resources/' + id + '/favicon.png');
	document.title = runner.title() + ' \u2014 Chance';
	container.appendChild(runner.dom());
	runner.start();
	// Do not change URL if landscape (else Safari covers content with URL bar)
	if (window.orientation % 180 === 0) {
		window.location.hash = 'tab-' + id;
	}
});

function setTabFromHash() {
	const hashID = window.location.hash.substr(5);
	return tabs.set(hashID);
}

function addTab(id, label, runner) {
	tabs.add(id, label, `resources/${id}/tab.png`, {runner});
}

const random = new RandomSource();

addTab('dice', 'Dice', new Dice(random));
addTab('coins', 'Coins', new Coins(random));
addTab('numbers', 'Numbers', new Numbers(random));
addTab('contortion', 'Contortion', new Contortion(random));
addTab('answers', 'Answers', new Answers(random));

nav.appendChild(tabs.dom());

if (!setTabFromHash()) {
	tabs.set('dice');
}

window.addEventListener('hashchange', setTabFromHash);

// Make page app-like
// (no scrolling or zooming, since Safari removed ability to do this via meta)
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

window.addEventListener('orientationchange', () => {
	if (window.orientation === 90) {
		document.body.className = 'orient-90';
	} else {
		document.body.className = '';
	}
});

// Lock portrait on devices which support it
(
	screen.lockOrientation ||
	screen.mozLockOrientation ||
	screen.msLockOrientation ||
	(() => null)
)('portrait');
