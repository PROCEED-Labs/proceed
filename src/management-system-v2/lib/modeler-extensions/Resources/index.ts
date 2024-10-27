import ResourcePaletteProvider from './resource-palette';
import ResourceRenderer from './resource-renderer';
import ResourceContextPadProvider from './resource-context';
import ResourceRules from './resource-rules';
import ResourceReplace from './resource-replacement';
import ResourceLabelEditingProvider from './resource-label-editing';

export const ResourceRendererModule = {
  __init__: ['resourceRenderer'],
  resourceRenderer: ['type', ResourceRenderer],
};
export const ResourcePaletteProviderModule = {
  __init__: ['resourcePaletteProvider'],
  resourcePaletteProvider: ['type', ResourcePaletteProvider],
};
export const ResourceContextPadProviderModule = {
  __init__: ['resourceContextPadProvider'],
  resourceContextPadProvider: ['type', ResourceContextPadProvider],
};
export const ResourceRulesModule = {
  __init__: ['resourceRules'],
  resourceRules: ['type', ResourceRules],
};
export const ResourceReplaceModule = {
  __init__: ['resourceReplace'],
  resourceReplace: ['type', ResourceReplace],
};
export const ResourceLabelEditingModule = {
  __init__: ['resourceLabelEditing'],
  resourceLabelEditing: ['type', ResourceLabelEditingProvider],
};
