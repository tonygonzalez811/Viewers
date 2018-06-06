Package.describe({
    name: 'ohif:cornerstone',
    summary: 'Cornerstone Web-based Medical Imaging libraries',
    version: '0.0.1'
});

Npm.depends({
    hammerjs: '2.0.8',
    'cornerstone-core': 'file://Users/pieper/ohif/cornerstone',
    'cornerstone-tools': 'file://Users/pieper/ohif/cornerstoneTools',
    'cornerstone-math': '0.1.6',
    'dicom-parser': '1.7.6',
    'cornerstone-wado-image-loader': '2.0.0',
    'dcmjs': '0.1.3'
});

Package.onUse(function(api) {
    api.versionsFrom('1.5');

    api.use('ecmascript');

    api.addAssets('public/js/cornerstoneWADOImageLoaderCodecs.es5.js', 'client');
    api.addAssets('public/js/cornerstoneWADOImageLoaderWebWorker.es5.js', 'client');
    api.addAssets('public/js/cornerstoneWADOImageLoaderWebWorker.min.js.map', 'client');

    api.mainModule('main.js', 'client');

    api.export('cornerstone', 'client');
    api.export('cornerstoneMath', 'client');
    api.export('cornerstoneTools', 'client');
    api.export('cornerstoneWADOImageLoader', 'client');
    api.export('dicomParser', 'client');
    api.export('dcmjs', 'client');
});
