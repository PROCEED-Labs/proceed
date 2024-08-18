'use server';

import store from './store.js';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { getCurrentEnvironment } from '@/components/auth';
import {
  ParentConfig,
  AbstractConfigInputSchema,
  AbstractConfigInput,
  Parameter,
  MachineConfig,
  TargetConfig,
  StoredParentConfig,
  StoredMachineConfig,
  StoredTargetConfig,
  StoredParameter,
  StoredParameterZod,
  AbstractConfig,
} from '../machine-config-schema';
import { foldersMetaObject, getRootFolder } from './folders';
import { UserErrorType, userError } from '@/lib/user-error';
import { v4 } from 'uuid';
import eventHandler from './eventHandler.js';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { asyncForEach, asyncMap } from '@/lib/helpers/javascriptHelpers';

// @ts-ignore
let firstInit = !global.machineConfigMetaObjects;
let inited = false;

type StoredConfigsAndParameters = {
  parentConfigs: Record<string, StoredParentConfig>;
  machineConfigs: Record<string, StoredMachineConfig>;
  targetConfigs: Record<string, StoredTargetConfig>;
  parameters: Record<string, StoredParameter>;
};

let storedData: StoredConfigsAndParameters =
  // @ts-ignore
  global.storedData ||
  // @ts-ignore
  (global.storedData = {
    parentConfigs: {},
    machineConfigs: {},
    targetConfigs: {},
    parameters: {},
  } as StoredConfigsAndParameters);

/**
 * Stores a record of parameters and references to all nested parameters. Storing of nested parameters is done recursively.
 * @param parentId ID of the parent object.
 * @param parentType Information about the type of parent (_'target-config'_ | _'machine-config'_ | _'parameter'_ | _'parent-config'_)
 * @param parameters Record of nested parameters.
 * @return References to nested parameter IDs.
 */
function parametersToStorage(
  parentId: string,
  parentType: StoredParameter['parentType'],
  parameters: Record<string, Parameter>,
) {
  // TODO: why are ids optional for parameters?
  Object.entries(parameters).forEach(([key, parameter]) => {
    storedData.parameters[parameter.id!] = {
      ...parameter,
      key,
      parentId,
      parentType,
      parameters: parametersToStorage(parameter.id!, 'parameter', parameter.parameters),
    };
  });

  return Object.values(parameters).map(({ id }) => id as string);
}

/**
 * Stores a given targetConfig into the new storage referencing other elements by id instead of having them nested. If called without a TargetConfig the function returns void.
 * @param parentId ID of the parent object.
 * @param targetConfig TargetConfig that is to be stored, able to contain ParameterConfigs
 * @return ID of the TargetConfig that was stored.
 */
function targetConfigToStorage(parentId: string, targetConfig?: TargetConfig) {
  if (targetConfig) {
    storedData.targetConfigs[targetConfig.id] = {
      ...targetConfig,
      parentId,
      metadata: parametersToStorage(targetConfig.id, 'target-config', targetConfig.metadata),
      parameters: parametersToStorage(targetConfig.id, 'target-config', targetConfig.parameters),
    };

    return targetConfig.id;
  }
}

/**
 * Stores a given MachineConfig into the new storage referencing other elements by id instead of having them nested.
 * @param parentId ID of the parent object.
 * @param machineConfig MachineConfigs that are to be stored, able to contain ParameterConfigs
 * @return IDs of the MachineConfigs that were stored.
 */
function machineConfigsToStorage(parentId: string, machineConfigs: MachineConfig[]) {
  machineConfigs.forEach((machineConfig) => {
    storedData.machineConfigs[machineConfig.id] = {
      ...machineConfig,
      parentId,
      metadata: parametersToStorage(machineConfig.id, 'machine-config', machineConfig.metadata),
      parameters: parametersToStorage(machineConfig.id, 'machine-config', machineConfig.parameters),
    };
  });

  return machineConfigs.map(({ id }) => id);
}

/**
 * Stores a given ParentConfig into the new storage referencing other elements by id instead of having them nested.
 * @param parentConfig ParentConfig that is to be stored, able to contain TargetConfigs, MachineConfigs and ParameterConfigs
 */
function parentConfigToStorage(parentConfig: ParentConfig) {
  const { targetConfig, metadata, machineConfigs } = parentConfig;

  storedData.parentConfigs[parentConfig.id] = {
    ...parentConfig,
    targetConfig: targetConfigToStorage(parentConfig.id, targetConfig),
    machineConfigs: machineConfigsToStorage(parentConfig.id, machineConfigs),
    metadata: parametersToStorage(parentConfig.id, 'parent-config', metadata),
  };
}

/**
 * Initializes StoredConfigsAndParameters object and converts old nested config schema to new implementation.
 */
export async function init() {
  if (!firstInit || inited) return;
  inited = true;

  if (Array.isArray(store.get('machineConfig')) && store.get('machineConfig').length) {
    // transform the old state { machineConfig: ParentConfig[] } into the new one
    // { parentConfigs: Record<string, ParentConfig>, machineConfigs: Record<string, MachineConfig>, targetConfig: Record<string, TargetConfig>, parameters: Record<string, Parameter> }
    const storedParentConfigs = store.get('machineConfig') as ParentConfig[];

    storedParentConfigs.forEach((parentConfig) => {
      parentConfigToStorage(parentConfig);
    });

    store.set('techData', 'parentConfigs', storedData.parentConfigs);
    store.set('techData', 'machineConfigs', storedData.machineConfigs);
    store.set('techData', 'targetConfigs', storedData.targetConfigs);
    store.set('techData', 'parameters', storedData.parameters);
    store.set('machineConfig', 'machineConfig', []);
  } else {
    storedData = store.get('techData') as StoredConfigsAndParameters;
  }
}
await init();

/********************** Read Elements ****************************/

/**
 * Reads parameters and referenced parameters from stored data to return a nested structure.
 * @param parameterIds IDs of parameters that are to be returned
 * @return Returns a record of parameters.
 */
function nestedParametersFromStorage(parameterIds: string[]) {
  const parameters: Record<string, Parameter> = {};

  parameterIds.forEach((id) => {
    const storedParameter = storedData.parameters[id];
    parameters[storedParameter.key] = {
      ...storedParameter,
      parameters: nestedParametersFromStorage(storedParameter.parameters),
    };
  });

  return parameters;
}

/**
 * Reads a single Machine- or Target-Config and its referenced parameters from stored data and returns a nested structure.
 * @param configType (_'target-config'_ | _'machine-config'_) Type of the config.
 * @param targetConfigId ID of Config that is to be returned
 * @return Returns a Config.
 */
function nestedConfigFromStorage(
  configType: 'target-config',
  configId?: string,
): TargetConfig | undefined;
function nestedConfigFromStorage(
  configType: 'machine-config',
  configId?: string,
): MachineConfig | undefined;
function nestedConfigFromStorage<T extends TargetConfig | MachineConfig>(
  configType: T['type'],
  configId?: string,
) {
  if (!configId) return;
  const storedConfig =
    configType === 'target-config'
      ? storedData.targetConfigs[configId]
      : storedData.machineConfigs[configId];

  if (!storedConfig) return;

  const config = {
    ...storedConfig,
    parameters: nestedParametersFromStorage(storedConfig.parameters),
    metadata: nestedParametersFromStorage(storedConfig.metadata),
  };

  if (configType === 'target-config') return config as TargetConfig;
  else return config as MachineConfig;
}

/**
 * Reads MachineConfigs and referenced parameters from stored data to return nested structures.
 * @param machineConfigIds ID of MachineConfigs that are to be returned
 * @return Returns MachineConfigs.
 */
function nestedMachineConfigsFromStorage(machineConfigIds: string[]): MachineConfig[] {
  return machineConfigIds
    .map((machineConfigId) => {
      return nestedConfigFromStorage('machine-config', machineConfigId);
    })
    .filter((config): config is MachineConfig => !!config);
}

/**
 * Returns a machineConfig based on machineConfig id
 *
 * @throws {UnauthorizedError}
 */
export async function getDeepParentConfigurationById(
  parentConfigId: string,
  ability?: Ability,
): Promise<ParentConfig> {
  const storedParentConfig = storedData.parentConfigs[parentConfigId];

  // TODO: check if the user can access the config

  const parentConfig = {
    ...storedParentConfig,
    metadata: nestedParametersFromStorage(storedParentConfig.metadata),
    targetConfig: nestedConfigFromStorage('target-config', storedParentConfig.targetConfig),
    machineConfigs: nestedMachineConfigsFromStorage(storedParentConfig.machineConfigs),
  };

  if (
    parentConfig &&
    false /*!ability.can('view', toCaslResource('MachineConfig', machineConfig))*/
  )
    throw new UnauthorizedError();

  return parentConfig;
}

/** Returns all shallow machineConfigs in form of an array */
export async function getParentConfigurations(
  environmentId: string,
  ability?: Ability,
): Promise<ParentConfig[]> {
  const storedParentConfigs = Object.values(storedData.parentConfigs).filter(
    (config) => config.environmentId === environmentId,
  );

  const parentConfigs = await asyncMap(storedParentConfigs, ({ id }) =>
    getDeepParentConfigurationById(id),
  );

  // TODO: further filtering to only show what the user can see needed?

  return ability
    ? parentConfigs /*ability.filter('view', 'MachineConfig', machineConfig)*/
    : parentConfigs;
}

/********************** Update Elements ****************************/

/**
 * Stores changes for a given parameter. The changes can be a partial of a parameter.
 * @param parameterId ID of the parameter that receives changes.
 * @param changes Partial of a Parameter containing the changes.
 * @throws {Error} in case:
 * * parameterId does not exist
 * * changes contains an ID (IDs must not be changed)
 */
export async function updateParameter(parameterId: string, changes: Partial<StoredParameter>) {
  if (!storedData.parameters[parameterId])
    throw new Error(`Parameter with id ${parameterId} does not exist!`);
  if (changes.id) throw new Error('Invalid attempt to change the id of an existing parameter');
  const changed = StoredParameterZod.partial().parse(changes);

  // overwrite the current values with the changed ones
  storedData.parameters[parameterId] = { ...storedData.parameters[parameterId], ...changed };
  store.set('techData', 'parameters', storedData.parameters);
}

export async function updateMachineConfig(configId: string, changes: Partial<StoredMachineConfig>) {
  if (!storedData.machineConfigs[configId])
    throw new Error(`Machine config with id ${configId} does not exist!`);
  if (changes.id) throw new Error('Invalid attempt to change the id of an existing machine config');

  storedData.machineConfigs[configId] = { ...storedData.machineConfigs[configId], ...changes };
  store.set('techData', 'machineConfigs', storedData.machineConfigs);
}

export async function updateTargetConfig(configId: string, changes: Partial<StoredTargetConfig>) {
  if (!storedData.targetConfigs[configId])
    throw new Error(`Target config with id ${configId} does not exist!`);
  if (changes.id) throw new Error('Invalid attempt to change the id of an existing target config');

  storedData.targetConfigs[configId] = { ...storedData.targetConfigs[configId], ...changes };
  store.set('techData', 'targetConfigs', storedData.targetConfigs);
}

export async function updateParentConfig(configId: string, changes: Partial<StoredParentConfig>) {
  if (!storedData.parentConfigs[configId])
    throw new Error(`Parent config with id ${configId} does not exist!`);
  if (changes.id) throw new Error('Invalid attempt to change the id of an existing parent config');

  storedData.parentConfigs[configId] = { ...storedData.parentConfigs[configId], ...changes };
  store.set('techData', 'parentConfigs', storedData.parentConfigs);
}

/**
 * Creates a copy of a parameter and all its nested parameters to be pasted as child of a given parent. Stores the copied parameter.
 * @param parameterId ID of the parameter which is to be copied.
 * @param parentId ID of the parent where the parameter is to be copied to.
 * @param parentType Type of the parent. (_'parameter'_ | _'machine-config'_ | _'target-config'_ | _'parent-config'_)
 * @return Returns the newly generated ID for the parameter.
 * @throws {Error} if the ID of the parameter does not exist.
 */
export async function copyParameter(
  parameterId: string,
  parentId?: string,
  parentType?: StoredParameter['parentType'],
) {
  const storedParameter = storedData.parameters[parameterId];

  if (!storedParameter) throw new Error(`Parameter with id ${parameterId} does not exist!`);

  // this creates a deep clone of the element to prevent changes in the content of one to affect the other
  const copy = StoredParameterZod.parse(storedParameter);

  const newId = v4();
  copy.id = newId;
  copy.linkedParameters = [];
  if (parentId) copy.parentId = parentId;
  if (parentType) copy.parentType = parentType;

  // recursively copy all referenced parameters
  copy.parameters = await asyncMap(copy.parameters, (id) => copyParameter(id, newId));

  storedData.parameters[newId] = copy;
  store.set('techData', 'parameters', storedData.parameters);

  return newId;
}

/**
 * Creates a copy of a config and all its nested parameters to be pasted as child of a given parent. Stores the copied config.
 * @param configId ID of the config which is to be copied.
 * @param type Type of the config. (_'machine-config'_ | _'target-config'_)
 * @param parentId ID of the parent where the config is to be copied to.
 * @return Returns the newly generated ID for the config.
 * @throws {Error} if the ID of the config does not exist.
 */
export async function copyConfig(
  configId: string,
  type: Exclude<AbstractConfig['type'], 'config'>,
  parentId?: string,
) {
  const config =
    type === 'target-config'
      ? storedData.targetConfigs[configId]
      : storedData.machineConfigs[configId];

  if (!config) throw new Error(`(Target/Machine)config with id ${configId} does not exist`);

  // deep copy the config
  const copy = JSON.parse(JSON.stringify(config)) as typeof config;

  const newId = v4();
  copy.id = newId;
  if (parentId) copy.parentId = parentId;

  copy.parameters = await asyncMap(copy.parameters, (id) => copyParameter(id, newId));
  copy.metadata = await asyncMap(copy.metadata, (id) => copyParameter(id, newId));
  console.log(newId, copy, type);
  if (type === 'target-config') {
    storedData.targetConfigs[newId] = copy as StoredTargetConfig;
    store.set('techData', 'targetConfigs', storedData.targetConfigs);
  } else {
    storedData.machineConfigs[newId] = copy as StoredMachineConfig;
    store.set('techData', 'machineConfigs', storedData.machineConfigs);
  }

  return newId;
}

/**
 *
 * @throws {Error} in case:
 * * config ID does not exist.
 * * the folder is not found.
 * * a parent configuration with the generated ID already exists.
 */
export async function copyParentConfig(
  originalId: string,
  machineConfigInput: AbstractConfigInput,
  environmentId: string,
) {
  try {
    let originalConfig = storedData.parentConfigs[originalId];
    if (!originalConfig) {
      throw new Error(`Config with id ${originalId} does not exist!`);
    }

    const parentConfigData = AbstractConfigInputSchema.parse(machineConfigInput);

    const newId = v4();
    const date = new Date().toUTCString();
    const copy = {
      ...(JSON.parse(JSON.stringify(originalConfig)) as typeof originalConfig),
      id: newId,
      environmentId,
      // TODO: use the user id
      createdBy: environmentId,
      createdOn: date,
      lastEditedOn: date,
      ...parentConfigData,
      name: parentConfigData.name || `${originalConfig.name} (Copy)`,
      metadata: await asyncMap(originalConfig.metadata, (id) => copyParameter(id, newId)),
      targetConfig:
        originalConfig.targetConfig &&
        (await copyConfig(originalConfig.targetConfig, 'target-config', newId)),
      machineConfigs: await asyncMap(originalConfig.machineConfigs, (id) =>
        copyConfig(id, 'machine-config', newId),
      ),
      originalId,
    };

    // if no folder ID is given, set ID to root folder's
    if (!copy.folderId) {
      copy.folderId = getRootFolder(environmentId).id;
    }

    const folderData = foldersMetaObject.folders[copy.folderId];
    if (!folderData) throw new Error('Folder not found');

    if (storedData.parentConfigs[newId]) {
      throw new Error(`A parent configuration with the id ${newId} already exists!`);
    }

    storedData.parentConfigs[newId] = copy;
    store.set('techData', 'parentConfigs', storedData.parentConfigs);

    eventHandler.dispatch('machineConfigCopied', {
      configOriginal: originalConfig,
      configCopy: copy,
    });

    return machineConfigInput;
  } catch (e) {
    return userError("Couldn't save Machine Config");
  }
}

/*************************** Element Addition *****************************/

export async function addParentConfig(
  machineConfigInput: ParentConfig,
  environmentId: string,
  base?: ParentConfig,
) {
  try {
    const parentConfigData = AbstractConfigInputSchema.parse(machineConfigInput);
    const date = new Date().toUTCString();
    const metadata: ParentConfig = {
      ...({
        id: v4(),
        type: 'config',
        name: 'Default Parent Configuration',
        variables: [],
        createdBy: environmentId,
        lastEditedBy: environmentId,
        lastEditedOn: date,
        metadata: {},
        departments: [],
        inEditingBy: [],
        createdOn: date,
        lastEditedOn: date,
        sharedAs: 'protected',
        shareTimestamp: 0,
        allowIframeTimestamp: 0,
        versions: [],
        folderId: '',
        targetConfig: undefined,
        machineConfigs: [],
        environmentId: environmentId,
      } as ParentConfig),
      ...parentConfigData,
      ...(base ? base : {}),
    };
    metadata.id = v4();
    if (!metadata.folderId) {
      metadata.folderId = (await getRootFolder(metadata.environmentId)).id;
    }

    const folderData = foldersMetaObject.folders[metadata.folderId];
    if (!folderData) throw new Error('Folder not found');
    const { id: parentConfigId } = metadata;
    if (storedData.parentConfigs[parentConfigId]) {
      throw new Error(`A parent configuration with the id ${parentConfigId} already exists!`);
    }

    parentConfigToStorage(metadata);
    store.set('techData', 'parentConfigs', storedData.parentConfigs);
    store.set('techData', 'machineConfigs', storedData.machineConfigs);
    store.set('techData', 'targetConfigs', storedData.targetConfigs);
    store.set('techData', 'parameters', storedData.parameters);

    eventHandler.dispatch('machineConfigAdded', { machineConfig: metadata });

    return metadata;
  } catch (e) {
    return userError("Couldn't create Machine Config");
  }
}

export async function addTargetConfig(parentConfigId: string, targetConfig: TargetConfig) {
  const parentConfig = storedData.parentConfigs[parentConfigId];
  if (!parentConfig)
    throw new Error(`There is no parent configuration with the id ${parentConfigId}.`);

  if (parentConfig.targetConfig)
    throw new Error(`The parent configuration already has a target configuration.`);

  targetConfigToStorage(parentConfigId, targetConfig);
  store.set('techData', 'targetConfigs', storedData.targetConfigs);
  store.set('techData', 'parameters', storedData.parameters);

  parentConfig.targetConfig = targetConfig.id;
  store.set('techData', 'parentConfigs', storedData.parentConfigs);
}

export async function addMachineConfig(parentConfigId: string, machineConfig: MachineConfig) {
  const parentConfig = storedData.parentConfigs[parentConfigId];
  if (!parentConfig)
    throw new Error(`There is no parent configuration with the id ${parentConfigId}.`);

  machineConfigsToStorage(parentConfigId, [machineConfig]);
  store.set('techData', 'machineConfigs', storedData.machineConfigs);
  store.set('techData', 'parameters', storedData.parameters);

  parentConfig.machineConfigs.push(machineConfig.id);
  store.set('techData', 'parentConfigs', storedData.parentConfigs);
}

export async function addParameter(
  parentId: string,
  parentType: StoredParameter['parentType'],
  targetMember: 'parameters' | 'metadata',
  key: string,
  parameter: Parameter,
) {
  if (parentType === 'parent-config') {
    const parent = storedData.parentConfigs[parentId];
    if (!parent) throw new Error(`There is no parent configuration with the id ${parentId}.`);
    if (targetMember === 'parameters') throw new Error('Parent Configurations have no parameters.');

    parent[targetMember].push(parameter.id!);
    parametersToStorage(parent.id, parentType, { [key]: parameter });
    store.set('techData', 'parameters', storedData.parameters);
    store.set('techData', 'parentConfigs', storedData.parentConfigs);
  } else if (parentType === 'machine-config') {
    const parent = storedData.machineConfigs[parentId];
    if (!parent) throw new Error(`There is no machine configuration with the id ${parentId}.`);

    parent[targetMember].push(parameter.id!);
    parametersToStorage(parent.id, parentType, { [key]: parameter });
    store.set('techData', 'parameters', storedData.parameters);
    store.set('techData', 'machineConfigs', storedData.machineConfigs);
  } else if (parentType === 'target-config') {
    const parent = storedData.targetConfigs[parentId];
    if (!parent) throw new Error(`There is no target configuration with the id ${parentId}.`);

    parent[targetMember].push(parameter.id!);
    parametersToStorage(parent.id, parentType, { [key]: parameter });
    store.set('techData', 'parameters', storedData.parameters);
    store.set('techData', 'targetConfigs', storedData.targetConfigs);
  } else if (parentType === 'parameter') {
    const parent = storedData.parameters[parentId];
    if (!parent) throw new Error(`There is no parameter with the id ${parentId}.`);
    if (targetMember === 'metadata') throw new Error('Parent Configurations have no metadata.');

    parent[targetMember].push(parameter.id!);
    parametersToStorage(parent.id!, parentType, { [key]: parameter });
    store.set('techData', 'parameters', storedData.parameters);
    store.set('techData', 'targetConfigs', storedData.targetConfigs);
  }
}

/*************************** Element Removal ******************************/

/**
 * Removes a parameter and all its nested parameters from the store
 * will also remove the reference to the parameter from its parent element if it still exists
 *
 * TODO: if we remove a whole tree we should not trigger a save on every change but only update the store after every change was done
 *
 * @param parameterId the id of the parameter to remove
 */
export async function removeParameter(parameterId: string) {
  const parameter = storedData.parameters[parameterId];

  if (!parameter) return;

  delete storedData.parameters[parameterId];

  // remove the reference to the parameter
  if (parameter.parentType === 'parameter') {
    const parentParameter = storedData.parameters[parameter.parentId];

    if (parentParameter) {
      parentParameter.parameters = parentParameter.parameters.filter((id) => id !== parameterId);
    }
  } else if (parameter.parentType === 'parent-config') {
    const parentConfig = storedData.parentConfigs[parameter.parentId];

    if (parentConfig) {
      parentConfig.metadata = parentConfig.metadata.filter((id) => id !== parameterId);
      store.set('techData', 'parentConfigs', storedData.parentConfigs);
    }
  } else if (parameter.parentType === 'machine-config') {
    const parentConfig = storedData.machineConfigs[parameter.parentId];
    if (parentConfig) {
      parentConfig.metadata = parentConfig.metadata.filter((id) => id !== parameterId);
      parentConfig.parameters = parentConfig.parameters.filter((id) => id !== parameterId);
      store.set('techData', 'machineConfigs', storedData.machineConfigs);
    }
  } else if (parameter.parentType === 'target-config') {
    const parentConfig = storedData.targetConfigs[parameter.parentId];
    if (parentConfig) {
      parentConfig.metadata = parentConfig.metadata.filter((id) => id !== parameterId);
      parentConfig.parameters = parentConfig.parameters.filter((id) => id !== parameterId);
      store.set('techData', 'targetConfigs', storedData.targetConfigs);
    }
  }

  // recursively remove all referenced parameters
  await asyncForEach(parameter.parameters, async (id) => removeParameter(id));

  // TODO: remove all backlinks from linked parameters

  store.set('techData', 'parameters', storedData.parameters);
}

/**
 * Removes a target config and all its nested parameters from the store
 * will also remove the reference to the target config from its parent config if it still exists
 *
 * TODO: if we remove a whole tree we should not trigger a save on every change but only update the store after every change was done
 *
 * @param targetConfigId the id of the target config to remove
 */
export async function removeTargetConfig(targetConfigId: string) {
  const targetConfig = storedData.targetConfigs[targetConfigId];

  if (!targetConfig) return;

  delete storedData.targetConfigs[targetConfigId];

  // remove the reference to the target config from its the parent config
  const parentConfig = storedData.parentConfigs[targetConfig.parentId];
  if (parentConfig) {
    parentConfig.targetConfig = undefined;
    store.set('techData', 'parentConfigs', storedData.parentConfigs);
  }

  // remove all referenced parameters
  await asyncForEach(targetConfig.metadata, async (id) => removeParameter(id));
  await asyncForEach(targetConfig.parameters, async (id) => removeParameter(id));

  // remove the target config from the store
  store.set('techData', 'targetConfigs', storedData.targetConfigs);
}

/**
 * Removes a machine config and all its nested parameters from the store
 * will also remove the reference to the machine config from its parent config if it still exists
 *
 * TODO: if we remove a whole tree we should not trigger a save on every change but only update the store after every change was done
 *
 * @param machineConfigId the id of the machine config to remove
 */
export async function removeMachineConfig(machineConfigId: string) {
  const machineConfig = storedData.machineConfigs[machineConfigId];

  if (!machineConfig) return;

  delete storedData.machineConfigs[machineConfigId];

  // remove the reference to the machine config from its the parent config
  const parentConfig = storedData.parentConfigs[machineConfig.parentId];
  if (parentConfig) {
    parentConfig.machineConfigs = parentConfig.machineConfigs.filter(
      (id) => id !== machineConfigId,
    );
    store.set('techData', 'parentConfigs', storedData.parentConfigs);
  }

  // remove all referenced parameters
  await asyncForEach(machineConfig.metadata, async (id) => removeParameter(id));
  await asyncForEach(machineConfig.parameters, async (id) => removeParameter(id));

  // remove the machine config from the store
  store.set('techData', 'machineConfigs', storedData.machineConfigs);
}

/** Removes an existing parent config */
export async function removeParentConfiguration(parentConfigId: string) {
  const parentConfig = storedData.parentConfigs[parentConfigId];

  if (!parentConfig) return;

  delete storedData.parentConfigs[parentConfigId];

  if (parentConfig.targetConfig) await removeTargetConfig(parentConfig.targetConfig);
  await asyncForEach(parentConfig.machineConfigs, (id) => removeMachineConfig(id));
  await asyncForEach(parentConfig.metadata, (id) => removeParameter(id));

  // remove parentConfig from folder
  foldersMetaObject.folders[parentConfig.folderId]!.children = foldersMetaObject.folders[
    parentConfig.folderId
  ]!.children.filter((folder) => folder.id !== parentConfigId);

  // remove from store
  store.set('techData', 'parentConfigs', storedData.parentConfigs);
}

export const deleteParentConfigurations = async (definitionIds: string[], spaceId: string) => {
  for (const definitionId of definitionIds) {
    await removeParentConfiguration(definitionId);
  }
};
