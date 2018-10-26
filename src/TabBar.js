import EventObject from './EventObject.js';
import {make, addFastClickListener} from './dom/Dom.js';

function buildButton(id, label, iconUrl, callback) {
	const li = make('li');
	const link = make('button');
	addFastClickListener(link, () => callback(id));
	const highlight = make('div', 'highlight');
	const iconHold = make('div', 'icon');
	const icon = make('div');
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
	}

	add(id, label, iconUrl, data) {
		const li = buildButton(id, label, iconUrl, (id) => this.set(id, true));
		this.ul.appendChild(li);
		this.tabs.set(id, {id, data, li});
	}

	set(id, reenter = false) {
		const target = this.tabs.get(id);
		if (!target) {
			return false;
		}
		if (target === this.current) {
			if (reenter) {
				this.trigger('reenter', [this, this.current.id, this.current.data]);
			}
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
