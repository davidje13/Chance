import TabBar from './TabBar.js';
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
	window.location.hash = 'tab-' + id;
});

function setTabFromHash() {
	const hashID = window.location.hash.substr(5);
	return tabs.set(hashID);
}

function addTab(id, label, runner) {
	tabs.add(id, label, `resources/${id}/tab.png`, {runner});
}

addTab('dice', 'Dice', new Dice());
addTab('coins', 'Coins', new Coins());
addTab('numbers', 'Numbers', new Numbers());
addTab('contortion', 'Contortion', new Contortion());
addTab('answers', 'Answers', new Answers());

nav.appendChild(tabs.dom());

if (!setTabFromHash()) {
	tabs.set('dice');
}

window.addEventListener('hashchange', setTabFromHash);
