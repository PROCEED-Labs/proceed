'use server';

import { v4 } from 'uuid';
import {
  AbstractConfig,
  AbstractConfigInput,
  AbstractConfigInputSchema,
  MachineConfig,
  Parameter,
  ParentConfig,
  StoredMachineConfig,
  StoredParameter,
  StoredParameterZod,
  StoredParentConfig,
  StoredTargetConfig,
  TargetConfig,
} from '../machine-config-schema';
import { getFolderById, getRootFolder } from './folders';
import db from '.';
import { userError } from '@/lib/user-error';
import { getCurrentUser } from '@/components/auth';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { asyncFilter, asyncForEach, asyncMap } from '@/lib/helpers/javascriptHelpers';
import {
  defaultConfiguration,
  defaultParentConfiguration,
} from '@/app/(dashboard)/[environmentId]/machine-config/configuration-helper';

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
  parentId: string,
  parentType: StoredParameter['parentType'],
) {
  const storedParameterResult = await db.configParameter.findUnique({ where: { id: parameterId } });
  const storedParameter = storedParameterResult?.data as StoredParameter;

  if (!storedParameter) throw new Error(`Parameter with id ${parameterId} does not exist!`);

  // this creates a deep clone of the element to prevent changes in the content of one to affect the other
  const copy = StoredParameterZod.parse(storedParameter);

  const newId = v4();
  copy.id = newId;
  copy.linkedParameters = [];
  copy.parentId = parentId;
  copy.parentType = parentType;

  // recursively copy all referenced parameters
  copy.parameters = await asyncMap(copy.parameters, (id) => copyParameter(id, newId, 'parameter'));

  await db.configParameter.create({ data: { id: copy.id, data: copy } });

  return newId;
}

/**
 * Creates a copy of a machine- or target-config and all its nested parameters to be pasted as child of a given parent. Stores the copied config.
 * @param configId ID of the config which is to be copied.
 * @param configType Type of the config. (_'machine-config'_ | _'target-config'_)
 * @param parentId ID of the parent where the config is to be copied to.
 * @return Returns the newly generated ID for the config.
 * @throws {Error} if the ID of the config does not exist.
 */
export async function copyConfig(
  configId: string,
  configType: Exclude<AbstractConfig['type'], 'config'>,
  parentId: string,
) {
  let config;
  if (configType === 'target-config') {
    const targetResult = await db.targetConfig.findUnique({ where: { id: configId } });
    config = targetResult?.data as unknown as StoredTargetConfig;
  } else {
    const machineResult = await db.machineConfig.findUnique({ where: { id: configId } });
    config = machineResult?.data as unknown as StoredMachineConfig;
  }

  if (!config) throw new Error(`${configType} with id ${configId} does not exist`);

  // deep copy the config
  const copy = JSON.parse(JSON.stringify(config)) as typeof config;

  const newId = v4();
  copy.id = newId;
  copy.parentId = parentId;

  copy.parameters = await asyncMap(copy.parameters, (id) => copyParameter(id, newId, configType));
  copy.metadata = await asyncMap(copy.metadata, (id) => copyParameter(id, newId, configType));

  if (configType === 'target-config') {
    await db.targetConfig.create({ data: { id: copy.id, data: copy } });
  } else {
    await db.machineConfig.create({ data: { id: copy.id, data: copy } });
  }

  return newId;
}

/**
 * @param originalId ID of the config to be copied.
 * @param configBase Config the selected config is to be pasted into
 * @param environmentId
 * @return Returns the newly generated ID for the config.
 * @throws {Error} in case:
 * * config ID does not exist.
 * * the folder is not found.
 * * a parent configuration with the generated ID already exists.
 */
export async function copyParentConfig(
  originalId: string,
  configBase: AbstractConfigInput,
  environmentId: string,
) {
  if (!originalId) return;

  try {
    const originalConfigResult = await db.config.findUnique({ where: { id: originalId } });
    if (!originalConfigResult) {
      throw new Error(`Config with id ${originalId} does not exist!`);
    }
    const originalConfig = originalConfigResult?.data as unknown as StoredParentConfig;

    const configBaseData = AbstractConfigInputSchema.parse(configBase);

    const { userId } = await getCurrentUser();
    const newId = v4();
    const date = new Date();
    const copy = {
      ...(JSON.parse(JSON.stringify(originalConfig)) as typeof originalConfig),
      id: newId,
      environmentId,
      createdBy: userId,
      createdOn: date,
      lastEditedOn: date,
      ...configBaseData,
      name: configBaseData.name || `${originalConfig.name} (Copy)`,
      metadata: await asyncMap(originalConfig.metadata, (id) =>
        copyParameter(id, newId, 'parent-config'),
      ),
      targetConfig:
        originalConfig.targetConfig &&
        (await copyConfig(originalConfig.targetConfig, 'target-config', newId)),
      machineConfigs: await asyncMap(originalConfig.machineConfigs, (id) =>
        copyConfig(id, 'machine-config', newId),
      ),
      originalId,
    } as StoredParentConfig;

    // if no folder ID is given, set ID to root folder's
    if (!copy.folderId) {
      copy.folderId = (await getRootFolder(environmentId)).id;
    }

    const folderData = await getFolderById(copy.folderId);
    if (!folderData) throw new Error('Folder not found');

    await db.config.create({
      data: {
        id: copy.id,
        environmentId: environmentId,
        creatorId: userId,
        createdOn: date,
        data: copy,
      },
    });

    return newId;
  } catch (e) {
    return userError("Couldn't save Config");
  }
}

/*************************** Element Addition *****************************/
/**
 * Adds a parent config to to DB for a given environment ID.
 *
 * @param machineConfigInput  Config which is to be stored in the DB
 * @param environmentId       Environment ID of the user's space
 * @param throwCollisionError Determines if an error is thrown when a collision of IDs occurs. If not a new ID is generated for the config which is added. Default: false
 * @returns ID of the stored config
 */
export async function addParentConfig(
  machineConfigInput: ParentConfig,
  environmentId: string,
  throwCollisionError: boolean = false,
) {
  try {
    const { userId } = await getCurrentUser();
    // TODO this doesn't do anything since every property is optional
    AbstractConfigInputSchema.parse(machineConfigInput);
    const folderId = (await getRootFolder(environmentId)).id;
    const defaultConfig = defaultParentConfiguration(environmentId, folderId);
    const newConfig: ParentConfig = {
      ...defaultConfig,
      ...machineConfigInput,
    };

    newConfig.createdBy = userId;
    newConfig.folderId = folderId;
    newConfig.environmentId = environmentId;

    const folderData = await getFolderById(newConfig.folderId);
    if (!folderData) throw new Error('Folder not found');
    let idCollision = false;
    const { id: parentConfigId } = newConfig;

    const existingConfig = await db.config.findUnique({ where: { id: parentConfigId } });
    if (existingConfig) {
      if (throwCollisionError) throw new Error(`Config with id ${parentConfigId} already exists!`);
      idCollision = true;
    }
    let storeId = await parentConfigToStorage(newConfig, idCollision);
    addConfigCategories(environmentId, newConfig.categories);
    return { storeId };
  } catch (e: unknown) {
    const error = e as Error;
    return userError(error.message ?? "Couldn't create Config");
  }
}

/**
 * This adds a new version for a parent configuration to the db.
 * @param machineConfigInput Config for which a version is created.
 * @param environmentId Environment ID for the current space.
 * @param versionId ID for the version that is to be created.
 * @param versionName Name for the version that is to be created.
 * @param versionDescription Description for the version that is to be created.
 * @returns returns the newly created config version in the case of no errors. Otherwise returns UserError.
 */
export async function addParentConfigVersion(
  machineConfigInput: ParentConfig,
  environmentId: string,
  versionId: string,
  versionName: string,
  versionDescription: string,
) {
  let versions = Array.from(machineConfigInput.versions);
  versions.push({
    id: versionId,
    name: versionName,
    description: versionDescription,
    versionBasedOn: machineConfigInput.version,
    createdOn: new Date(),
  });

  // update references to versions in main/latest config
  await updateParentConfig(machineConfigInput.id, { versions, version: versionId });

  // storing a copy as versioned config
  const newVersion: ParentConfig = JSON.parse(JSON.stringify(machineConfigInput));
  newVersion.id = newVersion.id;

  try {
    const newConfig: ParentConfig = {
      ...(defaultConfiguration(environmentId) as ParentConfig),
      ...newVersion,
      version: versionId,
    };

    newConfig.folderId = (await getRootFolder(environmentId)).id;
    newConfig.environmentId = environmentId;

    const folderData = await getFolderById(newConfig.folderId);
    if (!folderData) throw new Error('Folder not found');

    // true to generate new IDs for data and create a version of a parentConfig instead of a regular one
    parentConfigToStorage(newConfig, true, versionId);

    return newConfig;
  } catch (e: unknown) {
    const error = e as Error;
    return userError(error.message ?? "Couldn't create Machine Config");
  }
}

/**
 * Copies the data of a specific config-version into the editable "main-config" displayed as latest version.
 * @param machineConfigInput The config-version that is to be set as latest version.
 * @returns Returns the config if no errors occur. Otherwise a UserError is returned.
 */
export async function setParentConfigVersionAsLatest(versionId: string) {
  try {
    versionToParentConfigStorage(versionId);
  } catch (e: unknown) {
    const error = e as Error;
    return userError(error.message ?? "Couldn't create Machine Config");
  }
}

export async function addTargetConfig(parentConfigId: string, targetConfig: TargetConfig) {
  const parentConfigResult = await db.config.findUnique({ where: { id: parentConfigId } });
  const parentConfig = parentConfigResult?.data as unknown as StoredParentConfig;
  if (!parentConfig)
    throw new Error(`There is no parent configuration with the id ${parentConfigId}.`);

  if (parentConfig.targetConfig)
    throw new Error(`The parent configuration already has a target configuration.`);

  await targetConfigToStorage(parentConfigId, targetConfig);

  parentConfig.targetConfig = targetConfig.id;
  await db.config.update({
    where: { id: parentConfig.id },
    data: { data: parentConfig },
  });
}

export async function addMachineConfig(
  parentConfigId: string,
  machineConfig: MachineConfig,
  newId: boolean = false,
) {
  // const parentConfig = storedData.parentConfigs[parentConfigId];

  const parentConfigResult = await db.config.findUnique({ where: { id: parentConfigId } });
  const parentConfig = parentConfigResult?.data as unknown as StoredParentConfig;

  if (!parentConfig)
    throw new Error(`There is no parent configuration with the id ${parentConfigId}.`);

  await machineConfigsToStorage(parentConfigId, [machineConfig], newId);

  parentConfig.machineConfigs.push(machineConfig.id);
  await db.config.update({
    where: { id: parentConfig.id },
    data: { data: parentConfig },
  });
}

export async function addParameter(
  parentId: string,
  parentType: StoredParameter['parentType'],
  targetMember: 'parameters' | 'metadata',
  key: string,
  parameter: Parameter,
) {
  if (parentType === 'parent-config') {
    const parentConfigResult = await db.config.findUnique({ where: { id: parentId } });
    const parentConfig = parentConfigResult?.data as unknown as StoredParentConfig;
    if (!parentConfig) throw new Error(`There is no parent configuration with the id ${parentId}.`);
    if (targetMember === 'parameters') throw new Error('Parent Configurations have no parameters.');

    parentConfig[targetMember].push(parameter.id!);
    await parametersToStorage(parentConfig.id, parentType, { [key]: parameter });
    await db.config.update({
      where: { id: parentConfig.id },
      data: { data: parentConfig },
    });
  } else if (parentType === 'machine-config') {
    const parentConfigResult = await db.machineConfig.findUnique({ where: { id: parentId } });
    const parentConfig = parentConfigResult?.data as unknown as StoredMachineConfig;
    if (!parentConfig)
      throw new Error(`There is no machine configuration with the id ${parentId}.`);

    parentConfig[targetMember].push(parameter.id!);
    await parametersToStorage(parentConfig.id, parentType, { [key]: parameter });
    await db.machineConfig.update({
      where: { id: parentConfig.id },
      data: { data: parentConfig },
    });
  } else if (parentType === 'target-config') {
    const parentConfigResult = await db.targetConfig.findUnique({ where: { id: parentId } });
    const parentConfig = parentConfigResult?.data as unknown as StoredTargetConfig;
    if (!parentConfig) throw new Error(`There is no target configuration with the id ${parentId}.`);

    parentConfig[targetMember].push(parameter.id!);
    await parametersToStorage(parentConfig.id, parentType, { [key]: parameter });
    await db.targetConfig.update({
      where: { id: parentConfig.id },
      data: { data: parentConfig },
    });
  } else if (parentType === 'parameter') {
    const parentParameterResult = await db.configParameter.findUnique({ where: { id: parentId } });
    const parentParameter = parentParameterResult?.data as unknown as StoredParameter;
    if (!parentParameter) throw new Error(`There is no parameter with the id ${parentId}.`);
    if (targetMember === 'metadata') throw new Error('Parent Configurations have no metadata.');

    parentParameter[targetMember].push(parameter.id!);
    await parametersToStorage(parentParameter.id!, parentType, { [key]: parameter });
    await db.configParameter.update({
      where: { id: parentParameter.id },
      data: { data: parentParameter },
    });
  }
}

async function addConfigCategories(environmentId: string, newCategories: string[]) {
  let storedCategories = await getConfigurationCategories(environmentId);
  if (storedCategories) {
    let toStore = Array.from(new Set([...storedCategories, ...newCategories]));
    await db.configCategories.update({
      where: { id: environmentId },
      data: { categories: toStore },
    });
  } else {
    await db.configCategories.create({
      data: { id: environmentId, categories: newCategories },
    });
  }
}

/**
 * Stores a record of parameters and references to all nested parameters. Storing of nested parameters is done recursively.
 * @param parentId ID of the parent object.
 * @param parentType Information about the type of parent (_'target-config'_ | _'machine-config'_ | _'parameter'_ | _'parent-config'_)
 * @param parameters Record of nested parameters.
 * @param newId Boolean determining if new IDs are to be generated.
 * @return References to nested parameter IDs.
 */
async function parametersToStorage(
  parentId: string,
  parentType: StoredParameter['parentType'],
  parameters: Record<string, Parameter>,
  newId: boolean = false,
) {
  Object.entries(parameters).forEach(async ([key, parameter]) => {
    parameter.id = newId ? v4() : parameter.id;
    await db.configParameter.create({
      data: {
        id: parameter.id,
        data: {
          ...parameter,
          key,
          parentId,
          parentType,
          parameters: await parametersToStorage(
            parameter.id!,
            'parameter',
            parameter.parameters,
            newId,
          ),
        },
      },
    });
  });
  return Object.values(parameters).map(({ id }) => id as string);
}

/**
 * Stores a given targetConfig into the new storage referencing other elements by id instead of having them nested. If called without a TargetConfig the async function returns void.
 * @param parentId ID of the parent object.
 * @param targetConfig TargetConfig that is to be stored, able to contain ParameterConfigs
 * @param newId Boolean determining if new IDs are to be generated.
 * @return ID of the TargetConfig that was stored.
 */
async function targetConfigToStorage(
  parentId: string,
  targetConfig: TargetConfig,
  newId: boolean = false,
) {
  if (targetConfig) {
    targetConfig.id = newId ? v4() : targetConfig.id;
    await db.targetConfig.create({
      data: {
        id: targetConfig.id,
        data: {
          ...targetConfig,
          parentId,
          metadata: await parametersToStorage(
            targetConfig.id,
            'target-config',
            targetConfig.metadata,
            newId,
          ),
          parameters: await parametersToStorage(
            targetConfig.id,
            'target-config',
            targetConfig.parameters,
            newId,
          ),
        },
      },
    });

    return targetConfig.id;
  }
}

/**
 * Stores a given MachineConfig into the new storage referencing other elements by id instead of having them nested.
 * @param parentId ID of the parent object.
 * @param machineConfig MachineConfigs that are to be stored, able to contain ParameterConfigs
 * @param newId Boolean determining if new IDs are to be generated.
 * @return IDs of the MachineConfigs that were stored.
 */
function machineConfigsToStorage(
  parentId: string,
  machineConfigs: MachineConfig[],
  newId: boolean = false,
) {
  machineConfigs.forEach(async (machineConfig) => {
    machineConfig.id = newId ? v4() : machineConfig.id;
    await db.machineConfig.create({
      data: {
        id: machineConfig.id,
        data: {
          ...machineConfig,
          parentId,
          metadata: await parametersToStorage(
            machineConfig.id,
            'machine-config',
            machineConfig.metadata,
            newId,
          ),
          parameters: await parametersToStorage(
            machineConfig.id,
            'machine-config',
            machineConfig.parameters,
            newId,
          ),
        },
      },
    });
  });

  return machineConfigs.map(({ id }) => id);
}

/**
 * Stores a given ParentConfig (or ParentConfigVersion) into db referencing other elements by id instead of having them nested.
 * @param parentConfig ParentConfig that is to be stored, able to contain TargetConfigs, MachineConfigs and ParameterConfigs
 * @param newId Boolean determining if new IDs are to be generated.
 * @param version Version-ID of the config if a versioned config is to be stored.
 */
async function parentConfigToStorage(
  parentConfig: ParentConfig,
  newId: boolean = false,
  version: string = '',
) {
  const { targetConfig, metadata, machineConfigs } = parentConfig;
  parentConfig.id = newId && !version ? v4() : parentConfig.id;
  let creationDate = new Date(parentConfig.createdOn);
  const toStore = {
    ...parentConfig,
    targetConfig: targetConfig
      ? await targetConfigToStorage(parentConfig.id, targetConfig, newId)
      : undefined,
    machineConfigs: await machineConfigsToStorage(parentConfig.id, machineConfigs, newId),
    metadata: await parametersToStorage(parentConfig.id, 'parent-config', metadata, newId),
  };

  if (version)
    await db.configVersion.create({
      data: { id: version, parentId: parentConfig.id, data: toStore },
    });
  else
    await db.config.create({
      data: {
        id: parentConfig.id,
        environmentId: parentConfig.environmentId,
        creatorId: parentConfig.createdBy,
        createdOn: creationDate,
        data: toStore,
      },
    });
  return parentConfig.id;
}

async function versionToParentConfigStorage(versionId: string) {
  let configVersionResult = await db.configVersion.findUnique({ where: { id: versionId } });
  let configVersion = configVersionResult?.data as unknown as StoredParentConfig;

  let originalConfigResult = await db.config.findUnique({ where: { id: configVersion.id } });
  let originalConfig = originalConfigResult?.data as unknown as StoredParentConfig;
  let environmentId = originalConfigResult?.environmentId || '';
  let versions = originalConfig.versions;

  // delete referenced parameters, machine- and targetconfigs - but keeps versions and parent config
  removeParentConfiguration(configVersion.id, true);

  const newLatestConfig = {
    ...configVersion,
    metadata: await asyncMap(configVersion.metadata, (id) =>
      copyParameter(id, configVersion.id, 'parent-config'),
    ),
    targetConfig:
      configVersion.targetConfig &&
      (await copyConfig(configVersion.targetConfig, 'target-config', configVersion.id)),
    machineConfigs: await asyncMap(configVersion.machineConfigs, (id) =>
      copyConfig(id, 'machine-config', configVersion.id),
    ),
  } as StoredParentConfig;

  // if no folder ID is given, set ID to root folder's
  if (!newLatestConfig.folderId) {
    newLatestConfig.folderId = (await getRootFolder(environmentId)).id;
  }

  const folderData = await getFolderById(newLatestConfig.folderId);
  if (!folderData) throw new Error('Folder not found');

  await db.config.update({
    where: { id: configVersion.id },
    data: { data: { ...newLatestConfig, versions } },
  });
}

/********************** Read Elements ****************************/

/**
 * Reads parameters and referenced parameters from stored data to return a nested structure.
 * @param parameterIds IDs of parameters that are to be returned
 * @return Returns a record of parameters.
 */
async function nestedParametersFromStorage(parameterIds: string[]) {
  const parameters: Record<string, Parameter> = {};

  await asyncForEach(parameterIds, async (id, idx) => {
    let storedParameterResult = await db.configParameter.findUnique({
      where: { id: id },
    });
    const storedParameter = storedParameterResult?.data as StoredParameter;
    if (storedParameter && storedParameter.key) {
      parameters[storedParameter.key] = {
        ...storedParameter,
        parameters: await nestedParametersFromStorage(storedParameter.parameters),
      };
    }
  });

  return parameters;
}

/**
 * Reads a single Machine- or Target-Config and its referenced parameters from stored data and returns a nested structure.
 * @param configType (_'target-config'_ | _'machine-config'_) Type of the config.
 * @param targetConfigId ID of Config that is to be returned
 * @return Returns a Config.
 */
async function nestedConfigFromStorage(
  configType: 'target-config',
  configId?: string,
): Promise<TargetConfig | undefined>;
async function nestedConfigFromStorage(
  configType: 'machine-config',
  configId?: string,
): Promise<MachineConfig | undefined>;
async function nestedConfigFromStorage<T extends TargetConfig | MachineConfig>(
  configType: T['type'],
  configId?: string,
) {
  if (!configId) return;

  let targetResult = await db.targetConfig.findUnique({ where: { id: configId } });
  let machineResult = await db.machineConfig.findUnique({ where: { id: configId } });

  let targetConvert: StoredTargetConfig = targetResult?.data as unknown as StoredTargetConfig;
  let machineConvert: StoredMachineConfig = machineResult?.data as unknown as StoredMachineConfig;

  const storedConfig = configType === 'target-config' ? targetConvert : machineConvert;

  if (!storedConfig) return;

  const config = {
    ...storedConfig,
    parameters: await nestedParametersFromStorage(storedConfig.parameters),
    metadata: await nestedParametersFromStorage(storedConfig.metadata),
  };

  if (configType === 'target-config') return config as TargetConfig;
  else return config as MachineConfig;
}

/**
 * Reads MachineConfigs and referenced parameters from stored data to return nested structures.
 * @param machineConfigIds ID of MachineConfigs that are to be returned
 * @return Returns MachineConfigs.
 */
async function nestedMachineConfigsFromStorage(
  machineConfigIds: string[],
): Promise<MachineConfig[]> {
  return await (
    await asyncMap(
      machineConfigIds,
      async (e, i) => await nestedConfigFromStorage('machine-config', e),
    )
  ).filter((config): config is MachineConfig => !!config);
}

/**
 * Returns a parentConfig based on Config id
 *
 * @throws {UnauthorizedError}
 */
export async function getDeepParentConfigurationById(
  parentConfigId: string,
  version: string = '',
  ability?: Ability,
): Promise<ParentConfig> {
  let configResult = await db.config.findUnique({ where: { id: parentConfigId } });
  let lastEdited = configResult?.lastEditedOn;
  let config = configResult?.data as unknown as StoredParentConfig;
  let versions = config.versions;

  if (version) {
    let configVersionResult = await db.configVersion.findUnique({
      where: { id: version },
    });
    config = configVersionResult?.data as unknown as StoredParentConfig;
  }

  // TODO: check if the user can access the config
  const parentConfig = {
    ...config,
    lastEditedOn: lastEdited,
    metadata: await nestedParametersFromStorage(config.metadata),
    targetConfig: await nestedConfigFromStorage('target-config', config.targetConfig),
    machineConfigs: await nestedMachineConfigsFromStorage(config.machineConfigs),
    versions: versions,
  } as unknown as ParentConfig;

  if (
    parentConfig &&
    false /*!ability.can('view', toCaslResource('MachineConfig', machineConfig))*/
  )
    throw new UnauthorizedError();

  return parentConfig;
}

/** Returns all shallow Configs in form of an array */
export async function getParentConfigurations(
  environmentId: string,
  ability?: Ability,
): Promise<ParentConfig[]> {
  const storedParentConfigs = await db.config.findMany({
    where: { environmentId: environmentId },
  });
  //TODO remove redundancy
  const parentConfigs = await asyncMap(storedParentConfigs, ({ id }) =>
    getDeepParentConfigurationById(id),
  );

  // TODO: further filtering to only show what the user can see needed?

  return ability
    ? parentConfigs /*ability.filter('view', 'MachineConfig', machineConfig)*/
    : parentConfigs;
}
/**
 * Returns an array of strings listing the available categories in an environment
 * @param environmentId ID of the environment for which the categories are to be retrieved
 * @returns categories as string[]
 */
export async function getConfigurationCategories(environmentId: string): Promise<string[]> {
  const categoriesResult = await db.configCategories.findUnique({
    where: { id: environmentId },
  });
  const categories = categoriesResult?.categories as string[];
  return categories;
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
  const parameterResult = await db.configParameter.findUnique({ where: { id: parameterId } });
  const parameter = parameterResult?.data as unknown as StoredParameter;
  if (!parameter) throw new Error(`Parameter with id ${parameterId} does not exist!`);
  if (changes.id) throw new Error('Invalid attempt to change the id of an existing parameter');
  const changed = StoredParameterZod.partial().parse(changes);

  // overwrite the current values with the changed ones
  await db.configParameter.update({
    where: { id: parameterId },
    data: { data: { ...parameter, ...changed } },
  });
}

export async function updateMachineConfig(configId: string, changes: Partial<StoredMachineConfig>) {
  const machineConfigResult = await db.machineConfig.findUnique({ where: { id: configId } });
  const machineConfig = machineConfigResult?.data as unknown as StoredMachineConfig;

  if (!machineConfig) throw new Error(`Machine config with id ${configId} does not exist!`);
  if (changes.id) throw new Error('Invalid attempt to change the id of an existing machine config');

  // TODO maybe add schema for parsing the changes

  await db.machineConfig.update({
    where: { id: configId },
    data: { data: { ...machineConfig, ...changes } },
  });
}

export async function updateTargetConfig(configId: string, changes: Partial<StoredTargetConfig>) {
  const targetConfigResult = await db.targetConfig.findUnique({ where: { id: configId } });
  const targetConfig = targetConfigResult?.data as unknown as StoredTargetConfig;

  if (!targetConfig) throw new Error(`Target config with id ${configId} does not exist!`);
  if (changes.id) throw new Error('Invalid attempt to change the id of an existing target config');

  // TODO maybe add schema for parsing the changes

  await db.targetConfig.update({
    where: { id: configId },
    data: { data: { ...targetConfig, ...changes } },
  });
}

export async function updateParentConfig(configId: string, changes: Partial<StoredParentConfig>) {
  const configResult = await db.config.findUnique({ where: { id: configId } });
  const config = configResult?.data as unknown as StoredParentConfig;

  if (!config) throw new Error(`Parent config with id ${configId} does not exist!`);
  if (changes.id) throw new Error('Invalid attempt to change the id of an existing parent config');

  // TODO maybe add schema for parsing the changes

  await db.config.update({
    where: { id: configId },
    data: { data: { ...config, ...changes } },
  });
}

/*************************** Element Removal ******************************/

/**
 * Removes a parameter and all its nested parameters from the store
 * will also remove the reference to the parameter from its parent element if it still exists
 *
 * //TODO: if we remove a whole tree we should not trigger a save on every change but only update the store after every change was done
 *
 * @param parameterId the id of the parameter to remove
 */
export async function removeParameter(parameterId: string) {
  const parameterResult = await db.configParameter.findUnique({ where: { id: parameterId } });
  const parameter = parameterResult?.data as unknown as StoredParameter;

  if (!parameter) return;

  // remove the reference to the parameter
  if (parameter.parentType === 'parameter') {
    const parentParameterResult = await db.configParameter.findUnique({
      where: { id: parameter.parentId },
    });
    const parentParameter = parentParameterResult?.data as unknown as StoredParameter;

    if (parentParameter) {
      parentParameter.parameters = parentParameter.parameters.filter((id) => id !== parameterId);
      await db.configParameter.update({
        where: { id: parameter.parentId },
        data: { data: parentParameter },
      });
    }
  } else if (parameter.parentType === 'parent-config') {
    const parentConfigResult = await db.config.findUnique({ where: { id: parameter.parentId } });
    const parentConfig = parentConfigResult?.data as unknown as StoredParentConfig;

    if (parentConfig) {
      parentConfig.metadata = parentConfig.metadata.filter((id) => id !== parameterId);
      await db.config.update({
        where: { id: parameter.parentId },
        data: { data: parentConfig },
      });
    }
  } else if (parameter.parentType === 'machine-config') {
    const parentConfigResult = await db.config.findUnique({ where: { id: parameter.parentId } });
    const parentConfig = parentConfigResult?.data as unknown as StoredMachineConfig;
    if (parentConfig) {
      parentConfig.metadata = parentConfig.metadata.filter((id) => id !== parameterId);
      parentConfig.parameters = parentConfig.parameters.filter((id) => id !== parameterId);
      await db.machineConfig.update({
        where: { id: parameter.parentId },
        data: { data: parentConfig },
      });
    }
  } else if (parameter.parentType === 'target-config') {
    const parentConfigResult = await db.config.findUnique({ where: { id: parameter.parentId } });
    const parentConfig = parentConfigResult?.data as unknown as StoredTargetConfig;
    if (parentConfig) {
      parentConfig.metadata = parentConfig.metadata.filter((id) => id !== parameterId);
      parentConfig.parameters = parentConfig.parameters.filter((id) => id !== parameterId);
      await db.targetConfig.update({
        where: { id: parameter.parentId },
        data: { data: parentConfig },
      });
    }
  }

  // recursively remove all referenced parameters
  await asyncForEach(parameter.parameters, async (id) => removeParameter(id));

  // remove the parameter from db
  await db.configParameter.delete({ where: { id: parameterId } });
  // TODO: remove all backlinks from linked parameters
}

/**
 * Removes a target config and all its nested parameters from the store
 * will also remove the reference to the target config from its parent config if it still exists
 *
 * //TODO: if we remove a whole tree we should not trigger a save on every change but only update the store after every change was done
 *
 * @param targetConfigId the id of the target config to remove
 */
export async function removeTargetConfig(targetConfigId: string) {
  const targetConfigResult = await db.targetConfig.findUnique({ where: { id: targetConfigId } });
  const targetConfig = targetConfigResult?.data as unknown as StoredTargetConfig;

  if (!targetConfig) return;

  // remove the reference to the target config from its the parent config
  const parentConfigResult = await db.config.findUnique({
    where: { id: targetConfig.parentId },
  });
  const parentConfig = parentConfigResult?.data as unknown as StoredParentConfig;
  if (parentConfig) {
    parentConfig.targetConfig = undefined;
    await db.config.update({
      where: { id: targetConfig.parentId },
      data: { data: parentConfig },
    });
  }

  // remove all referenced parameters
  await asyncForEach(targetConfig.metadata, async (id) => removeParameter(id));
  await asyncForEach(targetConfig.parameters, async (id) => removeParameter(id));

  // remove the target config from db
  await db.targetConfig.delete({ where: { id: targetConfigId } });
}

/**
 * Removes a machine config and all its nested parameters from the store
 * will also remove the reference to the machine config from its parent config if it still exists
 *
 * //TODO: if we remove a whole tree we should not trigger a save on every change but only update the store after every change was done
 *
 * @param machineConfigId the id of the machine config to remove
 */
export async function removeMachineConfig(machineConfigId: string) {
  const machineConfigResult = await db.machineConfig.findUnique({ where: { id: machineConfigId } });
  const machineConfig = machineConfigResult?.data as unknown as StoredMachineConfig;

  if (!machineConfig) return;

  // remove the reference to the machine config from its the parent config
  const parentConfigResult = await db.config.findUnique({
    where: { id: machineConfig.parentId },
  });
  const parentConfig = parentConfigResult?.data as unknown as StoredParentConfig;

  if (parentConfig) {
    parentConfig.machineConfigs = parentConfig.machineConfigs.filter(
      (id) => id !== machineConfigId,
    );
    await db.config.update({
      where: { id: machineConfig.parentId },
      data: { data: parentConfig },
    });
  }

  // remove all referenced parameters
  await asyncForEach(machineConfig.metadata, async (id) => removeParameter(id));
  await asyncForEach(machineConfig.parameters, async (id) => removeParameter(id));

  // remove the machine config from db
  await db.machineConfig.delete({ where: { id: machineConfigId } });
}

/**
 * Removes an existing parent config for a given ID from store.
 *
 * @param parentConfigId ID of the ParentConfig that is to be removed.
 * @param keepVersions only removes referenced parameters and configs but keeps versioned configs and parent config itself. Used to overwrite config with data from a stored version
 */
export async function removeParentConfiguration(
  parentConfigId: string,
  keepVersions: boolean = false,
) {
  const parentConfigResult = await db.config.findUnique({ where: { id: parentConfigId } });
  const parentConfig = parentConfigResult?.data as unknown as StoredParentConfig;

  if (!parentConfig) return;

  const parentConfigVersionsResult = await db.configVersion.findMany({
    where: { parentId: parentConfigId },
  });

  if (parentConfig.targetConfig) await removeTargetConfig(parentConfig.targetConfig);
  await asyncForEach(parentConfig.machineConfigs, (id) => removeMachineConfig(id));
  await asyncForEach(parentConfig.metadata, (id) => removeParameter(id));

  // for each version removing TargetConfig, MachineConfigs and Parameters and finally removing the configVersion itself
  if (!keepVersions) {
    const parentConfigVersions = parentConfigVersionsResult.map(
      (element) => element.data,
    ) as unknown as StoredParentConfig[];

    await asyncForEach(parentConfigVersions, async (configVersion) => {
      if (configVersion.targetConfig) await removeTargetConfig(configVersion.targetConfig);
      await asyncForEach(configVersion.machineConfigs, (id) => removeMachineConfig(id));
      await asyncForEach(configVersion.metadata, (id) => removeParameter(id));
      await db.configVersion.delete({ where: { id: configVersion.version } });
    });

    // remove from db
    await db.config.delete({ where: { id: parentConfigId } });
  }
}
