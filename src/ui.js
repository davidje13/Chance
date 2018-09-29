import Dice from './dice/dice.js';
import Coins from './coins/coins.js';

const nav = document.getElementById('tabs');
const container = document.getElementById('content');
const faviconLink = document.getElementById('favicon');

class TabBar {
	constructor() {
		this.ul = document.createElement('ul');
		this.tabs = new Map();
	}

	add(id, label, iconUrl, data) {
		const li = document.createElement('li');
		li.setAttribute('id', 'tab-' + id);
		const link = document.createElement('a');
		link.setAttribute('href', '#tab-' + id);
		const highlight = document.createElement('div');
		highlight.className = 'highlight';
		const iconHold = document.createElement('div');
		iconHold.className = 'icon';
		const icon = document.createElement('div');
		icon.style.maskImage = 'url(' + iconUrl + ')';
		icon.style.webkitMaskImage = 'url(' + iconUrl + ')';
		const spanLabel = document.createElement('div');
		spanLabel.className = 'label';
		spanLabel.innerText = label;

		link.appendChild(highlight);
		iconHold.appendChild(icon);
		highlight.appendChild(iconHold);
		highlight.appendChild(spanLabel);
		li.appendChild(link);

		this.ul.appendChild(li);
		this.tabs.set(id, data);
	}

	find(id) {
		return this.tabs.get(id);
	}

	dom() {
		return this.ul;
	}
}

const tabs = new TabBar();

tabs.add('dice', 'Dice', 'resources/dice/tab.png', new Dice());
tabs.add('coins', 'Coins', 'resources/coins/tab.png', new Coins());

nav.appendChild(tabs.dom());

let currentRunner = null;
function setTab(id) {
	const tabRunner = tabs.find(id);
	if (!tabRunner || tabRunner === currentRunner) {
		return false;
	}
	window.location.hash = 'tab-' + id;
	if (currentRunner !== null) {
		currentRunner.stop();
		container.removeChild(currentRunner.dom());
	}
	currentRunner = tabRunner;
	currentRunner.start();
	container.appendChild(currentRunner.dom());
	container.className = id;
	faviconLink.setAttribute('href', 'resources/' + id + '/favicon.png');
	return true;
}

function setTabFromHash() {
	const hashID = window.location.hash.substr(5);
	return setTab(hashID);
}

if (!setTabFromHash()) {
	setTab('dice');
}

window.addEventListener('hashchange', setTabFromHash);
