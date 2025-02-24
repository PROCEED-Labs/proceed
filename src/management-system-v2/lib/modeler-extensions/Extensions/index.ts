import CustomResizeHandler from './custom-resizing-handler';

/*
 * This module adds extensions to bpmn-js
 */

// this is responsible for adding the extensions that can affect both viewer and modeler
export const ViewExtensionModule = {};

// this is responsible for adding the extensions that can only affect the modeler
export const ModelingExtensionModule = {
  __init__: ['proceedResizeHandler'],
  proceedResizeHandler: ['type', CustomResizeHandler],
};
