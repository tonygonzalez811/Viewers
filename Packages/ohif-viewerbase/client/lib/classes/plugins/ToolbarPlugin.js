import { Session } from 'meteor/session';
import { Random } from 'meteor/random';
import { OHIF } from 'meteor/ohif:core';

import { OHIFPlugin } from "./OHIFPlugin";

export class ToolbarPlugin extends OHIFPlugin {
    constructor(name) {
        super();

        this.name = name;
        this._destroyed = false;

        OHIF.plugins.toolbar.push(this);

        Session.set('ToolbarPluginsChanged', Random.id());
    }

    setup(div) {
        OHIF.log.info(`Setup for plugin: ${this.name}`);
    }

    /**
     * Set up the viewport using the plugin.
     *
     * This should be implemented by the child class.
     *
     * @abstract
     */
    hasTools() {
        throw new Error('You must override this method!');
    }
}
