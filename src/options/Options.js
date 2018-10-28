import {make} from '../dom/Dom.js';

export default class Options {
	constructor(renderer) {
		this.renderer = renderer;

		this.headingHeight = 30;
		this.rowHeight = 20;
		this.sampleWidth = 75;
		this.rowPadding = 5;
		this.border = 1;
		this.empty = true;
		this.samples = [];
		this.y = 0;

		this.hold = make('div', 'option-list');
		if (this.renderer) {
			const rendererCanvas = this.renderer.dom();
			this.hold.appendChild(rendererCanvas);
			rendererCanvas.style.position = 'absolute';
			rendererCanvas.style.top = '0';
			rendererCanvas.style.right = '15px';
		}

		this.curSection = this.hold;
	}

	addHeading(label) {
		this.curSection = make('section');
		const header = make('h3', '', label);
		header.style.height = this.headingHeight + 'px';
		header.style.lineHeight = (this.headingHeight - 2) + 'px';
		this.curSection.appendChild(header);
		this.hold.appendChild(this.curSection);
		this.y += this.headingHeight;
		this.empty = false;
	}

	addRow({label, height = null, sampleData = null}) {
		if (height === null) {
			height = this.rowHeight;
		}
		const row = make('div', 'row');
		row.style.height = height;
		row.style.paddingTop = this.rowPadding + 'px';
		row.style.paddingBottom = this.rowPadding + 'px';
		row.style.borderBottomWidth = this.border + 'px';

		row.appendChild(make('div', 'label', label));
		this.curSection.appendChild(row);
		if (sampleData) {
			this.samples.push({
				rect: {x: 0, y: this.y + this.rowPadding, width: this.sampleWidth, height},
				data: sampleData,
			});
		}
		this.y += height + this.rowPadding * 2 + this.border;
		this.empty = false;
	}

	dom() {
		return this.hold;
	}

	animate() {
	}

	clear() {
	}

	renderSample() {
	}

	start() {
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
