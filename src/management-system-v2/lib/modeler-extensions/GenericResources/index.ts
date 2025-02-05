import ResourcePaletteProvider from './resource-palette';
import ResourceRenderer from './resource-renderer';
import ResourceContextPadProvider from './resource-context-menu';
import ResourceRules from './resource-rules';
import ResourceReplace from './resource-replacement';
import ResourceLabelEditingProvider from './resource-label-editing';
import ResourceLabelBehavior from './resource-label-behavior';

/*
 * This module adds a visualisation for different types of resources that can be assigned to
 * different types of process elements like tasks events and gateways
 */

// this module is responsible for adding the visualisation for the element to the modeler or viewer
export const ResourceRendererModule = {
  __init__: ['resourceRenderer'],
  resourceRenderer: ['type', ResourceRenderer],
};
// this module extends the sidebar containing the process elements and allows the user to add
// resources to the process
export const ResourcePaletteProviderModule = {
  __init__: ['resourcePaletteProvider'],
  resourcePaletteProvider: ['type', ResourcePaletteProvider],
};
// this module extends the context menu next to a selected resource element and allows the user
// to remove a resource, connect it to a valid process element or open the replace menu
export const ResourceContextPadProviderModule = {
  __init__: ['resourceContextPadProvider'],
  resourceContextPadProvider: ['type', ResourceContextPadProvider],
};
// this module is responsible for showing the menu that allows the user to replace a resource with
// another type of resource
export const ResourceReplaceModule = {
  __init__: ['resourceReplace'],
  resourceReplace: ['type', ResourceReplace],
};
// this module allows resources to be connected to specific elements and ensures that an association
// is used for the connection
export const ResourceRulesModule = {
  __init__: ['resourceRules'],
  resourceRules: ['type', ResourceRules],
};
// these two modules are responsible to allow the user to add label to and edit labels of a
// resource
export const ResourceLabelEditingModule = {
  __init__: ['resourceLabelEditing'],
  resourceLabelEditing: ['type', ResourceLabelEditingProvider],
};
export const ResourceLabelBehaviorModule = {
  __init__: ['resourceLabelBehavior'],
  resourceLabelBehavior: ['type', ResourceLabelBehavior],
};
