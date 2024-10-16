import ResourcePaletteProvider from './resource-palette';
import ResourceRenderer from './resource-renderer';
import ResourceContextPadProvider from './resource-context';
import ResourceRules from './resource-rules';

const ResourceExtension = {
  __init__: [
    'resourceRenderer',
    'resourcePaletteProvider',
    'resourceContextPadProvider',
    'resourceRules',
  ],
  resourceRenderer: ['type', ResourceRenderer],
  resourcePaletteProvider: ['type', ResourcePaletteProvider],
  resourceContextPadProvider: ['type', ResourceContextPadProvider],
  resourceRules: ['type', ResourceRules],
};

export default ResourceExtension;
