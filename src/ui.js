import {
	addFavicon,
	isPortrait,
	supportsOrientation,
	lockPortrait,
} from './deviceManagement.js';
import TabBar from './TabBar.js';
import RandomSource from './RandomSource.js';
import ShakeGesture from './gestures/ShakeGesture.js';
import Dice from './dice/dice.js';
import Coins from './coins/coins.js';
import Numbers from './numbers/numbers.js';
import Contortion from './contortion/contortion.js';
import Answers from './answers/answers.js';

const nav = document.getElementById('tabs');
const container = document.getElementById('content');
const titleSpan = document.getElementById('title');
const infoSpan = document.getElementById('info');
const faviconLink = addFavicon();
const shakeGesture = new ShakeGesture(shake);

let currentTabRunner = null;
let currentInfoLabel = '';
let currentTitle = '';
let lastTime = 0;
let lastW = 0;
let lastH = 0;

function updateLabels() {
	const title = currentTabRunner.title();
	if (title !== currentTitle) {
		titleSpan.innerText = title;
		document.title = title + ' \u2014 Chance';
		currentTitle = title;
	}
	const info = currentTabRunner.info();
	if (info !== currentInfoLabel) {
		infoSpan.innerText = info;
		currentInfoLabel = info;
	}
}

function start(tm) {
	lastTime = tm;
	resize(true);
	currentTabRunner.start();
}

function resize(force) {
	const w = container.offsetWidth;
	const h = container.offsetHeight;
	if (!force && lastW === w && lastH === h) {
		return;
	}
	lastW = w;
	lastH = h;
	if (currentTabRunner !== null) {
		currentTabRunner.resize(w, h);
	}
}

function shake() {
	if (currentTabRunner !== null) {
		currentTabRunner.trigger('shake');
	}
}

function step(tm) {
	const deltaMillis = (tm - lastTime);
	if (deltaMillis < 0) {
		currentTabRunner.step(0, lastTime);
	} else {
		currentTabRunner.step(Math.min(deltaMillis * 0.001, 0.1), tm * 0.001);
		lastTime = tm;
	}
	updateLabels();
}

function frame(tm) {
	if (currentTabRunner !== null) {
		step(tm);
	}
	window.requestAnimationFrame(frame);
}

frame(performance.now());

const tabs = new TabBar();

tabs.addEventListener('leave', (tabs, id, {runner}) => {
	runner.stop();
	container.removeChild(runner.dom());
});

tabs.addEventListener('enter', (tabs, id, {runner}) => {
	faviconLink.setAttribute('href', 'resources/' + id + '/favicon.png');
	container.appendChild(runner.dom());
	currentTabRunner = runner;
	shakeGesture.reset();
	start(performance.now());

	// Do not change URL if landscape (else Safari covers content with URL bar)
	if (isPortrait()) {
		window.location.hash = 'tab-' + id;
	}
});

tabs.addEventListener('reenter', () => {
	currentTabRunner.trigger('reenter');
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
shakeGesture.start();

lockPortrait(resize.bind(null, false));
