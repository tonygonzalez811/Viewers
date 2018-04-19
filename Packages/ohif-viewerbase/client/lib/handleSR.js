function loadSRTools(Part10SRArrayBuffer, displaySets) {
    // get the dicom data as an Object
    let dicomData = dcmjs.data.DicomMessage.readFile(Part10SRArrayBuffer);

    let dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomData.dict);

    // add the length measurement to cornerstoneTools
    let toolStateManager = cornerstoneTools.globalImageIdSpecificToolStateManager;

    let toolState = imagingMeasurementsToToolState(dataset, displaySets);

    toolStateManager.restoreToolState(toolState);
}

function imagingMeasurementsToToolState(dataset, displaySets) {
    // for now, assume dataset is a TID1500 SR with length measurements
    // TODO: generalize to the various kinds of report
    // TODO: generalize to the kinds of measurements the Viewer supports
    if (dataset.ContentTemplateSequence.TemplateIdentifier !== "1500") {
        console.warn("This code can only interpret TID 1500");
    }
    toArray = function(x) { return (x.constructor.name === "Array" ? x : [x]); }

    let lengthState = {};
    toArray(dataset.ContentSequence).forEach(contentItem => {
        if (contentItem.ConceptNameCodeSequence.CodeMeaning === "Imaging Measurements") {
            toArray(contentItem.ContentSequence).forEach(measurementContent => {
                if (measurementContent.ConceptNameCodeSequence.CodeMeaning === "Measurement Group") {
                    toArray(measurementContent.ContentSequence).forEach(groupItemContent => {
                        if (groupItemContent.ConceptNameCodeSequence.CodeMeaning === "Length") {
                            lengthState.measuredValue = groupItemContent.MeasuredValueSequence.NumericValue;
                            const lengthContent = groupItemContent.ContentSequence;
                            lengthState.handles = {start: {}, end: {}};
                            [lengthState.handles.start.x,
                                lengthState.handles.start.y,
                                lengthState.handles.end.x,
                                lengthState.handles.end.y] = lengthContent.GraphicData;
                            const reference = lengthContent.ContentSequence.ReferencedSOPSequence;
                            lengthState.ReferencedInstanceUID = reference.ReferencedSOPInstanceUID;
                            lengthState.ReferencedFrameNumber = reference.ReferencedFrameNumber;
                        }
                    });
                }
            });
        }
    });

    // TODO: determine correct imageId from
    // lengthState.ReferencedInstanceUID and lengthState.ReferencedFrameNumber
    // find imageIds for all viewers

    let imageId;

    displaySets.forEach(displaySet => {
        displaySet.images.forEach(instanceMetadata => {
            if (lengthState.ReferencedInstanceUID === instanceMetadata._sopInstanceUID) {
                imageId = instanceMetadata.getImageId();
                if (lengthState.ReferencedFrameNumber != undefined) { // add or update a frame parameter if needed
                    const frameParameter = `&frame=${lengthState.ReferencedFrameNumber}`;
                    if (imageId.indexOf('frame=') == -1) {
                        imageId += frameParameter;
                    } else {
                        imageId.replace(/frame=[0-9]*/, frameParameter);
                    }
                }
            }
        });
    });

    if (!imageId) {
        console.warn(`No imageId for ${lengthState.ReferencedInstanceUID}`);
        return;
    }

    // TODO: populate the measurments schema?
    const toolState = `
    { 
      "${imageId}": {
        "length": {
          "data": [
            {
              "visible": true,
              "active": false,
              "handles": {
                "start": {
                  "x": ${lengthState.handles.start.x},
                  "y": ${lengthState.handles.start.y},
                  "highlight": true,
                  "active": false
                },
                "end": {
                  "x": ${lengthState.handles.end.x},
                  "y": ${lengthState.handles.end.y},
                  "highlight": true,
                  "active": false
                },
                "textBox": {
                  "active": false,
                  "hasMoved": false,
                  "movesIndependently": false,
                  "drawnIndependently": true,
                  "allowedOutsideImage": true,
                  "hasBoundingBox": true,
                  "x": 109.60703812316717,
                  "y": 123.87096774193549,
                  "boundingBox": {
                    "width": 77.646484375,
                    "height": 25,
                    "left": 680,
                    "top": 317.5
                  }
                }
              },
              "length": ${lengthState.measuredValue},
              "invalidated": true
            }
          ]
        }
      }
    }`
    return JSON.parse(toolState);
}

export function handleSR(series, displaySets) {

    const instance = series.getFirstInstance();

    let request = new XMLHttpRequest();
    request.responseType = 'arraybuffer';
    request.open('GET', instance.getDataProperty('wadouri'));
    request.onload = function (progressEvent) {
        loadSRTools(progressEvent.currentTarget.response, displaySets);
    };

    request.send();
}
