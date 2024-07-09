import {
  AbstractConfig,
  ConfigField,
  ConfigParameter,
  ParentConfig,
} from '@/lib/data/machine-config-schema';
import { v4 } from 'uuid';

export function predefinedDefault<T>(key: string, val: T, hiding: boolean = true) {
  return {
    id: v4(),
    key: key,
    hiding: hiding,
    content: [{ type: typeof val, displayName: key[0].toUpperCase() + key.slice(1), value: val }],
  };
}

export function defaultConfiguration(): AbstractConfig {
  const date = new Date().toUTCString();
  return {
    id: v4(),
    type: 'config',
    environmentId: '',
    owner: predefinedDefault('owner', ''),
    picture: predefinedDefault('picture', ''),
    name: 'Default Machine Configuration',
    description: predefinedDefault('description', '', false),
    machine: predefinedDefault('machine', ''),
    userId: predefinedDefault('userId', ''),
    variables: [],
    customFields: [],
    parameters: [],
    departments: [],
    inEditingBy: [],
    createdOn: date,
    lastEdited: date,
    sharedAs: 'protected',
    shareTimestamp: 0,
    allowIframeTimestamp: 0,
    versions: [],
    folderId: '',
    createdBy: '',
    lastEditedBy: '',
    lastEditedOn: '',
  } as AbstractConfig;
}

export const createMachineConfigInParent = (
  parentConfig: ParentConfig,
  nameValue: string,
  descriptionValue: string,
) => {
  parentConfig.machineConfigs.push({
    ...defaultConfiguration(),
    name: nameValue,
    description: predefinedDefault('description', descriptionValue, false),
    type: 'machine-config',
    owner: parentConfig.owner,
    environmentId: parentConfig.environmentId,
  });
};

export const createTargetConfigInParent = (
  parentConfig: ParentConfig,
  nameValue: string,
  descriptionValue: string,
) => {
  // We can only have one target configuration
  if (parentConfig.targetConfig) return;
  let foundMachine = parentConfig;
  foundMachine.targetConfig = {
    ...defaultConfiguration(),
    name: nameValue,
    description: predefinedDefault('description', descriptionValue, false),
    type: 'target-config',
    owner: foundMachine.owner,
    environmentId: foundMachine.environmentId,
  };
};

export type TreeFindStruct = { selection: AbstractConfig; parent: ParentConfig } | undefined;
export type TreeFindParameterStruct =
  | {
      selection: ConfigParameter;
      parent: AbstractConfig | ConfigParameter;
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
  for (let machineConfig of _parent.machineConfigs) {
    if (machineConfig.id === id) {
      return { selection: machineConfig, parent: _parent };
    }
  }
  return undefined;
}

export function deleteParameter(id: string, parentConfig: ParentConfig): boolean {
  let p = findParameter(id, parentConfig, 'config');
  if (!p) return false;
  let parent;
  if (p.type === 'parameter') {
    parent = p.parent as ConfigParameter;
    parent.nestedParameters = parent.nestedParameters.filter((node, _) => {
      if (node.id) return id.indexOf(node.id) === -1;
      return true;
    });
  } else {
    parent = p.parent as AbstractConfig;
    parent.parameters = parent.parameters.filter((node, _) => {
      if (node.id) return id.indexOf(node.id) === -1;
      return true;
    });
  }

  return true;
}

export function findParameter(
  id: string,
  _parent: AbstractConfig | ConfigParameter,
  type: AbstractConfig['type'] | 'parameter',
): TreeFindParameterStruct {
  let found = undefined;
  if (type === 'config') {
    let parent = _parent as ParentConfig;
    for (let parameter of parent.parameters) {
      if (parameter.id === id) {
        return { selection: parameter, parent: _parent, type: 'config' };
      }
      found = findParameter(id, parameter, 'parameter');
      if (found) return found;
    }
    if (found) return found;
    // search in targetConfig
    if (parent.targetConfig) {
      for (let parameter of parent.targetConfig.parameters) {
        if (parameter.id === id) {
          return { selection: parameter, parent: parent.targetConfig, type: 'target-config' };
        }
        found = findParameter(id, parameter, 'parameter');
        if (found) return found;
      }
    }
    // search in all machine configs
    if (found) return found;
    for (let machineConfig of parent.machineConfigs) {
      for (let parameter of machineConfig.parameters) {
        if (parameter.id === id) {
          return { selection: parameter, parent: machineConfig, type: 'machine-config' };
        }
        found = findParameter(id, parameter, 'parameter');
        if (found) return found;
      }
      if (found) return found;
    }
    if (found) return found;
  } else {
    let parent = _parent as ConfigParameter;
    for (let parameter of parent.nestedParameters) {
      if (parameter.id === id) {
        return { selection: parameter, parent: _parent, type: 'parameter' };
      }
      found = findParameter(id, parameter, 'parameter');
      if (found) return found;
    }
  }
  return found;
}
