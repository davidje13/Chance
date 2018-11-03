import {make} from '../dom/Dom.js';

export default class Options {
	constructor(properties = null) {
		this.headingHeight = 30;
		this.rowHeight = 24;
		this.sampleWidth = 75;
		this.rowPadding = 5;
		this.border = 1;
		this.empty = true;
		this.samples = [];
		this.rows = [];
		this.sectionID = 0;
		this.y = 0;

		this.hold = make('div', 'option-list');
		this.renderer = null;

		this.curSection = this.hold;
		this.properties = properties || new Map();
		this.readInputs = this.readInputs.bind(this);
	}

	setRenderer(renderer) {
		if (this.renderer === renderer) {
			return;
		}
		if (this.renderer !== null) {
			this.hold.removeChild(this.renderer.dom());
		}
		this.renderer = renderer;
		if (renderer === null) {
			return;
		}
		const rendererCanvas = this.renderer.dom();
		this.hold.insertBefore(rendererCanvas, this.hold.firstChild);
		rendererCanvas.className = 'options-render-canvas';
	}

	addHeading(label) {
		this.curSection = make('section');
		const header = make('h3', '', label);
		header.style.height = (this.headingHeight + 1) + 'px';
		header.style.lineHeight = (this.headingHeight - 2) + 'px';
		this.curSection.appendChild(header);
		this.hold.appendChild(this.curSection);
		this.y += this.headingHeight;
		++ this.sectionID;
		this.empty = false;
	}

	addRow({label, height = null, sampleData = null, type = '', property = null, def = null}) {
		if (height === null) {
			height = this.rowHeight;
		}
		const row = make('label', 'row');
		row.style.height = height;
		row.style.paddingTop = this.rowPadding + 'px';
		row.style.paddingBottom = this.rowPadding + 'px';
		row.style.borderBottomWidth = this.border + 'px';

		let input = null;
		switch (type) {
		case 'checkbox':
			input = make('input');
			input.setAttribute('type', 'checkbox');
			input.addEventListener('change', this.readInputs);
			row.appendChild(input);
			break;
		case 'radio':
			input = make('input');
			input.setAttribute('type', 'radio');
			input.setAttribute('name', 'sg' + this.sectionID);
			input.addEventListener('change', this.readInputs);
			row.appendChild(input);
			break;
		}
		if (property !== null && def !== null) {
			if (!this.properties.has(property)) {
				this.properties.set(property, def);
			}
		}

		row.appendChild(make('span', '', label));
		this.curSection.appendChild(row);
		if (sampleData) {
			this.samples.push({
				rect: {x: 0, y: this.y + this.rowPadding, width: this.sampleWidth, height},
				data: sampleData,
			});
		}
		this.y += height + this.rowPadding * 2 + this.border;
		this.empty = false;

		this.rows.push({row, input, type, property});
	}

	updateRows() {
		for (const row of this.rows) {
			if (row.property === null) {
				continue;
			}
			const value = this.properties.get(row.property);
			switch (row.type) {
			case 'checkbox':
				row.input.checked = (value !== false);
				break;
			case 'radio':
				row.input.checked = (value !== false);
				break;
			}
		}
	}

	readInputs() {
		for (const row of this.rows) {
			if (row.property === null || row.input === null) {
				continue;
			}
			const oldValue = this.properties.get(row.property);
			let value = oldValue;
			switch (row.type) {
			case 'checkbox':
				value = row.input.checked;
				break;
			case 'radio':
				value = row.input.checked;
				break;
			}
			if (value !== oldValue) {
				this.properties.set(row.property, value);
				this.changed = true;
			}
		}
	}

	dom() {
		return this.hold;
	}

	animate() {
	}

	makeRenderer() {
		return null;
	}

	clear() {
	}

	renderSample() {
	}

	start() {
		if (!this.renderer) {
			this.setRenderer(this.makeRenderer());
		}
		if (this.renderer) {
			let maxX = 0;
			let maxY = 0;
			for (const sample of this.samples) {
				maxX = Math.max(maxX, sample.rect.x + sample.rect.width);
				maxY = Math.max(maxY, sample.rect.y + sample.rect.height);
			}
			this.renderer.resize(maxX, maxY);
		}
		if (this.empty) {
			this.hold.appendChild(make('div', 'message', 'No options available'));
			this.empty = false;
		}
		this.updateRows();
		this.changed = false;
	}

	getProperties() {
		return this.properties;
	}

	getProperty(name) {
		return this.properties.get(name);
	}

	step(deltaTm) {
		this.animate(deltaTm);

		const topY = this.hold.parentNode.scrollTop;
		const baseY = topY + this.hold.parentNode.clientHeight;

		this.clear();
		for (const sample of this.samples) {
			if (sample.rect.y + sample.rect.height <= topY || sample.rect.y >= baseY) {
				continue;
			}
			this.renderSample(sample.data, sample.rect);
		}
	}

	stop() {
	}
};
