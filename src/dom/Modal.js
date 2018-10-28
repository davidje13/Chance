import {make, addFastClickListener, setDisabled, findEnabled} from './Dom.js';
import EventObject from '../EventObject.js';

export default class Modal extends EventObject {
	constructor(parent) {
		super();

		this.parent = parent;
		this.lastEnabled = null;
		this.lastActive = null;
		this.modal = null;
		this.data = null;
		this.shade = make('div', 'modal-shade');
		addFastClickListener(this.shade, () => this.trigger('dismiss'));
	}

	_attach() {
		this.trigger('attach', [this.modal, this.data]);
		this.parent.appendChild(this.modal);
	}

	_detach() {
		this.trigger('detach', [this.modal, this.data]);
		this.parent.removeChild(this.modal);
	}

	show(modal, data) {
		if (!modal) {
			return;
		}
		if (this.modal !== null) {
			if (this.modal !== modal) {
				this._detach();
				this.modal = modal;
				this.data = data;
				this._attach();
			}
			return;
		}
		this.modal = modal;
		this.data = data;

		this.lastActive = this.parent.ownerDocument.activeElement;
		this.lastEnabled = findEnabled(this.parent.ownerDocument);
		setDisabled(this.lastEnabled, true);

		this.parent.appendChild(this.shade);
		this._attach();
	}

	hide() {
		if (this.modal === null) {
			return;
		}
		this._detach();
		this.modal = null;
		this.data = null;

		this.parent.removeChild(this.shade);
		setDisabled(this.lastEnabled, false);
		this.lastEnabled = null;
		if (this.lastActive !== null) {
			this.lastActive.focus();
			this.lastActive = null;
		}
	}
};
