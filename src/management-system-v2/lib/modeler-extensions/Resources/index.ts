import ResourcePaletteProvider from './resource-palette';
import ResourceRenderer from './resource-renderer';
import ResourceContextPadProvider from './resource-context';
import ResourceRules from './resource-rules';
import ResourceReplace from './resource-replacement';

const ResourceExtension = {
  __init__: [
    'resourceRenderer',
    'resourcePaletteProvider',
    'resourceContextPadProvider',
    'resourceRules',
    'resourceReplace',
  ],
  resourceRenderer: ['type', ResourceRenderer],
  resourcePaletteProvider: ['type', ResourcePaletteProvider],
  resourceContextPadProvider: ['type', ResourceContextPadProvider],
  resourceRules: ['type', ResourceRules],
  resourceReplace: ['type', ResourceReplace],
};

export default ResourceExtension;
