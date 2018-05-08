function loadSRTools(Part10SRArrayBuffer, displaySets) {
    // get the dicom data as an Object
    let dicomData = dcmjs.data.DicomMessage.readFile(Part10SRArrayBuffer);


    let dataset = dcmjs.data.DicomMetaDictionary.naturalizeDataset(dicomData.dict);

    console.log(dataset);

    // add the length measurement to cornerstoneTools
    const toolStateManager = cornerstoneTools.globalImageIdSpecificToolStateManager;

    // convert the SR into the kind of toolState cornerstoneTools needs
    const loadedToolState = imagingMeasurementsToToolState(dataset, displaySets);


    // merge the loadedToolState to the existing toolState
    const existingToolState = toolStateManager.saveToolState();
    if (Object.keys(existingToolState).length == 0) {
      existingToolState = {};
    }
    Object.keys(loadedToolState).forEach(imageId => {
      if (!existingToolState[imageId]) {
        existingToolState[imageId] = {};
      }
      if (!existingToolState[imageId].length) {
        existingToolState[imageId].length = {data: []};
      }
      loadedToolState[imageId].length.data.forEach(lengthData => {
        console.log(`adding`, lengthData);
        existingToolState[imageId].length.data.push(lengthData);
      });
    });
    toolStateManager.restoreToolState(existingToolState);
}

function imagingMeasurementsToToolState(dataset, displaySets) {
    // for now, assume dataset is a TID1500 SR with length measurements
    // TODO: generalize to the various kinds of report
    // TODO: generalize to the kinds of measurements the Viewer supports
    if (dataset.ContentTemplateSequence.TemplateIdentifier !== "1500") {
        console.warn("This code can only interpret TID 1500");
        return({});
    }
    toArray = function(x) { return (x.constructor.name === "Array" ? x : [x]); }

    let lengthStates = [];
    toArray(dataset.ContentSequence).forEach(contentItem => {
        if (contentItem.ConceptNameCodeSequence.CodeMeaning === "Imaging Measurements") {
            toArray(contentItem.ContentSequence).forEach(measurementContent => {
                if (measurementContent.ConceptNameCodeSequence.CodeMeaning === "Measurement Group") {
                    toArray(measurementContent.ContentSequence).forEach(groupItemContent => {
                        if (groupItemContent.ConceptNameCodeSequence.CodeMeaning === "Length") {
                            let lengthState = {};
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
                            lengthStates.push(lengthState);
                        }
                    });
                }
            });
        }
    });
    console.log(lengthStates);

    // TODO: determine correct imageId from
    // lengthState.ReferencedInstanceUID and lengthState.ReferencedFrameNumber
    // find imageIds for all viewers

    let lengthStatesByImageId = {};

    lengthStates.forEach(lengthState => {
      let imageId;
      displaySets.forEach(displaySet => {
          displaySet.images.forEach(instanceMetadata => {
              if (lengthState.ReferencedInstanceUID === instanceMetadata._sopInstanceUID) {
                  imageId = instanceMetadata.getImageId();
                  const frame = lengthState.ReferencedFrameNumber
                  if (frame != undefined && !isNaN(frame)) { // add or update a frame parameter if needed
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
        console.log(dataset);
      }
      lengthStatesByImageId[imageId] = lengthState;
    });


    let toolState = {};
    Object.keys(lengthStatesByImageId).forEach(imageId => {
      let lengthState = lengthStatesByImageId[imageId];
      const lengthData = JSON.parse(`
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
    `);
    if (!toolState[imageId]) {
      toolState[imageId] = {length : {data: []}};
    }
    console.log('lengthData', lengthData);
    toolState[imageId].length.data.push(lengthData);
  });

  return toolState;
}

export function handleSR(series, displaySets) {

    const instance = series.getFirstInstance();

    console.log(`loading ${instance}`);


    let request = new XMLHttpRequest();
    request.responseType = 'arraybuffer';
    request.open('GET', instance.getDataProperty('wadouri'));
    request.onload = function (progressEvent) {
        loadSRTools(progressEvent.currentTarget.response, displaySets);
    };

    request.send();
}
