import Dice from './dice/dice.js';
import Coins from './coins/coins.js';
import Numbers from './numbers/numbers.js';
import Contortion from './contortion/contortion.js';
import Answers from './answers/answers.js';

const nav = document.getElementById('tabs');
const container = document.getElementById('content');
const title = document.getElementById('title');

const faviconLink = document.createElement('link');
faviconLink.setAttribute('rel', 'icon');
document.head.appendChild(faviconLink);

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

tabs.add('dice', 'Dice', 'resources/dice/tab.png', {title: 'Dice', runner: new Dice()});
tabs.add('coins', 'Coins', 'resources/coins/tab.png', {title: 'Coin Toss', runner: new Coins()});
tabs.add('numbers', 'Numbers', 'resources/numbers/tab.png', {title: 'Numbers', runner: new Numbers()});
tabs.add('contortion', 'Contortion', 'resources/contortion/tab.png', {title: 'Contortion', runner: new Contortion()});
tabs.add('answers', 'Answers', 'resources/answers/tab.png', {title: 'Answers Ball', runner: new Answers()});

nav.appendChild(tabs.dom());

let current = null;
function setTab(id) {
	const next = tabs.find(id);
	if (!next || next === current) {
		return false;
	}
	window.location.hash = 'tab-' + id;
	if (current !== null) {
		current.runner.stop();
		container.removeChild(current.runner.dom());
	}
	current = next;
	title.innerText = current.title;
	container.appendChild(current.runner.dom());
	container.className = id;
	current.runner.start();
	faviconLink.setAttribute('href', 'resources/' + id + '/favicon.png');
	document.title = current.title + ' \u2014 Chance';
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
window.addEventListener('scroll', (e) => {
	if (document.body.scrollTop > 0 || document.body.scrollLeft > 0) {
		document.body.scrollTo(0, 0);
	}
});
