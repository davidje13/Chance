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
import Contortion from './contortion/contortion.js';
import Answers from './answers/answers.js';
import {make, addFastClickListener} from './dom/Dom.js';
import Options from './options/Options.js';
import Modal from './dom/Modal.js';
import LocalStorage from './LocalStorage.js';

const nav = document.getElementById('tabs');
const container = document.getElementById('content');
const titleSpan = document.getElementById('title');
const infoSpan = document.getElementById('info');
const holder2 = document.getElementById('holder2');
const configBtn = make('button', 'config');
const faviconLink = addFavicon();
const shakeGesture = new ShakeGesture(shake);

container.appendChild(configBtn);

let currentTabRunner = null;
let currentTabId = null;
let currentOptions = null;
let currentInfoLabel = '';
let currentTitle = '';
let lastTime = 0;
let lastW = 0;
let lastH = 0;
let lastOptionsTime = 0;
let optionsFrame = 0;

const OPTIONS_FRAMERATE = 2;

function tabLocalStorage() {
	return new LocalStorage(currentTabId);
}

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
	if (currentTabRunner !== null && currentOptions === null) {
		currentTabRunner.trigger('shake');
	}
}

function step(tm) {
	if (tm < lastTime) {
		tm = lastTime;
	}

	if (currentOptions !== null) {
		if (optionsFrame === 0) {
			currentOptions.step(Math.min((tm - lastOptionsTime) * 0.001, 0.1), tm * 0.001);
			lastOptionsTime = tm;
			optionsFrame = OPTIONS_FRAMERATE - 1;
		} else {
			-- optionsFrame;
		}
	}
	if (currentTabRunner !== null) {
		currentTabRunner.step(Math.min((tm - lastTime) * 0.001, 0.05), tm * 0.001);
		lastTime = tm;
		updateLabels();
	}
}

function frame(tm) {
	step(tm);
	resetOverscroll();
	window.requestAnimationFrame(frame);
}

const tabs = new TabBar();

tabs.addEventListener('leave', (tabs, id, {runner}) => {
	runner.stop();
	container.removeChild(runner.dom());
});

tabs.addEventListener('enter', (tabs, id, {runner}) => {
	faviconLink.setAttribute('href', 'resources/' + id + '/favicon.png');
	container.appendChild(runner.dom());
	currentTabRunner = runner;
	currentTabId = id;

	const options = currentTabRunner.options();
	if (options) {
		options.load(tabLocalStorage().get());
	}

	shakeGesture.reset();
	start(performance.now());

	// Do not change URL if landscape (else Safari covers content with URL bar)
	if (isPortrait()) {
		window.location.hash = 'tab-' + id;
	}
});

tabs.addEventListener('reenter', () => {
	if (currentTabRunner !== null && currentOptions === null) {
		currentTabRunner.trigger('reenter');
	}
});

addFastClickListener(container, () => {
	if (currentTabRunner !== null && currentOptions === null) {
		return currentTabRunner.trigger('click');
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
addTab('contortion', 'Contortion', new Contortion(random));
addTab('answers', 'Answers', new Answers(random));

nav.appendChild(tabs.dom());

const modal = new Modal(holder2);
modal.addEventListener('dismiss', () => modal.hide());

const optionPane = make('div', 'modal options');
const optionTitle = make('h2');
const optionFoot = make('button', 'footer', 'close');
const optionScroller = make('div', 'scroller');
addFastClickListener(optionFoot, () => modal.hide());
optionPane.appendChild(optionTitle);
optionPane.appendChild(optionScroller);
optionPane.appendChild(optionFoot);
optionScroller.dataset.allowScroll = true;

function resetOverscroll() {
	const h = optionScroller.scrollHeight - optionScroller.clientHeight;
	if (h <= 0) {
		return;
	}
	const y = optionScroller.scrollTop;
	if (y >= 0 && y < 1) {
		optionScroller.scrollTop = 1;
	} else if (y <= h && y > h - 1) {
		optionScroller.scrollTop = h - 1;
	}
}

const emptyOptions = new Options();

addFastClickListener(configBtn, () => {
	if (currentTabRunner === null) {
		return;
	}

	optionTitle.innerText = currentTabRunner.title();
	const options = currentTabRunner.options() || emptyOptions;

	modal.show(optionPane, {options});
});

modal.addEventListener('attach', (pane, {options}) => {
	optionScroller.appendChild(options.dom());
	options.start();
	currentOptions = options;
	optionsFrame = 0;
	lastOptionsTime = lastTime;
	optionScroller.scrollTop = 1;
});

modal.addEventListener('detach', (pane, {options}) => {
	options.stop();
	tabLocalStorage().set(options.save());
	optionScroller.removeChild(optionScroller.firstChild);
	currentOptions = null;
	if (options.changed) {
		if (currentTabRunner !== null) {
			currentTabRunner.trigger('options-change');
		}
	}
});

if (!setTabFromHash()) {
	tabs.set('dice');
}

window.addEventListener('hashchange', setTabFromHash);
shakeGesture.start();
frame(performance.now());

lockPortrait(resize.bind(null, false));
