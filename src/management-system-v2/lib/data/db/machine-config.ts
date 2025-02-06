'use server';

import { v4 } from 'uuid';
import {
  AbstractConfigInputSchema,
  MachineConfig,
  Parameter,
  ParentConfig,
  StoredMachineConfig,
  StoredParameter,
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

// TODO
export async function addParentConfig(
  machineConfigInput: ParentConfig,
  environmentId: string,
  base?: ParentConfig,
) {
  const { userId } = await getCurrentUser();
  const parentConfigData = AbstractConfigInputSchema.parse(machineConfigInput);
  const date = new Date();
  const newConfig: ParentConfig = {
    ...({
      id: v4(),
      type: 'config',
      name: 'Default Parent Configuration',
      variables: [],
      createdBy: userId,
      lastEditedBy: userId,
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

  newConfig.folderId = (await getRootFolder(environmentId)).id;
  newConfig.environmentId = environmentId;

  const folderData = await getFolderById(newConfig.folderId);
  if (!folderData) throw new Error('Folder not found');
  let idCollision = false;
  const { id: parentConfigId } = newConfig;

  const existingConfig = await db.config.findUnique({
    where: {
      id: parentConfigId,
    },
  });
  if (existingConfig) {
    //   throw new Error(`Config with id ${parentConfigId} already exists!`);
    idCollision = true;
  }

  try {
    await parentConfigToStorage(newConfig, idCollision);
    // eventHandler.dispatch('machineConfigAdded', { machineConfig: newConfig });

    return newConfig;
  } catch (e: unknown) {
    const error = e as Error;
    return userError(error.message ?? "Couldn't create Machine Config");
  }
}

export async function addTargetConfig(parentConfigId: string, targetConfig: TargetConfig) {
  //   const parentConfig = storedData.parentConfigs[parentConfigId];
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
    data: { data: { ...parentConfig } },
  });
}

//   export async function addMachineConfig(
//     parentConfigId: string,
//     machineConfig: MachineConfig,
//     newId: boolean = false,
//   ) {
//     const parentConfig = storedData.parentConfigs[parentConfigId];
//     if (!parentConfig)
//       throw new Error(`There is no parent configuration with the id ${parentConfigId}.`);

//     machineConfigsToStorage(parentConfigId, [machineConfig], newId);
//     store.set('techData', 'machineConfigs', storedData.machineConfigs);
//     store.set('techData', 'parameters', storedData.parameters);

//     parentConfig.machineConfigs.push(machineConfig.id);
//     store.set('techData', 'parentConfigs', storedData.parentConfigs);
//   }

//   export async function addParameter(
//     parentId: string,
//     parentType: StoredParameter['parentType'],
//     targetMember: 'parameters' | 'metadata',
//     key: string,
//     parameter: Parameter,
//   ) {
//     if (parentType === 'parent-config') {
//       const parent = storedData.parentConfigs[parentId];
//       if (!parent) throw new Error(`There is no parent configuration with the id ${parentId}.`);
//       if (targetMember === 'parameters') throw new Error('Parent Configurations have no parameters.');

//       parent[targetMember].push(parameter.id!);
//       parametersToStorage(parent.id, parentType, { [key]: parameter });
//       store.set('techData', 'parameters', storedData.parameters);
//       store.set('techData', 'parentConfigs', storedData.parentConfigs);
//     } else if (parentType === 'machine-config') {
//       const parent = storedData.machineConfigs[parentId];
//       if (!parent) throw new Error(`There is no machine configuration with the id ${parentId}.`);

//       parent[targetMember].push(parameter.id!);
//       parametersToStorage(parent.id, parentType, { [key]: parameter });
//       store.set('techData', 'parameters', storedData.parameters);
//       store.set('techData', 'machineConfigs', storedData.machineConfigs);
//     } else if (parentType === 'target-config') {
//       const parent = storedData.targetConfigs[parentId];
//       if (!parent) throw new Error(`There is no target configuration with the id ${parentId}.`);

//       parent[targetMember].push(parameter.id!);
//       parametersToStorage(parent.id, parentType, { [key]: parameter });
//       store.set('techData', 'parameters', storedData.parameters);
//       store.set('techData', 'targetConfigs', storedData.targetConfigs);
//     } else if (parentType === 'parameter') {
//       const parent = storedData.parameters[parentId];
//       if (!parent) throw new Error(`There is no parameter with the id ${parentId}.`);
//       if (targetMember === 'metadata') throw new Error('Parent Configurations have no metadata.');

//       parent[targetMember].push(parameter.id!);
//       parametersToStorage(parent.id!, parentType, { [key]: parameter });
//       store.set('techData', 'parameters', storedData.parameters);
//       store.set('techData', 'targetConfigs', storedData.targetConfigs);
//     }
//   }

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
  targetConfig?: TargetConfig,
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
 * Stores a given ParentConfig into the new storage referencing other elements by id instead of having them nested.
 * @param parentConfig ParentConfig that is to be stored, able to contain TargetConfigs, MachineConfigs and ParameterConfigs
 * @param newId Boolean determining if new IDs are to be generated.
 */
async function parentConfigToStorage(parentConfig: ParentConfig, newId: boolean = false) {
  const { targetConfig, metadata, machineConfigs } = parentConfig;

  parentConfig.id = newId ? v4() : parentConfig.id;
  await db.config.create({
    data: {
      id: parentConfig.id,
      environmentId: parentConfig.environmentId,
      creatorId: parentConfig.createdBy,
      data: {
        ...parentConfig,
        targetConfig: await targetConfigToStorage(parentConfig.id, targetConfig, newId),
        machineConfigs: await machineConfigsToStorage(parentConfig.id, machineConfigs, newId),
        metadata: await parametersToStorage(parentConfig.id, 'parent-config', metadata, newId),
      },
    },
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

  //   parameterIds.forEach(async (id) => {
  await asyncForEach(parameterIds, async (id, idx) => {
    let storedParameterResult = await db.configParameter.findUnique({
      where: { id: id },
    });
    // console.log('RESULT:\n', storedParameterResult);
    const storedParameter = storedParameterResult?.data as StoredParameter;
    // console.log('conv:\n', storedParameter);
    if (storedParameter && storedParameter.key) {
      //   console.log('storing..');
      parameters[storedParameter.key] = {
        ...storedParameter,
        parameters: await nestedParametersFromStorage(storedParameter.parameters),
      };
      //   console.log(parameters);
    }
  });

  //   console.log(parameters);
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

  //   const storedConfig =
  //     configType === 'target-config'
  //       ? storedData.targetConfigs[configId]
  //       : storedData.machineConfigs[configId];

  let targetResult = await db.targetConfig.findUnique({ where: { id: configId } });
  let machineResult = await db.machineConfig.findUnique({ where: { id: configId } });

  //   console.log('targetResult: \n', targetResult);
  let targetConvert: StoredTargetConfig = targetResult?.data as unknown as StoredTargetConfig;
  let machineConvert: StoredMachineConfig = machineResult?.data as unknown as StoredMachineConfig;

  //   console.log('targetConvert: \n', targetConvert);

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
  //   return machineConfigIds
  //     .map((machineConfigId) => {
  //       return nestedConfigFromStorage('machine-config', machineConfigId);
  //     })
  //     .filter((config): config is MachineConfig => !!config);

  //   return asyncMap(
  //     machineConfigIds,
  //     async (e, i) => await nestedConfigFromStorage('machine-config', e),
  //   );
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
  ability?: Ability,
): Promise<ParentConfig> {
  //   const storedParentConfig = storedData.parentConfigs[parentConfigId];
  let configResult = await db.config.findUnique({
    where: { id: parentConfigId },
  });
  let configInter = configResult?.data ?? {};
  //   let configConvert: StoredParentConfig = JSON.parse(configInter.toString());
  let configConvert = configResult?.data as unknown as StoredParentConfig;
  console.log('PARENT: \n', configConvert);

  // TODO: check if the user can access the config

  const parentConfig = {
    ...configConvert,
    metadata: await nestedParametersFromStorage(configConvert.metadata),
    targetConfig: await nestedConfigFromStorage('target-config', configConvert.targetConfig),
    machineConfigs: await nestedMachineConfigsFromStorage(configConvert.machineConfigs),
  } as unknown as ParentConfig;
  console.log('LOADED: \n', parentConfig);

  if (
    parentConfig &&
    false /*!ability.can('view', toCaslResource('MachineConfig', machineConfig))*/
  )
    throw new UnauthorizedError();

  return parentConfig;
}
