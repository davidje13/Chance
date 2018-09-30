import EventObject from './EventObject.js';

function make(tag, className) {
	const o = document.createElement(tag);
	o.className = className;
	return o;
}

function buildButton(id, label, iconUrl, callback) {
	const li = document.createElement('li');
	const link = document.createElement('a');
	link.setAttribute('href', '#');
	link.addEventListener('click', (e) => {
		e.preventDefault();
		callback(id);
	});
	const highlight = make('div', 'highlight');
	const iconHold = make('div', 'icon');
	const icon = document.createElement('div');
	icon.style.maskImage = 'url(' + iconUrl + ')';
	icon.style.webkitMaskImage = 'url(' + iconUrl + ')';
	const spanLabel = make('div', 'label');
	spanLabel.innerText = label;

	link.appendChild(highlight);
	iconHold.appendChild(icon);
	highlight.appendChild(iconHold);
	highlight.appendChild(spanLabel);
	li.appendChild(link);

	return li;
}

export default class TabBar extends EventObject {
	constructor() {
		super();
		this.ul = make('ul', 'tabbar');
		this.tabs = new Map();
		this.current = null;
		this.set = this.set.bind(this);
	}

	add(id, label, iconUrl, data) {
		const li = buildButton(id, label, iconUrl, this.set);
		this.ul.appendChild(li);
		this.tabs.set(id, {id, data, li});
	}

	set(id) {
		const target = this.tabs.get(id);
		if (!target || target === this.current) {
			return false;
		}
		if (this.current !== null) {
			this.trigger('leave', [this, this.current.id, this.current.data]);
			this.current.li.className = '';
		}
		this.current = target;
		this.trigger('enter', [this, this.current.id, this.current.data]);
		this.current.li.className = 'selected';
		return true;
	}

	dom() {
		return this.ul;
	}
}
