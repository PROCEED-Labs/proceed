import ResourcePaletteProvider from './resource-palette';
import ResourceRenderer from './resource-renderer';
import ResourceContextPadProvider from './resource-context-menu';
import ResourceRules from './resource-rules';
import ResourceReplace from './resource-replacement';
import ResourceLabelEditingProvider from './resource-label-editing';
import ResourceLabelBehavior from './resource-label-behavior';
import ResourceAutoPlace from './resource-auto-place';

/*
 * This module adds a visualisation for different types of resources that can be assigned to
 * different types of process elements like tasks events and gateways
 */

// this module is responsible for adding the visualisation for the element to the modeler or viewer
export const ResourceViewModule = {
  __init__: ['resourceRenderer', 'resourceRules'],
  resourceRenderer: ['type', ResourceRenderer],
  resourceRules: ['type', ResourceRules],
};

// this module is responsible to provide functionality to the editor to add and edit resource
// elements
export const ResourceModelingModule = {
  __init__: [
    'resourcePaletteProvider',
    'resourceContextPadProvider',
    'resourceReplace',
    'resourceLabelEditing',
    'resourceLabelBehavior',
    'resourceAutoPlace',
  ],
  resourcePaletteProvider: ['type', ResourcePaletteProvider],
  resourceContextPadProvider: ['type', ResourceContextPadProvider],
  resourceReplace: ['type', ResourceReplace],
  resourceLabelEditing: ['type', ResourceLabelEditingProvider],
  resourceLabelBehavior: ['type', ResourceLabelBehavior],
  resourceAutoPlace: ['type', ResourceAutoPlace],
};
