import PerformerPaletteProvider from './performer-palette';
import PerformerRenderer from './performer-renderer';
import PerformerContextPadProvider from './performer-context-menu';
import PerformerRules from './performer-rules';
import PerformerReplace from './performer-replacement';
import PerformerLabelEditingProvider from './performer-label-editing';
import PerformerLabelBehavior from './performer-label-behavior';

/*
 * This module adds a visualisation for different types of performers that can be assigned to
 * different types of process elements like tasks events and gateways
 */

// this module is responsible for adding the visualisation for the element to the modeler or viewer
export const PerformerRendererModule = {
  __init__: ['performerRenderer'],
  performerRenderer: ['type', PerformerRenderer],
};
// this module extends the sidebar containing the process elements and allows the user to add
// performers to the process
export const PerformerPaletteProviderModule = {
  __init__: ['performerPaletteProvider'],
  performerPaletteProvider: ['type', PerformerPaletteProvider],
};
// this module extends the context menu next to a selected performer element and allows the user
// to remove a performer, connect it to a valid process element or open the replace menu
export const PerformerContextPadProviderModule = {
  __init__: ['performerContextPadProvider'],
  performerContextPadProvider: ['type', PerformerContextPadProvider],
};
// this module is responsible for showing the menu that allows the user to replace a performer with
// another type of performer
export const PerformerReplaceModule = {
  __init__: ['performerReplace'],
  performerReplace: ['type', PerformerReplace],
};
// this module allows perfomers to be connected to specific elements and ensures that an association
// is used for the connection
export const PerformerRulesModule = {
  __init__: ['performerRules'],
  performerRules: ['type', PerformerRules],
};
// these two modules are responsible to allow the user to add label to and edit labels of a
// performer
export const PerformerLabelEditingModule = {
  __init__: ['performerLabelEditing'],
  performerLabelEditing: ['type', PerformerLabelEditingProvider],
};
export const PerformerLabelBehaviorModule = {
  __init__: ['performerLabelBehavior'],
  performerLabelBehavior: ['type', PerformerLabelBehavior],
};
