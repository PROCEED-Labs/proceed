import { Localization } from '@/lib/data/locale';
import {
  AbstractConfig,
  MachineConfig,
  Parameter,
  ParentConfig,
  TargetConfig,
} from '@/lib/data/machine-config-schema';
import { v4 } from 'uuid';

export function defaultParameter(
  key: string,
  val?: string,
  language?: Localization,
  unit?: string,
): Parameter {
  return {
    id: v4(),
    type: 'https://schema.org/' + key,
    content: [
      {
        displayName: key[0].toUpperCase() + key.slice(1),
        value: val ?? '',
        language: language ?? 'en',
        unit: unit ?? '',
      },
    ],
    linkedParameters: [],
    parameters: {},
  };
}

export function defaultConfiguration(name?: string, description?: string): AbstractConfig {
  const date = new Date();
  const config = {
    id: v4(),
    type: 'config',
    environmentId: '',
    metadata: {},
    name: name || 'Default Configuration',
    variables: [],
    departments: [],
    inEditingBy: [],
    createdOn: date,
    lastEdited: '',
    sharedAs: 'protected',
    shareTimestamp: 0,
    allowIframeTimestamp: 0,
    versions: [],
    folderId: '',
    createdBy: '',
    lastEditedBy: '',
    lastEditedOn: date,
  } as AbstractConfig;

  if (description) {
    config.metadata['description'] = defaultParameter('description', description);
  }

  return config;
}

export const generateUniqueId = (): string => {
  return '_' + Math.random().toString(36).substr(2, 9);
};

export const defaultMachineConfiguration = (name: string, description: string): MachineConfig => {
  return {
    ...defaultConfiguration(name, description),
    type: 'machine-config',
    parameters: {},
  };
};

export const defaultTargetConfiguration = (name: string, description: string): TargetConfig => {
  return {
    ...defaultConfiguration(name, description),
    type: 'target-config',
    parameters: {},
  };
};

export type TreeFindStruct = { selection: AbstractConfig; parent: ParentConfig } | undefined;
export type TreeFindParameterStruct =
  | {
      selection: Parameter;
      parent: AbstractConfig | Parameter;
      type: AbstractConfig['type'] | 'parameter';
    }
  | undefined;

export function findConfig(id: string, _parent: ParentConfig): TreeFindStruct {
  if (id === _parent.id) {
    return { selection: _parent, parent: _parent };
  }
  if (_parent.targetConfig && id === _parent.targetConfig.id) {
    return { selection: _parent.targetConfig, parent: _parent };
  }
  if (_parent.machineConfigs) {
    for (let machineConfig of _parent.machineConfigs) {
      if (machineConfig.id === id) {
        return { selection: machineConfig, parent: _parent };
      }
    }
  }
  return undefined;
}

export function findParameter(
  id: string,
  _parent: AbstractConfig | Parameter,
  type: AbstractConfig['type'] | 'parameter' | 'metadata',
): TreeFindParameterStruct {
  let found = undefined;
  if (type === 'config') {
    let parent = _parent as ParentConfig;
    for (let prop in parent.metadata) {
      let parameter = parent.metadata[prop];
      if (parameter.id === id) {
        return { selection: parameter, parent: _parent, type: 'config' };
      }
      found = findParameter(id, parameter, 'metadata');
      if (found) return found;
    }
    if (found) return found;
    // search in targetConfig
    if (parent.targetConfig) {
      for (let prop in parent.targetConfig.metadata) {
        let parameter = parent.targetConfig.metadata[prop];
        if (parameter.id === id) {
          return { selection: parameter, parent: parent.targetConfig, type: 'target-config' };
        }
        found = findParameter(id, parameter, 'metadata');
        if (found) return found;
      }
      if (found) return found;
      for (let prop in parent.targetConfig.parameters) {
        let parameter = parent.targetConfig.parameters[prop];
        if (parameter.id === id) {
          return { selection: parameter, parent: parent.targetConfig, type: 'target-config' };
        }
        found = findParameter(id, parameter, 'parameter');
        if (found) return found;
      }
    }
    // search in all machine configs
    if (found) return found;
    if (parent.machineConfigs) {
      for (let machineConfig of parent.machineConfigs) {
        for (let prop in machineConfig.parameters) {
          let parameter = machineConfig.parameters[prop];
          if (parameter.id === id) {
            return { selection: parameter, parent: machineConfig, type: 'machine-config' };
          }
          found = findParameter(id, parameter, 'parameter');
          if (found) return found;
        }
        if (found) return found;
        for (let prop in machineConfig.metadata) {
          let parameter = machineConfig.metadata[prop];
          if (parameter.id === id) {
            return { selection: parameter, parent: machineConfig, type: 'machine-config' };
          }
          found = findParameter(id, parameter, 'metadata');
          if (found) return found;
        }
        if (found) return found;
      }
    }
    if (found) return found;
  } else {
    let parent = _parent as Parameter;
    for (let prop in parent.parameters) {
      let parameter = parent.parameters[prop];
      if (parameter.id === id) {
        return { selection: parameter, parent: _parent, type: 'parameter' };
      }
      found = findParameter(id, parameter, 'parameter');
      if (found) return found;
    }
  }
  return found;
}

export function getAllParameters(
  _parent: AbstractConfig | Parameter,
  type: AbstractConfig['type'] | 'parameter' | 'metadata',
  path: string,
): { key: string; value: Parameter }[] {
  let found: { key: string; value: Parameter }[] = [];
  if (type === 'config') {
    let parent = _parent as ParentConfig;
    for (let prop in parent.metadata) {
      let parameter = parent.metadata[prop];
      const nextPath = parent.name + '.';
      found.push({ key: nextPath + prop, value: parameter });
      found = found.concat(getAllParameters(parameter, 'metadata', path + nextPath + prop + '.'));
    }
    // search in targetConfig
    if (parent.targetConfig) {
      for (let prop in parent.targetConfig.metadata) {
        let parameter = parent.targetConfig.metadata[prop];
        const nextPath = parent.targetConfig.name + '.';
        found.push({ key: nextPath + prop, value: parameter });
        found = found.concat(getAllParameters(parameter, 'metadata', path + nextPath + prop + '.'));
      }
      for (let prop in parent.targetConfig.parameters) {
        let parameter = parent.targetConfig.parameters[prop];
        const nextPath = parent.targetConfig.name + '.';
        found.push({ key: nextPath + prop, value: parameter });
        found = found.concat(
          getAllParameters(parameter, 'parameter', path + nextPath + prop + '.'),
        );
      }
    }
    // search in all machine configs
    if (parent.machineConfigs) {
      for (let index = 0; index < parent.machineConfigs.length; ++index) {
        let machineConfig = parent.machineConfigs[index];
        for (let prop in machineConfig.parameters) {
          let parameter = machineConfig.parameters[prop];
          const nextPath = machineConfig.name + '.';
          found.push({
            key: nextPath + prop,
            value: parameter,
          });
          found = found.concat(
            getAllParameters(parameter, 'parameter', path + nextPath + prop + '.'),
          );
        }
        for (let prop in machineConfig.metadata) {
          let parameter = machineConfig.metadata[prop];
          const nextPath = machineConfig.name + '.';
          found.push({
            key: nextPath + prop,
            value: parameter,
          });
          found = found.concat(
            getAllParameters(parameter, 'metadata', path + nextPath + prop + '.'),
          );
        }
      }
    }
  } else {
    let parent = _parent as Parameter;
    for (let prop in parent.parameters) {
      let parameter = parent.parameters[prop];
      const nextPath = path;
      found.push({
        key: nextPath + prop,
        value: parameter,
      });
      found = found.concat(getAllParameters(parameter, 'parameter', nextPath + prop + '.'));
    }
  }
  return found;
}
