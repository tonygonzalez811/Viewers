import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Router } from 'meteor/iron:router';
import { ReactiveVar } from 'meteor/reactive-var';
import { OHIF } from 'meteor/ohif:core';

Template.ohifViewer.onCreated(() => {
    const instance = Template.instance();
    instance.headerClasses = new ReactiveVar('');

    OHIF.header.dropdown.setItems([{
        action: () => OHIF.ui.showDialog('serverInformationModal'),
        text: 'Server Information',
        icon: 'fa fa-server fa-lg',
        separatorAfter: true
    }, {
        action: () => OHIF.ui.showDialog('userPreferencesDialog'),
        text: 'Preferences',
        icon: 'fa fa-user',
        separatorAfter: true
    }, {
        action: () => OHIF.ui.showDialog('aboutModal'),
        text: 'About',
        icon: 'fa fa-info'
    }]);

    instance.autorun(() => {
        const currentRoute = Router.current();
        if (!currentRoute) return;
        const routeName = currentRoute.route.getName();
        const isViewer = routeName.indexOf('viewer') === 0;

        // Add or remove the strech class from body
        $(document.body)[isViewer ? 'addClass' : 'removeClass']('stretch');

        // Set the header on its bigger version if the viewer is not opened
        instance.headerClasses.set(isViewer ? '' : 'header-big');

        // Set the viewer open state on session
        Session.set('ViewerOpened', isViewer);
    });

    // Add plugin reloader
    class OHIFPlugin {
      // TODO: this class is here for development purposes.
      // Once it is fleshed out it would go in the OHIF
      // base deployment and be available for plugins
      // to inherit from.

      constructor () {
        this.name = "Unnamed plugin";
        this.description = "No description available";
      }

      // load an individual script URL
      static loadScript(scriptURL) {
        const script = document.createElement("script");
        script.src = scriptURL;
        script.type = "text/javascript";
        script.async = false;
        const head = document.getElementsByTagName("head")[0];
        head.appendChild(script);
        head.removeChild(script);
        return (script)
      }

      // reload all the dependency scripts and also
      // the main plugin script url.
      static reloadPlugin(plugin) {
        plugin.scriptURLs = plugin.scriptURLs || {};
        plugin.scriptURLs.forEach(scriptURL => {
          this.loadScript(scriptURL).onload = function() {
          }
        });
        let scriptURL = plugin.url;
        if (!plugin.allowCaching) {
          scriptURL += "?" + performance.now();
        }
        this.loadScript(scriptURL).onload = function() {
          if (OHIFPlugin.entryPoints[plugin.name]) {
            OHIFPlugin.entryPoints[plugin.name]();
          }
        }
      }
    }

    // each plugin registers an entry point function to be called
    // when the loading is complete (called above in reloadPlugin).
    OHIFPlugin.entryPoints = {};

    window.OHIFPlugin = OHIFPlugin;

    // TODO: this information should come from a plug registry
    let volumeRenderingPlugin = {
      name: "VolumeRenderingPlugin",
      url: "https://cdn.rawgit.com/pieper/hello-plugin/master/volumeRendering.js",
      allowCaching: false,
      scriptURLs: [
        "https://unpkg.com/vtk.js",
      ]
    };

    OHIF.commands.contexts.viewer.reloadVolumeRendering = {
      name: "reloadVolumeRendering",
      action: function(event) {
        OHIFPlugin.reloadPlugin(volumeRenderingPlugin);
      }
    }

});

Template.ohifViewer.events({
    'click .js-toggle-studyList'(event, instance) {
        event.preventDefault();
        const isViewer = Session.get('ViewerOpened');

        if (isViewer) {
            Router.go('studylist');
        } else {
            const { studyInstanceUids } = OHIF.viewer.data;
            if (studyInstanceUids) {
                Router.go('viewerStudies', { studyInstanceUids });
            }
        }
    }
});

Template.ohifViewer.helpers({
    studyListToggleText() {
        const instance = Template.instance();
        const isViewer = Session.get('ViewerOpened');

        if (isViewer) {
            instance.hasViewerData = true;
            return 'Study list';
        }

        return instance.hasViewerData ? 'Back to viewer' : '';
    }
});
