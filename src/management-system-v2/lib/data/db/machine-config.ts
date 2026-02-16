'use server';

import { v4 } from 'uuid';
import {
  AasConceptDescription,
  AasJson,
  AasOperation,
  AasProperty,
  AasSubmodel,
  AasSubmodelElement,
  AasSubmodelZod,
  Config,
  LinkedParameter,
  MachineVersionReference,
  Parameter,
  StoredConfig,
  StoredConfigZod,
  StoredParameter,
  StoredParameterZod,
  StoredVirtualParameter,
  VirtualParameter,
} from '../machine-config-schema';
import { getFolderById, getRootFolder } from './folders';
import db from '.';
import { UserError, userError } from '@/lib/user-error';
import { getCurrentUser } from '@/components/auth';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { asyncFilter, asyncForEach, asyncMap } from '@/lib/helpers/javascriptHelpers';
import {
  buildLinkedInputParametersFromIds,
  createTdsTemplateMachineDatasetHeader,
  defaultConfiguration,
  defaultMachineDataSet,
  defaultOrganizationConfigurationTemplate,
  defaultParameter,
  defaultParentConfiguration,
  defaultUserParameterTemplate,
  findParameter,
  findPathToParameter,
} from '@/app/(dashboard)/[environmentId]/machine-config/configuration-helper';
import mqtt from 'mqtt';
import jsonata from 'jsonata';
import { possiblyNumber } from '@/lib/utils';
import { z } from 'zod';
import { getUserById } from './iam/users';
import { getMembers } from './iam/memberships';
import { Membership } from '@prisma/client';
import { truthyFilter } from '@/lib/typescript-utils';

const IntSchema = z.number().int();
type Int = z.infer<typeof IntSchema>;

let dataToParentConfigTable: {
  id: string;
  environmentId: string;
  creatorId: string;
  createdOn: Date;
  data: StoredConfig;
}[] = [];
let dataToConfigParameterTable: { id: string; data: StoredParameter }[] = [];
let dataToConfigVersionTable: {
  configId: string;
  versionNo: Int;
  versionData: Config;
  machineDatasets: MachineVersionReference[];
}[] = [];
let dataToMachineVersionTable: {
  machineId: string;
  versionNo: Int;
  structureNo: Int;
  updateNo: Int;
  data: Parameter;
  acknowledged: boolean;
  configId: string;
}[] = [];

let dataUpdatedInParentConfigTable: { id: string; data: StoredConfig }[] = [];
let dataUpdatedInConfigParameterTable: { id: string; data: StoredParameter }[] = [];
let dataUpdatedInConfigVersionTable: {
  configId: string;
  versionNo: Int;
  versionData: Config;
  machineDatasets: MachineVersionReference[];
}[] = [];
let dataUpdatedInMachineVersionTable: {
  machineId: string;
  versionNo: Int;
  structureNo: Int;
  updateNo: Int;
  machineDataset: Parameter;
}[] = [];

let dataRemovedFromParentConfigTable: string[] = [];
let dataRemovedFromConfigParameterTable: string[] = [];
let dataRemovedFromConfigVersionTable: { configId: string; versionNo: Int }[] = [];
let dateRemovedFromMachineVersionTable: {
  machineId: string;
  versionNo: Int;
  structureNo: Int;
  updateNo: Int;
}[] = [];

// (parentId: string, parentType: StoredParameter["parentType"], parameters: Record<string, Parameter>, newId?: boolean)

/**
 * Creates a copy of a parameter and all its nested parameters to be pasted as child of a given parent. Stores the copied parameter.
 * @param parameterId ID of the parameter which is to be copied.
 * @param parentId ID of the parent where the parameter is to be copied to.
 * @param parentType Type of the parent. (_'parameter'_ | _'config'_)
 * @return Returns the newly generated ID for the parameter.
 * @throws {Error} if the ID of the parameter does not exist.
 */
export async function copyParameter(
  parameterId: string,
  parentId: string,
  parentType: 'parameter' | 'config',
) {
  const storedParameterResult = await db.configParameter.findUnique({ where: { id: parameterId } });
  const storedParameter = storedParameterResult?.data as StoredParameter;

  if (!storedParameter) throw new Error(`Parameter with id ${parameterId} does not exist!`);

  // this creates a deep clone of the element to prevent changes in the content of one to affect the other
  const copy = StoredParameterZod.parse(storedParameter);

  const newId = v4();
  copy.id = newId;
  copy.parentId = parentId;
  copy.parentType = parentType;

  // recursively copy all referenced parameters
  copy.subParameters = await asyncMap(copy.subParameters, (id) =>
    copyParameter(id, newId, 'parameter'),
  );

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
// COPYINNG OF SUBCONFIGS IS NOW CONSIDERED COPYING OF PARAMETERS

// export async function copyConfig(
//   configId: string,
//   configType: Exclude<AbstractConfig['type'], 'config'>,
//   parentId: string,
// ) {
//   let config;
//   if (configType === 'target-config') {
//     const targetResult = await db.targetConfig.findUnique({ where: { id: configId } });
//     config = targetResult?.data as unknown as StoredTargetConfig;
//   } else {
//     const machineResult = await db.machineConfig.findUnique({ where: { id: configId } });
//     config = machineResult?.data as unknown as StoredMachineConfig;
//   }

//   if (!config) throw new Error(`${configType} with id ${configId} does not exist`);

//   // deep copy the config
//   const copy = JSON.parse(JSON.stringify(config)) as typeof config;

//   const newId = v4();
//   copy.id = newId;
//   copy.parentId = parentId;

//   [copy.parameters, copy.metadata] = await Promise.all([
//     asyncMap(copy.parameters, (id) => copyParameter(id, newId, configType)),
//     asyncMap(copy.metadata, (id) => copyParameter(id, newId, configType)),
//   ]);

//   if (configType === 'target-config') {
//     await db.targetConfig.create({ data: { id: copy.id, data: copy } });
//   } else {
//     await db.machineConfig.create({ data: { id: copy.id, data: copy } });
//   }

//   return newId;
// }

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
  environmentId: string,
  name?: string,
  shortName?: string,
  category?: string[],
  description?: string,
) {
  if (!originalId) return;

  try {
    const originalConfigResult = await db.config.findUnique({ where: { id: originalId } });
    if (!originalConfigResult) {
      throw new Error(`Config with id ${originalId} does not exist!`);
    }
    const originalConfig = originalConfigResult?.data as unknown as StoredConfig;

    const { userId } = await getCurrentUser();
    const newId = v4();
    const date = new Date();
    const copy = {
      ...(JSON.parse(JSON.stringify(originalConfig)) as typeof originalConfig),
      environmentId,
      createdBy: userId,
      createdOn: date,
      lastEditedOn: date,
      id: newId,
      // TODO duplicate virtual paramters pointing to the same config data might currently be possible
      // maybe reuse the linkpath provided my the origins meta data
      name: {
        value: name || `${originalConfig.name.value} (Copy)`,
        linkValueToParameterValue: originalConfig.name.linkValueToParameterValue,
      },
      shortName: {
        value: shortName || `${originalConfig.shortName.value} (Copy)`,
        linkValueToParameterValue: originalConfig.shortName.linkValueToParameterValue,
      },
      description: {
        value: description || `${originalConfig.description.value} (Copy)`,
        linkValueToParameterValue: originalConfig.description.linkValueToParameterValue,
      },
      category: {
        value: category || `${originalConfig.category.value} (Copy)`,
        linkValueToParameterValue: originalConfig.category.linkValueToParameterValue,
      },
      content: [],
      originalId,
    } as StoredConfig;

    copy.content = await asyncMap(originalConfig.content, (id) =>
      copyParameter(id, newId, 'config'),
    );

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
 * @param configInput         Config which is to be stored in the DB
 * @param environmentId       Environment ID of the user's space
 * @param throwCollisionError Determines if an error is thrown when a collision of IDs occurs. If not a new ID is generated for the config which is added. Default: false
 * @returns ID of the stored config
 */
export async function addParentConfig(configInput: Config, environmentId: string, userId?: string) {
  try {
    let newUserId = userId || (await getCurrentUser()).userId;
    // const { userId } = await getCurrentUser();
    const folderId = (await getRootFolder(environmentId)).id;
    const defaultConfig = defaultParentConfiguration(
      environmentId,
      folderId,
      configInput.name.value,
      configInput.shortName.value,
      configInput.description.value,
      configInput.category.value.split(';'),
    );
    const newConfig: Config = {
      ...defaultConfig,
      ...configInput,
    };

    newConfig.createdBy = newUserId;
    newConfig.folderId = folderId;
    newConfig.environmentId = environmentId;

    const folderData = await getFolderById(newConfig.folderId);
    if (!folderData) throw new Error('Folder not found');
    const { id: parentConfigId } = newConfig;

    const existingConfig = await db.config.findUnique({ where: { id: parentConfigId } });
    if (existingConfig) {
      throw new Error(`Config with id ${parentConfigId} already exists!`);
    }
    let storeId = await parentConfigToStorage(newConfig);
    await addConfigCategories(environmentId, newConfig.category.value.split(';'));
    await storeAllCachedData();
    return { storeId };
  } catch (e: unknown) {
    const error = e as Error;
    return userError(error.message ?? "Couldn't create Config");
  }
}

/**
 * This adds a new version for a parent configuration to the db.
 * @param configInput Config for which a version is created.
 * @param environmentId Environment ID for the current space.
 * @param versionId ID for the version that is to be created.
 * @param versionName Name for the version that is to be created.
 * @param versionDescription Description for the version that is to be created.
 * @returns returns the newly created config version in the case of no errors. Otherwise returns UserError.
 */
export async function addParentConfigVersion(versionedConfig: Config, versionNo: Int) {
  const previousVersion = versionedConfig.latestVersionNumber;

  const versionNoParameter = extractParameter(versionedConfig, ['Header', 'VersionNumber']);
  if (versionNoParameter) versionNoParameter.value = versionNo.toString();
  else throw new Error('Config does not contain a version parameter.');

  const machineConfigContainer = extractParameter(versionedConfig, [
    'Body',
    'MachineDatasets',
  ]) as Parameter;
  // getting a copy of the machineConfigs
  const machineConfigs = JSON.parse(JSON.stringify(machineConfigContainer)) as Parameter;
  // removing the machineConfigs from the config version, since they are to be stored separately
  machineConfigContainer.subParameters = [];
  let versionHistory: MachineVersionReference[] = [];

  try {
    let machineVersionList: { id: string; fullVersion: Int[] }[] = [];

    if (previousVersion) {
      let latestVersionedConfig = await db.configVersion.findUnique({
        where: {
          configVersion: {
            configId: versionedConfig.id,
            versionNo: previousVersion,
          },
        },
      });
      if (latestVersionedConfig) {
        // console.log('previous version exists..');
        // check latest version for changes

        let machineVersionReferences =
          latestVersionedConfig.machineDatasets as MachineVersionReference[];

        if (machineVersionReferences.length) {
          // console.log('information about previous machineConfigs exist...');
          versionHistory = machineVersionReferences;
          // if there were machineConfigs in the previous version

          let versionedMachineConfigs = await asyncMap(
            machineVersionReferences,
            async (machineReference) => {
              return machineMapping(machineReference, previousVersion, versionNo, machineConfigs);
            },
          );
          machineVersionList = versionedMachineConfigs.filter(truthyFilter);
          const versionedMachineConfigIds = machineVersionList.map((e) => e.id);
          const untrackedMachineVersions = (machineConfigs.subParameters as Parameter[]).filter(
            (e) => !machineVersionReferences.map((e) => e.machineDatasetId).includes(e.id),
          );
          // adding all untracked machineConfig as versionNo.0.0
          const untrackedMachineVersionList = untrackedMachineVersions.map((e) => ({
            id: e.id,
            fullVersion: [versionNo, 1, 0],
          }));
          machineVersionList.push(...untrackedMachineVersionList);
        } else {
          // no machineConfig was tracked so we don't have to compare: versionNo.0.0
          const untrackedMachineVersionList = (machineConfigs.subParameters as Parameter[]).map(
            (e) => ({
              id: e.id,
              fullVersion: [versionNo, 1, 0],
            }),
          );
          machineVersionList.push(...untrackedMachineVersionList);
        }
      } else {
        // TODO: handle: version cannot be loaded / is referenced but does not exist in DB
      }
    } else {
      // no previous version so versionNo is 1 and everything is 1.0.0
      const untrackedMachineVersionList = (machineConfigs.subParameters as Parameter[]).map(
        (e) => ({
          id: e.id,
          fullVersion: [versionNo, 1, 0],
        }),
      );
      machineVersionList.push(...untrackedMachineVersionList);
    }

    // storing all curreng machineConfigs with their previously calculated version
    const newMachineVersionReferences = await parametersToMachineStorage(
      machineVersionList,
      versionHistory,
      machineConfigs.subParameters,
      versionedConfig.id,
      machineConfigContainer.id,
    );

    if (versionNo != previousVersion) {
      dataToConfigVersionTable.push({
        configId: versionedConfig.id,
        versionNo: versionNo,
        versionData: versionedConfig,
        machineDatasets: newMachineVersionReferences,
      });
    } else {
      dataUpdatedInConfigVersionTable.push({
        configId: versionedConfig.id,
        versionNo: versionNo,
        versionData: versionedConfig,
        machineDatasets: newMachineVersionReferences,
      });
    }

    // storing each machineConfig with its version in db &
    // storing the config version and the references to its machineConfigs
    await storeAllCachedData();
    await updateAllCachedData();
    await clearChangeTags(versionedConfig.id);
  } catch (e: unknown) {
    const error = e as Error;
    return userError(error.message ?? 'There was an error creating this version.');
  }
}

export async function addMachineConfigVersion(
  previousMachine: Parameter,
  currentMachine: Parameter,
  versionNo: Int,
) {}

// TODO rework: versioning
/**
 * Copies the data of a specific config-version into the editable "main-config" displayed as latest version.
 * @param machineConfigInput The config-version that is to be set as latest version.
 * @returns Returns the config if no errors occur. Otherwise a UserError is returned.
 */
export async function setParentConfigVersionAsLatest(versionId: string) {
  try {
    versionToConfigStorage(versionId);
  } catch (e: unknown) {
    const error = e as Error;
    return userError(error.message ?? "Couldn't create Machine Config");
  }
}

// TODO rework: handling of subConfigs (target, reference, machine)
// export async function addTargetConfig(parentConfigId: string, targetConfig: TargetConfig) {
//   const parentConfigResult = await db.config.findUnique({ where: { id: parentConfigId } });
//   const parentConfig = parentConfigResult?.data as unknown as StoredParentConfig;
//   if (!parentConfig)
//     throw new Error(`There is no parent configuration with the id ${parentConfigId}.`);

//   if (parentConfig.targetConfig)
//     throw new Error(`The parent configuration already has a target configuration.`);

//   await targetConfigToStorage(parentConfigId, targetConfig);
//   await storeAllCachedData();

//   parentConfig.targetConfig = targetConfig.id;
//   await db.config.update({
//     where: { id: parentConfig.id },
//     data: { data: parentConfig },
//   });
// }

// export async function addMachineConfig(
//   parentConfigId: string,
//   machineConfig: MachineConfig,
//   newId: boolean = false,
// ) {
//   // const parentConfig = storedData.parentConfigs[parentConfigId];

//   const parentConfigResult = await db.config.findUnique({ where: { id: parentConfigId } });
//   const parentConfig = parentConfigResult?.data as unknown as StoredParentConfig;

//   if (!parentConfig)
//     throw new Error(`There is no parent configuration with the id ${parentConfigId}.`);

//   await machineConfigsToStorage(parentConfigId, [machineConfig], newId);
//   await storeAllCachedData();

//   parentConfig.machineConfigs.push(machineConfig.id);
//   await db.config.update({
//     where: { id: parentConfig.id },
//     data: { data: parentConfig },
//   });
// }

export const updateBacklinks = async (
  idListFilter: (LinkedParameter | undefined)[],
  field: Parameter | VirtualParameter | StoredParameter | StoredVirtualParameter,
  operation: 'remove' | 'add',
  parentConfigId: string,
) => {
  if (!field.id) return;
  //let fieldPath = buildLinkedInputParametersFromIds([field.id], parentConfig)[0].path;
  const parentConfig = await getDeepConfigurationById(parentConfigId);

  for (let element of idListFilter) {
    if (element) {
      let ref = findParameter(element.id, parentConfig, 'config')?.selection;
      if (ref) {
        if (operation === 'remove') {
          await updateParameter(
            ref.id!,
            {
              usedAsInputParameterIn: ref.usedAsInputParameterIn.filter((item) => {
                return item.id !== field.id;
              }),
              hasChanges: false,
            },
            parentConfigId,
          );
        } else {
          if (!ref.usedAsInputParameterIn?.map(({ id, path }) => id).includes(field.id))
            if (ref.usedAsInputParameterIn) {
              await updateParameter(
                ref.id!,
                {
                  usedAsInputParameterIn: [
                    ...ref.usedAsInputParameterIn,
                    { id: field.id, path: [] },
                  ],
                  hasChanges: false,
                },
                parentConfigId,
              );
            } else {
              await updateParameter(
                ref.id!,
                {
                  usedAsInputParameterIn: [{ id: field.id, path: [] }],
                  hasChanges: false,
                },
                parentConfigId,
              );
            }
        }
      }
    }
  }
};

export async function addParameter(
  parentId: string,
  parentType: StoredParameter['parentType'],
  parameter: Parameter,
  parentConfigId: string,
) {
  if (await permissionCheck(parentConfigId)) {
    throw new UnauthorizedError();
  }
  const parentConfigResult = await db.config.findUnique({ where: { id: parentConfigId } });
  const parentConfig = parentConfigResult?.data as unknown as StoredConfig;
  if (!parentConfig) throw new Error(`Config with id ${parentConfigId} does not exist!`);

  parameter.hasChanges = true;

  // calculating initial transformation value if transformation is set before storing
  if (parameter.transformation && parameter.transformation.transformationType !== 'none') {
    await updateBacklinks(
      Object.values(parameter.transformation.linkedInputParameters),
      parameter,
      'add',
      parentConfigId,
    );

    let calculatedValue = null;

    if (parameter.transformation.transformationType === 'linked') {
      // get the single linked parameter's value
      const linkedParamIds = Object.values(parameter.transformation.linkedInputParameters);
      if (linkedParamIds.length > 0) {
        const linkedParamResult = await db.configParameter.findUnique({
          where: { id: linkedParamIds[0].id },
        });
        if (
          linkedParamResult &&
          linkedParamResult.data &&
          'valueTemplateSource' in (linkedParamResult.data as StoredVirtualParameter)
        ) {
          const linkedParam = linkedParamResult.data as StoredVirtualParameter;
          calculatedValue = parentConfig[linkedParam.valueTemplateSource].value;
        } else {
          calculatedValue = (linkedParamResult?.data as StoredParameter)?.value;
        }
      }
    } else if (parameter.transformation.transformationType === 'algorithm') {
      // calculate from formula
      const inputValues: Record<string, any> = {};
      for (const [key, inputParam] of Object.entries(
        parameter.transformation.linkedInputParameters,
      )) {
        const inputParamResult = await db.configParameter.findUnique({
          where: { id: inputParam.id },
        });
        if (
          inputParamResult &&
          inputParamResult.data &&
          'valueTemplateSource' in (inputParamResult.data as StoredVirtualParameter)
        ) {
          const inputParam = inputParamResult.data as StoredVirtualParameter;
          inputValues[key.substring(1)] = possiblyNumber(
            parentConfig[inputParam.valueTemplateSource].value ?? '',
          );
        } else {
          inputValues[key.substring(1)] = possiblyNumber(
            (inputParamResult?.data as StoredParameter)?.value ?? '',
          );
        }
      }

      try {
        calculatedValue = String(
          await jsonata(parameter.transformation.action).evaluate(null, inputValues),
        );
      } catch (error) {
        calculatedValue = null;
      }
    }

    // update the newly created parameter with the calculated value before storing
    if (calculatedValue !== null) {
      parameter.value = calculatedValue;
    }
  }

  // store the parameter with the correct valu already srt
  if (parentType === 'config') {
    const parentConfigResult = await db.config.findUnique({ where: { id: parentId } });
    const parentConfig = parentConfigResult?.data as unknown as StoredConfig;
    if (!parentConfig) throw new Error(`There is no parent configuration with the id ${parentId}.`);
    parentConfig.content.push(parameter.id);
    await parametersToStorage(parentConfig.id, parentType, [parameter]);
    await storeAllCachedData();
    await db.config.update({
      where: { id: parentConfig.id },
      data: { data: parentConfig },
    });
  } else if (parentType === 'parameter') {
    const parentParameterResult = await db.configParameter.findUnique({ where: { id: parentId } });
    const parentParameter = parentParameterResult?.data as unknown as StoredParameter;
    if (!parentParameter) throw new Error(`There is no parameter with the id ${parentId}.`);
    parentParameter.subParameters.push(parameter.id);
    await parametersToStorage(parentParameter.id, parentType, [parameter]);
    await storeAllCachedData();
    await db.configParameter.update({
      where: { id: parentParameter.id },
      data: { data: parentParameter },
    });
  }

  await updateParentConfig(parentConfigId, { hasChanges: true });

  const fullConfig = await getDeepConfigurationById(parentConfigId);
  const parameterPath = findPathToParameter(parameter.id, fullConfig, [], 'config');
  if (fullConfig.configType == 'organization') {
    if (
      parameterPath.slice(0, 2).toString() ==
      ['identity-and-access-management', 'common-user-data'].toString()
    ) {
      // a new IAM common-user-data parameter is added
      await addCommonUserDataPropagation(parameter, parameterPath.slice(2, -1), fullConfig);
    } else if (
      parameterPath.slice(0, -1).toString() == ['identity-and-access-management', 'user'].toString()
    ) {
      // a new user parameter is added
      addUserParameterDataImport(parameter, fullConfig);
    }
  }
}

async function addCommonUserDataPropagation(
  parameter: Parameter,
  internalPath: string[],
  orgConfig: Config,
) {
  const users = extractParameter(orgConfig, ['identity-and-access-management', 'user']);
  if (users) {
    asyncForEach(users.subParameters, async (userParameter: Parameter) => {
      const parentParameter =
        internalPath.length === 0
          ? extractParameterFromParameter(userParameter, ['data'])
          : extractParameterFromParameter(userParameter, ['data', ...internalPath]);
      if (parentParameter) {
        // copy parameter
        const parameterCopy = JSON.parse(JSON.stringify(parameter));
        // create new ID for copied parameter
        parameterCopy.id = v4();
        parameterCopy.changeableByUser = false;
        await addParameter(parentParameter.id, 'parameter', parameterCopy, orgConfig.id);
      } else {
        // TODO error: internal parent could not be determined
      }
    });
  } else {
    // TODO error for missing users parameter
  }
}

async function addUserParameterDataImport(parameter: Parameter, orgConfig: Config) {
  const dataParent = extractParameterFromParameter(parameter, ['data']);
  const commonUserData = extractParameter(orgConfig, [
    'identity-and-access-management',
    'common-user-data',
  ]);
  if (commonUserData && dataParent) {
    const subparameterKeys = await asyncMap(
      commonUserData.subParameters,
      async (commonUserParameter: Parameter) => {
        return await copyParameter(commonUserParameter.id, dataParent.id, 'parameter');
      },
    );
    await updateParameter(dataParent.id, { subParameters: subparameterKeys }, orgConfig.id);
    asyncForEach(subparameterKeys, async (paramId) => {
      await updateParameter(paramId, { changeableByUser: false }, orgConfig.id);
    });
  } else {
    // TODO error for missing users parameter
  }
}

export async function addMachineDataSet(parentConfig: Config, name: string, displayName: string) {
  const basePath = ['Body', 'MachineDatasets', name];
  const alreadyExists = extractParameter(parentConfig, basePath);
  if (alreadyExists) {
    throw new Error(`Machine Data Set with name ${name} already exists.`);
  }
  const newMachineDataSet = defaultMachineDataSet(parentConfig, name, displayName);
  const TDSIdentifier = extractParameter(parentConfig, ['Header', 'TDSIdentifier']);
  const VersionNumber = extractParameter(parentConfig, ['Header', 'VersionNumber']);
  const AcknowledgeModeDefault = extractParameter(parentConfig, [
    'Header',
    'AcknowledgeModeDefault',
  ]);

  const machineIdentifier = extractParameterFromParameter(newMachineDataSet, [
    'Header',
    'TDSIdentifier',
  ]);
  const machineStructureVersionNumber = extractParameterFromParameter(newMachineDataSet, [
    'Header',
    'StructureVersionNumber',
  ]);
  const machineVersionNumber = extractParameterFromParameter(newMachineDataSet, [
    'Header',
    'VersionNumber',
  ]);
  const machineFullVersionNumber = extractParameterFromParameter(newMachineDataSet, [
    'Header',
    'FullVersionNumber',
  ]);
  const machineAcknowledgeMode = extractParameterFromParameter(newMachineDataSet, [
    'Header',
    'AcknowledgeMode',
  ]);

  if (
    machineFullVersionNumber?.transformation &&
    VersionNumber &&
    machineStructureVersionNumber &&
    machineVersionNumber
  ) {
    machineFullVersionNumber.transformation.linkedInputParameters['$IN1'].id = VersionNumber.id;
    machineFullVersionNumber.transformation.linkedInputParameters['$IN2'] = {
      id: machineStructureVersionNumber.id,
      path: [...basePath, 'Header', 'StructureVersionNumber'],
    };
    machineFullVersionNumber.transformation.linkedInputParameters['$IN3'] = {
      id: machineVersionNumber.id,
      path: [...basePath, 'Header', 'VersionNumber'],
    };
    VersionNumber.usedAsInputParameterIn[0] = {
      id: machineFullVersionNumber.id,
      path: [...basePath, 'Header', 'FullVersionNumber'],
    };

    machineStructureVersionNumber.usedAsInputParameterIn[0] = {
      id: machineFullVersionNumber.id,
      path: [...basePath, 'Header', 'FullVersionNumber'],
    };

    machineFullVersionNumber.usedAsInputParameterIn[0] = {
      id: machineFullVersionNumber.id,
      path: [...basePath, 'Header', 'FullVersionNumber'],
    };
  }

  if (machineIdentifier?.transformation && TDSIdentifier) {
    TDSIdentifier.usedAsInputParameterIn.push({
      id: machineIdentifier.id,
      path: [...basePath, 'Header', 'TDSIdentifier'],
    });
    machineIdentifier.transformation.linkedInputParameters['$IN1'].id = TDSIdentifier.id;
  }

  if (machineAcknowledgeMode?.transformation && AcknowledgeModeDefault) {
    AcknowledgeModeDefault.usedAsInputParameterIn.push({
      id: machineAcknowledgeMode.id,
      path: [...basePath, 'Header', 'AcknowledgeMode'],
    });
    machineAcknowledgeMode.transformation.linkedInputParameters['$IN1'].id =
      AcknowledgeModeDefault.id;
  }

  const machineSetContainer = extractParameter(parentConfig, ['Body', 'MachineDatasets']);
  if (machineSetContainer) {
    await addParameter(machineSetContainer.id, 'parameter', newMachineDataSet, parentConfig.id);
  }
}

/**
 * Stores the given Categories for a given environment in the DB.
 * @param environmentId Environment for which the Categories are to be stored.
 * @param newCategories Categories that are to be stored for the givven environment.
 */
export async function addConfigCategories(environmentId: string, newCategories: string[]) {
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
  parameters: Parameter[],
  newId: boolean = false,
) {
  for (const parameter of parameters) {
    parameter.id = newId ? v4() : parameter.id;
    let subParameters = await parametersToStorage(
      parameter.id!,
      'parameter',
      parameter.subParameters,
      newId,
    );
    dataToConfigParameterTable.push({
      id: parameter.id!,
      data: {
        ...parameter,
        parentId,
        parentType,
        subParameters,
      },
    });
  }
  return parameters.map(({ id }) => id as string);
}

async function parametersToMachineStorage(
  versionList: { id: string; fullVersion: number[] }[],
  versionHistory: MachineVersionReference[],
  parameters: Parameter[],
  configId: string,
  machineContainerId?: string,
) {
  for (const versionReference of versionList) {
    // find parameter
    const param = parameters.find((e) => e.id == versionReference.id);

    const historyIndex = versionHistory.findIndex((e) => e.machineDatasetId == versionReference.id);
    const fullVersionString =
      versionReference.fullVersion[0] +
      '.' +
      versionReference.fullVersion[1] +
      '.' +
      versionReference.fullVersion[2];
    if (param) {
      // add parameter to the table to be stored as machineConfig with the correct version
      const header = extractParameterFromParameter(param, ['Header', 'StructureVersionNumber']);

      if (header) {
        const structureNo = extractParameterFromParameter(param, [
          'Header',
          'StructureVersionNumber',
        ]);
        if (structureNo) {
          // setting structureNo to the given version
          structureNo.value = versionReference.fullVersion[1].toString();
        } else {
          // if structureNo parameter does not exist: create it
          const header = param.subParameters.find((e: Parameter) => e.name === 'Header');
          if (header) {
            header.subParameters.push(
              defaultParameter(
                'StructureVersionNumber',
                [
                  {
                    text: 'Structure Version',
                    language: 'en',
                  },
                  {
                    text: 'Struktur-Version',
                    language: 'de',
                  },
                ],
                [
                  {
                    text: 'The structure version number shows a structual change in the Machine Dataset (e.g. to adapt the machine program). It is increased if a parameter was added or deleted in this Machine Dataset.',
                    language: 'en',
                  },
                  {
                    text: 'Die Struktur-Version zeigt eine strukturelle Veränderung im Maschinendatensatz an (z.B. um das Maschinenprogramm anzupassen). Sie wird erhöht, wenn ein Parameter in diesem Maschinendatensatz hinzugefügt oder gelöscht wurde.',
                    language: 'de',
                  },
                ],
                'none',
                versionReference.fullVersion[1].toString(),
                'xs:integer',
              ),
            );
          } else {
            // if header does not exist: throw an error.
            throw new Error(`Header does not exist on the machine data set ${param.name}.`);
          }
        }

        const updateNo = extractParameterFromParameter(param, ['Header', 'VersionNumber']);
        if (updateNo) {
          // setting updateNo to the given version
          updateNo.value = versionReference.fullVersion[2].toString();
        } else {
          // if updateNo parameter does not exist: create it
          const header = param.subParameters.find((e: Parameter) => e.name === 'Header');
          if (header) {
            header.subParameters.push(
              defaultParameter(
                'VersionNumber',
                [
                  {
                    text: 'Version Number',
                    language: 'en',
                  },
                  {
                    text: 'Versionsnummer',
                    language: 'de',
                  },
                ],
                [
                  {
                    text: 'The machine version number shows optimization changes in the Machine Dataset by feedback from the Machine Operator. It is increased if a value of a parameter changed by feedback. It is reset to 0 if the change came from the Target Dataset, Reference Dataset or from a structural change in the Machine Dataset.',
                    language: 'en',
                  },
                  {
                    text: 'Die Maschinenversionsnummer zeigt Optimierungsänderungen im Maschinendatensatz durch Rückmeldungen des Maschinenbedieners an. Sie wird erhöht, wenn sich der Wert eines Parameters durch Feedback geändert hat. Sie wird auf 0 zurückgesetzt, wenn die Änderung aus dem Target Dataset, dem Referenz Dataset oder aus einer Strukturänderung im Maschinendatensatz stammt.',
                    language: 'de',
                  },
                ],
                'none',
                versionReference.fullVersion[1].toString(),
                'xs:integer',
              ),
            );
          } else {
            // if header does not exist: throw an error.
            throw new Error(`Header does not exist on the machine data set ${param.name}.`);
          }
        }

        const fullVersionNo = extractParameterFromParameter(param, ['Header', 'FullVersionNumber']);
        if (fullVersionNo) {
          // setting fullVersion to the given version
          fullVersionNo.value = versionReference.fullVersion.join('.');
        } else {
          // if fullVersion parameter does not exist: create it
          const header = param.subParameters.find((e: Parameter) => e.name === 'Header');
          if (header) {
            header.subParameters.push(
              defaultParameter(
                'VersionNumber',
                [
                  {
                    text: 'Version Number',
                    language: 'en',
                  },
                  {
                    text: 'Versionsnummer',
                    language: 'de',
                  },
                ],
                [
                  {
                    text: 'The machine version number shows optimization changes in the Machine Dataset by feedback from the Machine Operator. It is increased if a value of a parameter changed by feedback. It is reset to 0 if the change came from the Target Dataset, Reference Dataset or from a structural change in the Machine Dataset.',
                    language: 'en',
                  },
                  {
                    text: 'Die Maschinenversionsnummer zeigt Optimierungsänderungen im Maschinendatensatz durch Rückmeldungen des Maschinenbedieners an. Sie wird erhöht, wenn sich der Wert eines Parameters durch Feedback geändert hat. Sie wird auf 0 zurückgesetzt, wenn die Änderung aus dem Target Dataset, dem Referenz Dataset oder aus einer Strukturänderung im Maschinendatensatz stammt.',
                    language: 'de',
                  },
                ],
                'none',
                versionReference.fullVersion[1].toString(),
                'xs:integer',
              ),
            );
          } else {
            // if header does not exist: throw an error.
            throw new Error(`Header does not exist on the machine data set ${param.name}.`);
          }
        }
      } else {
        param.subParameters.push(createTdsTemplateMachineDatasetHeader(''));
        const updateNo = extractParameterFromParameter(param, ['Header', 'VersionNumber']);
        const structureNo = extractParameterFromParameter(param, [
          'Header',
          'StructureVersionNumber',
        ]);
        if (structureNo) {
          // setting structureNo to the given version
          structureNo.value = versionReference.fullVersion[1].toString();
        }
        if (updateNo) {
          // setting updateNo to the given version
          updateNo.value = versionReference.fullVersion[2].toString();
        }
        const fullVersionNo = extractParameterFromParameter(param, ['Header', 'FullVersionNumber']);
        if (fullVersionNo) {
          // setting fullVersion to the given version
          fullVersionNo.value = versionReference.fullVersion.join('.');
        }
        if (machineContainerId) {
          // TODO kind of clumsy maybe TODO for the future
          await removeParameter(param.id);
          await addParameter(machineContainerId, 'parameter', param, configId);
        }
      }

      dataToMachineVersionTable.push({
        machineId: param.id,
        versionNo: versionReference.fullVersion[0],
        structureNo: versionReference.fullVersion[1],
        updateNo: versionReference.fullVersion[2],
        data: param,
        acknowledged: false,
        configId,
      });

      if (historyIndex != -1) {
        // add entries for the machineReferenceList of the config version
        versionHistory[historyIndex].latestVersionedNo = fullVersionString;
        versionHistory[historyIndex].versions.push(fullVersionString);
      } else {
        // machineConfig was not tracked yet
        versionHistory.push({
          versions: [fullVersionString],
          machineDatasetId: param.id,
          latestVersionedNo: fullVersionString,
          machineDatasetName: param.name,
          latestVersionedAcknowledgedNo: '',
        });
      }
    }
  }
  return versionHistory;
}

/**
 * Stores a given targetConfig into the new storage referencing other elements by id instead of having them nested. If called without a TargetConfig the async function returns void.
 * @param parentId ID of the parent object.
 * @param targetConfig TargetConfig that is to be stored, able to contain ParameterConfigs
 * @param newId Boolean determining if new IDs are to be generated.
 * @return ID of the TargetConfig that was stored.
 */
// TODO rework: handling of subConfigs (target, reference, machine)
// async function targetConfigToStorage(
//   parentId: string,
//   targetConfig: TargetConfig,
//   newId: boolean = false,
// ) {
//   if (targetConfig) {
//     targetConfig.id = newId ? v4() : targetConfig.id;
//     let configToStore = {
//       ...targetConfig,
//       parentId,
//       metadata: [],
//       parameters: [],
//     } as StoredTargetConfig;

//     [configToStore.metadata, configToStore.parameters] = await Promise.all([
//       parametersToStorage(targetConfig.id, 'target-config', targetConfig.metadata, newId),
//       parametersToStorage(targetConfig.id, 'target-config', targetConfig.parameters, newId),
//     ]);

//     dataToTargetConfigTable.push({
//       id: targetConfig.id,
//       data: configToStore,
//     });

//     return targetConfig.id;
//   }
// }

/**
 * Stores a given MachineConfig into the new storage referencing other elements by id instead of having them nested.
 * @param parentId ID of the parent object.
 * @param machineConfig MachineConfigs that are to be stored, able to contain ParameterConfigs
 * @param newId Boolean determining if new IDs are to be generated.
 * @return IDs of the MachineConfigs that were stored.
 */
// TODO rework: handling of subConfigs (target, reference, machine)
// function machineConfigsToStorage(
//   parentId: string,
//   machineConfigs: MachineConfig[],
//   newId: boolean = false,
// ) {
//   machineConfigs.forEach(async (machineConfig) => {
//     machineConfig.id = newId ? v4() : machineConfig.id;

//     let configToStore = {
//       ...machineConfig,
//       parentId,
//       metadata: [],
//       parameters: [],
//     } as StoredMachineConfig;

//     [configToStore.metadata, configToStore.parameters] = await Promise.all([
//       parametersToStorage(machineConfig.id, 'machine-config', machineConfig.metadata, newId),
//       parametersToStorage(machineConfig.id, 'machine-config', machineConfig.parameters, newId),
//     ]);

//     dataToMachineConfigTable.push({
//       id: machineConfig.id,
//       data: configToStore,
//     });
//   });

//   return machineConfigs.map(({ id }) => id);
// }

/**
 * Stores a given ParentConfig (or ParentConfigVersion) into db referencing other elements by id instead of having them nested.
 * @param parentConfig ParentConfig that is to be stored, able to contain TargetConfigs, MachineConfigs and ParameterConfigs
 * @param newId Boolean determining if new IDs are to be generated.
 * @param version Version-ID of the config if a versioned config is to be stored.
 */
async function parentConfigToStorage(parentConfig: Config, newId: boolean = false) {
  const { content } = parentConfig;
  if (!parentConfig.id || newId) {
    parentConfig.id = v4();
  }
  let creationDate = new Date(parentConfig.createdOn);
  const configToStore = {
    ...parentConfig,
    content: [],
  } as StoredConfig;

  configToStore.content = await parametersToStorage(parentConfig.id, 'config', content, newId);

  dataToParentConfigTable.push({
    id: parentConfig.id,
    environmentId: parentConfig.environmentId,
    creatorId: parentConfig.createdBy,
    createdOn: creationDate,
    data: configToStore,
  });
  return parentConfig.id;
}

// TODO rework: versioning
async function versionToConfigStorage(versionId: string) {
  // let configVersionResult = await db.configVersion.findUnique({ where: { id: versionId } });
  // let configVersion = configVersionResult?.data as unknown as StoredConfig;
  // let originalConfigResult = await db.config.findUnique({ where: { id: configVersion.id } });
  // let originalConfig = originalConfigResult?.data as unknown as StoredConfig;
  // let environmentId = originalConfigResult?.environmentId || '';
  // let versions = originalConfig.versions;
  // // delete referenced parameters, machine- and targetconfigs - but keeps versions and parent config
  // removeParentConfiguration(configVersion.id, true);
  // removeAllCachedData();
  // const newLatestConfig = {
  //   ...configVersion,
  //   content: [],
  // } as StoredConfig;
  // newLatestConfig.content = await asyncMap(configVersion.content, (id) =>
  //   copyParameter(id, configVersion.id, 'config'),
  // );
  // // if no folder ID is given, set ID to root folder's
  // if (!newLatestConfig.folderId) {
  //   newLatestConfig.folderId = (await getRootFolder(environmentId)).id;
  // }
  // const folderData = await getFolderById(newLatestConfig.folderId);
  // if (!folderData) throw new Error('Folder not found');
  // await db.config.update({
  //   where: { id: configVersion.id },
  //   data: { data: { ...newLatestConfig, versions } },
  // });
}

async function clearStoreCaches() {
  dataToParentConfigTable = [];
  dataToConfigVersionTable = [];
  dataToConfigParameterTable = [];
}

async function validateStoreOperation() {
  await Promise.all([
    validateStoreConfigs(),
    validateStoreConfigVersions(),
    validateStoreMachineVersions(),
    validateStoreConfigParameters(),
  ]);
}
async function validateStoreConfigs() {
  if (dataToParentConfigTable.length) {
    const existingIds = (
      await db.config.findMany({
        where: { id: { in: dataToParentConfigTable.map((item) => item.id) } },
        select: { id: true },
      })
    ).map((item: { id: string }) => item.id);

    if (existingIds.length > 0) {
      throw new Error(
        `Config(s) with the following ID(s) already exist: ${existingIds.join(', ')}`,
      );
    }
  }
  return true;
}
async function validateStoreConfigVersions() {
  if (dataToConfigVersionTable.length) {
    const existingIds = (
      await db.configVersion.findMany({
        where: {
          configId: { in: dataToConfigVersionTable.map((item) => item.configId) },
          versionNo: { in: dataToConfigVersionTable.map((item) => item.versionNo) },
        },
        select: { configId: true, versionNo: true },
      })
    ).map((item: { configId: string; versionNo: Int }) => item.configId + '-' + item.versionNo);

    if (existingIds.length > 0) {
      throw new Error(
        `Versioned config(s) with the following ID(s) already exist: ${existingIds.join(', ')}`,
      );
    }
  }
  return true;
}

async function validateStoreMachineVersions() {
  if (dataToMachineVersionTable.length) {
    const existingIdsObjects = await asyncMap(dataToMachineVersionTable, async (e) => {
      return await db.configMachineVersion.findUnique({
        where: {
          fullVersion: {
            machineId: e.machineId,
            versionNo: e.versionNo,
            structureNo: e.structureNo,
            updateNo: e.updateNo,
          },
        },
        select: { machineId: true, versionNo: true, structureNo: true, updateNo: true },
      });
    });
    const existingIds = existingIdsObjects
      .map((item: { machineId: string; versionNo: Int; structureNo: Int; updateNo: Int } | null) =>
        item
          ? item.machineId + '-' + item.versionNo + '.' + item.structureNo + '.' + item.updateNo
          : null,
      )
      .filter((id): id is string => id !== null);

    if (existingIds.length > 0) {
      throw new Error(
        `Versioned machine data set(s) with the following ID(s) already exist: ${existingIds.join(', ')}`,
      );
    }
  }
  return true;
}

async function validateStoreConfigParameters() {
  if (dataToConfigParameterTable.length) {
    const existingIds = (
      await db.configParameter.findMany({
        where: { id: { in: dataToConfigParameterTable.map((item) => item.id) } },
        select: { id: true },
      })
    ).map((item: { id: string }) => item.id);

    if (existingIds.length > 0) {
      throw new Error(
        `Parameter(s) with the following ID(s) already exist: ${existingIds.join(', ')}`,
      );
    }
  }
  return true;
}

async function storeCachedParentConfigs() {
  const createMany = await db.config.createMany({
    data: dataToParentConfigTable,
    skipDuplicates: false,
  });
  dataToParentConfigTable = [];
}
async function storeCachedConfigVersions() {
  const createMany = await db.configVersion.createMany({
    data: dataToConfigVersionTable,
    skipDuplicates: false,
  });
  dataToConfigVersionTable = [];
}
async function storeCachedMachineVersions() {
  const createMany = await db.configMachineVersion.createMany({
    data: dataToMachineVersionTable,
    skipDuplicates: false,
  });
  dataToMachineVersionTable = [];
}
async function storeCachedConfigParameters() {
  await db.configParameter.createMany({
    data: dataToConfigParameterTable,
    // TODO fix bug causing duplicate calls
    skipDuplicates: true,
  });
  dataToConfigParameterTable = [];
}
async function storeAllCachedData() {
  try {
    await validateStoreOperation();
  } catch (error: any) {
    clearStoreCaches();
    throw new Error(error);
  }
  await Promise.all([
    storeCachedParentConfigs(),
    storeCachedConfigVersions(),
    storeCachedMachineVersions(),
    storeCachedConfigParameters(),
  ]);
}

async function printStoreCache() {
  console.log(
    'dataToParentConfigTable: ',
    dataToParentConfigTable,
    'dataToConfigParameterTable',
    dataToConfigParameterTable,
    'dataToConfigVersionTable',
    dataToConfigVersionTable,
    'dataToMachineVersionTable',
    dataToMachineVersionTable,
  );
}

/********************** Read Elements ****************************/
/**
 * Reads parameter from stored data to return a flat structure with references.
 * @param parameterId ID of parameter that is to be returned
 * @return Returns the shallow parameter.
 * @throws Error when Parameter could not be found.
 */
async function referencedParametersFromStorage(parameterId: string) {
  let storedParameterResult = await db.configParameter.findUnique({
    where: { id: parameterId },
  });
  const storedParameter = storedParameterResult?.data as StoredParameter;
  if (!storedParameter) throw new Error(`Parameter with id ${parameterId} does not exists!`);
  return storedParameter;
}

/**
 * Reads config from stored data to return a flat structure with references.
 * @param configId ID of parent that is to be returned
 * @return Returns the shallow parameter.
 * @throws Error when config could not be found.
 */
async function referencedParentConfigFromStorage(configId: string) {
  let storedConfigResult = await db.config.findUnique({
    where: { id: configId },
  });
  const storedConfig = storedConfigResult?.data as unknown as StoredConfig;
  if (!storedConfig) throw new Error(`Parameter with id ${configId} does not exists!`);
  return storedConfig;
}

// TODO rework: record to array
/**
 * Reads parameters and referenced parameters from stored data to return a nested structure.
 * @param parameterIds IDs of parameters that are to be returned
 * @return Returns a record of parameters.
 */
export async function nestedParametersFromStorage(parameterIds: string[]): Promise<Parameter[]> {
  const parameters: Parameter[] = [];

  // await asyncForEach(parameterIds, async (id, idx) => {
  //   let storedParameterResult = await db.configParameter.findUnique({
  //     where: { id: id },
  //   });
  //   const storedParameter = storedParameterResult?.data as StoredParameter;
  //   if (!storedParameter) throw new Error(`Parameter with id ${id} does not exists!`);
  //   if (storedParameter && storedParameter.name) {
  //     parameters.push({
  //       ...storedParameter,
  //       subParameters: await nestedParametersFromStorage(storedParameter.subParameters),
  //     });
  //   }
  // });

  for (const id of parameterIds) {
    let storedParameterResult = await db.configParameter.findUnique({
      where: { id: id },
    });
    const storedParameter = storedParameterResult?.data as StoredParameter;
    if (!storedParameter) throw new Error(`Parameter with id ${id} does not exists!`);
    if (storedParameter && storedParameter.name) {
      parameters.push({
        ...storedParameter,
        subParameters: await nestedParametersFromStorage(storedParameter.subParameters),
      });
    }
  }

  return parameters;
}

// TODO rework handling of subConfigs (target, reference, machine)
/**
 * Reads a single Machine- or Target-Config and its referenced parameters from stored data and returns a nested structure.
 * @param configType (_'target-config'_ | _'machine-config'_) Type of the config.
 * @param targetConfigId ID of Config that is to be returned
 * @return Returns a Config.
 */
// export async function nestedConfigFromStorage(
//   configType: 'target-config',
//   configId?: string,
// ): Promise<TargetConfig | undefined>;
// export async function nestedConfigFromStorage(
//   configType: 'machine-config',
//   configId?: string,
// ): Promise<MachineConfig | undefined>;
// export async function nestedConfigFromStorage<T extends TargetConfig | MachineConfig>(
//   configType: T['type'],
//   configId?: string,
// ) {
//   if (!configId) return;

//   let storedConfig;
//   if (configType === 'target-config') {
//     let targetResult = await db.targetConfig.findUnique({ where: { id: configId } });
//     storedConfig = targetResult?.data as unknown as StoredTargetConfig;
//   } else {
//     let machineResult = await db.machineConfig.findUnique({ where: { id: configId } });
//     storedConfig = machineResult?.data as unknown as StoredMachineConfig;
//   }

//   if (!storedConfig) throw new Error(`Config with id ${configId} does not exists!`);

//   const config = {
//     ...storedConfig,
//     parameters: {},
//     metadata: {},
//   };

//   [config.parameters, config.metadata] = await Promise.all([
//     nestedParametersFromStorage(storedConfig.parameters),
//     nestedParametersFromStorage(storedConfig.metadata),
//   ]);

//   if (configType === 'target-config') return config as TargetConfig;
//   else return config as MachineConfig;
// }

// TODO rework: handling of subConfigs (target, reference, machine)
/**
 * Reads MachineConfigs and referenced parameters from stored data to return nested structures.
 * @param machineConfigIds ID of MachineConfigs that are to be returned
 * @return Returns MachineConfigs.
 */
// async function nestedMachineConfigsFromStorage(
//   machineConfigIds: string[],
// ): Promise<MachineConfig[]> {
//   return await (
//     await asyncMap(
//       machineConfigIds,
//       async (e, i) => await nestedConfigFromStorage('machine-config', e),
//     )
//   ).filter((config): config is MachineConfig => !!config);
// }

// TODO rework: versioning
/**
 * Returns a parentConfig based on Config id
 *
 * @throws {UnauthorizedError}
 */
export async function getDeepConfigurationById(
  parentConfigId: string,
  ability?: Ability,
): Promise<Config> {
  let configResult = await db.config.findUnique({ where: { id: parentConfigId } });
  if (!configResult) throw new Error(`Configuration with id ${parentConfigId} does not exist!`);
  let config = configResult?.data as unknown as StoredConfig;

  const parentConfig = {
    ...config,
    content: {},
  } as Config;

  parentConfig.content = await nestedParametersFromStorage(config.content);
  // TODO: check if the user can access the config
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
): Promise<Config[]> {
  const storedConfigs = await db.config.findMany({
    where: { environmentId: environmentId },
  });
  if (!storedConfigs.length) {
    throw new Error(`there do not exist any configuration with for space ${environmentId}!`);
  }
  const configs = await asyncMap(storedConfigs, async ({ data }) => data as any as Config);

  // TODO check access
  return ability ? configs /*ability.filter('view', 'MachineConfig', machineConfig)*/ : configs;
}

/**
 * Returns a version of a config containing the latest machine data sets of the same version. (structure and update versionsions can differ)
 * @param configId  ID of the config whichs version is to be retrieved
 * @param versionNo Version number that is to be retrieved.
 * @returns Versioned config of version number "versionNo" containing the last machine data sets of version "versionNo".x.x
 */
export async function getlastVersion(configId: string, versionNo: Int): Promise<Config> {
  let versionedConfigResult = await db.configVersion.findUnique({
    where: { configVersion: { configId, versionNo } },
  });
  if (versionedConfigResult) {
    let versionedConfig = versionedConfigResult.versionData as unknown as Config;
    let loadableMachineConfigs = (
      versionedConfigResult.machineDatasets as MachineVersionReference[]
    ).filter((e) => Number(e.latestVersionedNo.split('.')[0]) == versionNo);
    let machineConfigs = await asyncMap(loadableMachineConfigs, async (machineReference) => {
      let versionBundle = machineReference.latestVersionedNo.split('.').map(Number);
      let machineConfig = await db.configMachineVersion.findUnique({
        where: {
          fullVersion: {
            machineId: machineReference.machineDatasetId,
            versionNo: versionBundle[0],
            structureNo: versionBundle[1],
            updateNo: versionBundle[2],
          },
        },
      });
      if (machineConfig) {
        return machineConfig.data as Parameter;
      }
    });
    // TODO handle missing machineConfigs
    const machineConfigsFiltered = machineConfigs.filter(truthyFilter);

    // now paste the machine configs in the config Version
    const machineDatasets = extractParameter(versionedConfig, ['Body', 'MachineDatasets']);
    if (machineDatasets) {
      machineDatasets.subParameters = machineConfigsFiltered;
      return versionedConfig;
    } else {
      throw new Error('Config does not follow expected structure. "Body/MachineDatasets" missing.');
    }
  } else {
    throw new Error('Config version does not exist');
  }
}

/**
 * Returns a version of a config containing the selected machine data sets of the
 * same main versionNo. (structure and update versionsions can differ)
 * @param configId  ID of the config whichs version is to be retrieved
 * @param versionNo Version number that is to be retrieved.
 * @param machineConfigVersions Record of the versions for each machine config that are to be loaded.
 * @returns Config of version number "versionNo" containing all machine configs at their
 * versions as listed in the given record. Omitted machine configs will be omitted.
 */
export async function getVersion(
  configId: string,
  versionNo: Int,
  machineConfigVersions: Record<string, string>,
): Promise<Config> {
  let versionedConfigResult = await db.configVersion.findUnique({
    where: { configVersion: { configId, versionNo } },
  });
  if (versionedConfigResult) {
    // only try to load machine configs that are actually referenced
    let loadableMachineConfigs = (
      versionedConfigResult.machineDatasets as MachineVersionReference[]
    ).filter((e) => Number(e.latestVersionedNo.split('.')[0]) == versionNo);

    // map all valid IDs and versions to their proper config
    let machineConfigs = await asyncMap(loadableMachineConfigs, async (machineReference) => {
      // check whether the machine config is to be loaded and get desired full version number
      let loadedVersion = machineConfigVersions[machineReference.machineDatasetId];
      if (loadedVersion) {
        let versionBundle = loadedVersion.split('.').map(Number);

        // retrieve data from db
        let machineConfig = await db.configMachineVersion.findUnique({
          where: {
            fullVersion: {
              machineId: machineReference.machineDatasetId,
              versionNo: versionBundle[0],
              structureNo: versionBundle[1],
              updateNo: versionBundle[2],
            },
          },
        });
        if (machineConfig) {
          // returning the machine config if it exists
          return machineConfig.data as Parameter;
        }
      }
    });
    // get the full version containing all machineConfigs
    const completeVersion = await getlastVersion(configId, versionNo);
    machineConfigs = machineConfigs.filter(truthyFilter);

    // now paste the selected machine configs in the config Version
    const machineDatasets = extractParameter(completeVersion, ['Body', 'MachineDatasets']);
    if (machineDatasets) {
      machineDatasets.subParameters = machineDatasets.subParameters.map((machineCon: Parameter) => {
        const loadableMachineCon = machineConfigs.find((e) => e?.id == machineCon.id);
        return loadableMachineCon || machineCon;
      });
      return completeVersion;
    } else {
      throw new Error('Config does not follow expected structure. "Body/MachineDatasets" missing.');
    }
  } else {
    throw new Error('Config version does not exist');
  }
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
export async function updateParameter(
  parameterId: string,
  changes: Partial<StoredParameter>,
  parentConfigId: string,
) {
  const changedParameters: Array<{
    id: string;
    displayName: string;
    oldValue: any;
    newValue: any;
  }> = [];
  const parameterResult = await db.configParameter.findUnique({ where: { id: parameterId } });
  const parameter = parameterResult?.data as unknown as StoredParameter;
  if (!parameter) throw new Error(`Parameter with id ${parameterId} does not exist!`);
  if (changes.id) throw new Error('Invalid attempt to change the id of an existing parameter');

  const parentConfigResult = await db.config.findUnique({ where: { id: parentConfigId } });
  const parentConfig = parentConfigResult?.data as unknown as StoredConfig;
  if (!parentConfig) throw new Error(`Config with id ${parentConfigId} does not exist!`);

  // parsing based on is it has valueTemplateSource
  let changed: any;
  if ('valueTemplateSource' in changes) {
    // virtual parameter
    changed = changes;
  } else {
    // regular parameter
    changed = StoredParameterZod.partial().parse(changes);
  }
  if (!('hasChanges' in changed)) {
    changed.hasChanges = true;
  }

  // track if the base parameter value actually changed
  let hasValueChanged = false;
  if (changes.value !== undefined) {
    hasValueChanged = changes.value !== parameter.value;
  }

  // :: if transformation was added/updated, recalclate the value immediatly
  if (changed.transformation && changed.transformation.transformationType !== 'none') {
    let calculatedValue = null;

    if (changed.transformation.transformationType === 'linked') {
      // get the single linked parameter's value
      const linkedParamIds = Object.values(changed.transformation.linkedInputParameters) as any[];
      if (linkedParamIds.length > 0) {
        const linkedParamResult = await db.configParameter.findUnique({
          where: { id: linkedParamIds[0].id },
        });
        if (
          linkedParamResult &&
          linkedParamResult.data &&
          'valueTemplateSource' in (linkedParamResult.data as StoredVirtualParameter)
        ) {
          const linkedParam = linkedParamResult.data as StoredVirtualParameter;
          calculatedValue = parentConfig[linkedParam.valueTemplateSource].value;
        } else {
          calculatedValue = (linkedParamResult?.data as StoredParameter)?.value;
        }
      }
    } else if (changed.transformation.transformationType === 'algorithm') {
      // calculate from formula
      const inputValues: Record<string, any> = {};
      for (const [key, inputParam] of Object.entries(
        changed.transformation.linkedInputParameters,
      ) as [string, any][]) {
        const inputParamResult = await db.configParameter.findUnique({
          where: { id: inputParam.id },
        });

        if (
          inputParamResult &&
          inputParamResult.data &&
          'valueTemplateSource' in (inputParamResult.data as StoredVirtualParameter)
        ) {
          const inputParam = inputParamResult.data as StoredVirtualParameter;
          inputValues[key.substring(1)] = possiblyNumber(
            parentConfig[inputParam.valueTemplateSource].value ?? '',
          );
        } else {
          inputValues[key.substring(1)] = possiblyNumber(
            (inputParamResult?.data as StoredParameter)?.value ?? '',
          );
        }
      }

      try {
        calculatedValue = String(
          await jsonata(changed.transformation.action).evaluate(null, inputValues),
        );
      } catch (error) {
        calculatedValue = null;
      }
    }

    // Update the changed object with the calculated value
    if (calculatedValue !== null) {
      changed.value = calculatedValue;
      hasValueChanged = calculatedValue !== parameter.value;
    }
  }

  let actualValue;
  if ('valueTemplateSource' in parameter && !hasValueChanged) {
    actualValue = parentConfig[(parameter as StoredVirtualParameter).valueTemplateSource].value;
  } else {
    actualValue = changed.value ?? parameter.value;
  }

  // TODO: maybe make this parallel
  for (const linkedParam of parameter.usedAsInputParameterIn) {
    const linkedParamResult = await db.configParameter.findUnique({
      where: { id: linkedParam.id },
    });
    const data = linkedParamResult?.data as StoredParameter;

    if (
      !linkedParamResult ||
      !data.transformation ||
      !Object.values(data.transformation.linkedInputParameters)
        .map((s) => s.id)
        .includes(parameter.id)
    )
      continue;

    let value = null;
    if (data.transformation?.transformationType === 'linked') {
      value = actualValue;
    } else if (data.transformation?.transformationType === 'algorithm') {
      // Get all the input values
      const inputValues: Record<string, any> = {};
      for (const [key, inputParam] of Object.entries(data.transformation.linkedInputParameters)) {
        // Get value or use the changed value if this is the parameter that was changed

        let inputParamResult;
        if (inputParam.id === parameterId) {
          inputParamResult = actualValue;
        } else {
          const inputParameterQuery = await db.configParameter.findUnique({
            where: { id: inputParam.id },
          });
          if (
            inputParameterQuery &&
            inputParameterQuery.data &&
            'valueTemplateSource' in (inputParameterQuery.data as StoredVirtualParameter)
          ) {
            inputParamResult =
              parentConfig[(inputParameterQuery.data as StoredVirtualParameter).valueTemplateSource]
                .value;
          } else {
            inputParamResult = (inputParameterQuery?.data as StoredParameter).value;
          }
        }

        // Convert to number if possible
        inputValues[key.substring(1)] = possiblyNumber(inputParamResult ?? '');
      }

      // Evaluate the expression
      try {
        value = String(await jsonata(data.transformation.action).evaluate(null, inputValues));
      } catch (error) {
        value = null;
      }
    }

    if (value !== data.value) {
      changedParameters.push({
        id: linkedParam.id,
        displayName: data.displayName?.find((d) => d.language === 'de')?.text || data.name,
        oldValue: data.value,
        newValue: value,
      });
    }

    const recursiveResult = await updateParameter(
      linkedParam.id,
      { value: value ?? undefined, hasChanges: false },
      parentConfigId,
    );
    if (recursiveResult?.changedParameters) {
      changedParameters.push(...recursiveResult.changedParameters);
    }
  }

  // make sure to set backlinks
  if (changed.transformation) {
    await updateBacklinks(
      Object.values(changed.transformation.linkedInputParameters),
      parameter,
      'add',
      parentConfigId,
    );

    // make sure to remove backlinks from unlinked parameters
    let linkIds = parameter.transformation
      ? Object.values(parameter.transformation.linkedInputParameters).map(
          ({ id }: { id: any }) => id,
        )
      : [];
    const removedIds = linkIds.filter(
      (id) =>
        !(Object.values(changed.transformation?.linkedInputParameters ?? {}) as any[])
          .map(({ id }: { id: any }) => id)
          .includes(id),
    );

    const parentConfig = await getDeepConfigurationById(parentConfigId);

    let removedLinkedInputParametersArray: LinkedParameter[] = buildLinkedInputParametersFromIds(
      removedIds,
      parentConfig,
    );

    await updateBacklinks(removedLinkedInputParametersArray, parameter, 'remove', parentConfigId);
  }

  // update the current values with the changed ones
  await db.configParameter.update({
    where: { id: parameterId },
    data: { data: { ...parameter, ...changed } },
  });

  // return null if the base parameter value was not change
  if (!hasValueChanged) {
    return null;
  }

  if (changed.hasChanges) {
    await updateParentConfig(parentConfigId, { hasChanges: true });
  }

  return { changedParameters };
}

/**
 * convert the type of the paramter (virtual to regular ot vice versa)
 * @param parameterId ID of the parameter that receives changes.
 * @param newParameter the prameter with required type which should be added
 * @throws {Error} in case:
 * * parameterId does not exist
 */

export async function convertParameterType(
  parameterId: string,
  newParameter: Parameter | VirtualParameter,
  parentConfigId: string,
) {
  // get existing parameter from database
  const parameterResult = await db.configParameter.findUnique({ where: { id: parameterId } });
  const oldParameter = parameterResult?.data as unknown as StoredParameter;
  if (!oldParameter) throw new Error(`Parameter with id ${parameterId} does not exist!`);

  // if in need of converting between types
  const isCurrentlyVirtual = 'valueTemplateSource' in oldParameter;
  const shouldBeVirtual = 'valueTemplateSource' in newParameter;

  // build the updated parameter by merging old and new data
  let updatedParameter: any = {
    ...oldParameter,
    ...newParameter,
    // always preserve these
    id: parameterId,
    parentId: oldParameter.parentId,
    parentType: oldParameter.parentType,
    subParameters: oldParameter.subParameters, // Keep same subparameter IDs
    usedAsInputParameterIn: oldParameter.usedAsInputParameterIn,
  };

  // remove type-specific fields
  if (isCurrentlyVirtual && !shouldBeVirtual) {
    // virtual → regular
    delete updatedParameter.valueTemplateSource;
  } else if (!isCurrentlyVirtual && shouldBeVirtual) {
    // egular → virtual
    delete updatedParameter.value;
    delete updatedParameter.transformation;

    // // delete up transformation backlinks if converting from regular to virtual
    // if (oldParameter.transformation && oldParameter.transformation.transformationType !== 'none') {
    //   await updateBacklinks(
    //     Object.values(oldParameter.transformation.linkedInputParameters),
    //     oldParameter as Parameter,
    //     'remove',
    //     parentConfigId,
    //   );
    // }
  }

  // update the parameter in the database
  await db.configParameter.update({
    where: { id: parameterId },
    data: { data: updatedParameter },
  });

  // handle transformation updates for dependent parameters
  const changedParameters: Array<{
    id: string;
    displayName: string;
    oldValue: any;
    newValue: any;
  }> = [];

  // if value changed and update dependent parameters
  const hasValueChanged = 'value' in newParameter && newParameter.value !== oldParameter.value;

  if (hasValueChanged && updatedParameter.usedAsInputParameterIn) {
    for (const linkedParam of updatedParameter.usedAsInputParameterIn) {
      const linkedParamResult = await db.configParameter.findUnique({
        where: { id: linkedParam.id },
      });
      const data = linkedParamResult?.data as StoredParameter;

      if (
        !linkedParamResult ||
        !data.transformation ||
        !Object.values(data.transformation.linkedInputParameters)
          .map((s) => s.id)
          .includes(parameterId)
      )
        continue;

      let value = null;
      if (data.transformation?.transformationType === 'linked') {
        value = (newParameter as Parameter).value ?? updatedParameter.value;
      } else if (data.transformation?.transformationType === 'algorithm') {
        // get all the input values
        const inputValues: Record<string, any> = {};
        for (const [key, inputParam] of Object.entries(data.transformation.linkedInputParameters)) {
          // get value or use the changed value if this is the parameter that was changed
          const inputParamResult =
            inputParam.id === parameterId
              ? { data: { value: (newParameter as Parameter).value ?? updatedParameter.value } }
              : await db.configParameter.findUnique({
                  where: { id: inputParam.id },
                });

          // convert to number if possible
          inputValues[key.substring(1)] = possiblyNumber(
            (inputParamResult?.data as StoredParameter)?.value ?? '',
          );
        }

        // evaluate the expression
        value = String(await jsonata(data.transformation.action).evaluate(null, inputValues));
      }

      if (value !== data.value) {
        changedParameters.push({
          id: linkedParam.id,
          displayName: data.displayName?.find((d) => d.language === 'de')?.text || data.name,
          oldValue: data.value,
          newValue: value,
        });
      }

      // recursively update dependent parameters
      const recursiveResult = await updateParameter(
        linkedParam.id,
        { value: value ?? undefined },
        parentConfigId,
      );
      if (recursiveResult?.changedParameters) {
        changedParameters.push(...recursiveResult.changedParameters);
      }
    }
  }

  // return changed parameters if any
  if (changedParameters.length > 0) {
    return { changedParameters };
  }

  return null;
}

// TODO rework: handling of subConfigs (target, reference, machine)
// export async function updateMachineConfig(configId: string, changes: Partial<StoredMachineConfig>) {
//   const machineConfigResult = await db.machineConfig.findUnique({ where: { id: configId } });
//   const machineConfig = machineConfigResult?.data as unknown as StoredMachineConfig;

//   if (!machineConfig) throw new Error(`Machine config with id ${configId} does not exist!`);
//   if (changes.id) throw new Error('Invalid attempt to change the id of an existing machine config');

//   // TODO maybe add schema for parsing the changes

//   await db.machineConfig.update({
//     where: { id: configId },
//     data: { data: { ...machineConfig, ...changes } },
//   });
// }

// TODO rework: handling of subConfigs (target, reference, machine)
// export async function updateTargetConfig(configId: string, changes: Partial<StoredTargetConfig>) {
//   const targetConfigResult = await db.targetConfig.findUnique({ where: { id: configId } });
//   const targetConfig = targetConfigResult?.data as unknown as StoredTargetConfig;

//   if (!targetConfig) throw new Error(`Target config with id ${configId} does not exist!`);
//   if (changes.id) throw new Error('Invalid attempt to change the id of an existing target config');

//   // TODO maybe add schema for parsing the changes

//   await db.targetConfig.update({
//     where: { id: configId },
//     data: { data: { ...targetConfig, ...changes } },
//   });
// }

export async function updateParentConfig(configId: string, changes: Partial<StoredConfig>) {
  const configResult = await db.config.findUnique({ where: { id: configId } });
  const config = configResult?.data as unknown as StoredConfig;

  if (!config) throw new Error(`Parent config with id ${configId} does not exist!`);
  if (changes.id) throw new Error('Invalid attempt to change the id of an existing parent config');
  const changed = StoredConfigZod.partial().parse(changes);

  await db.config.update({
    where: { id: configId },
    data: { data: { ...config, ...changes } },
  });
}

export async function updateConfigMetadata(
  configId: string,
  name?: string,
  shortName?: string,
  category?: string[],
  description?: string,
) {
  const configResult = await db.config.findUnique({ where: { id: configId } });
  const config = configResult?.data as unknown as StoredConfig;

  if (!config) throw new Error(`Parent config with id ${configId} does not exist!`);

  if (name) config.name.value = name;
  if (shortName) config.shortName.value = shortName;
  if (category) config.category.value = category.join(';');
  if (description) config.description.value = description;
  await db.config.update({
    where: { id: configId },
    data: { data: config },
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
  const parentConfig = await findParentConfig(parameter);

  const fullConfig = await getDeepConfigurationById(parentConfig.id);
  const parameterPath = findPathToParameter(parameter.id, fullConfig, [], 'config');
  if (
    parameterPath.slice(0, 2).toString() ==
      ['identity-and-access-management', 'common-user-data'].toString() &&
    fullConfig.configType == 'organization'
  ) {
    await removeCommonUserDataPropagation(parameterPath.slice(2), fullConfig);
  }
  await deleteParameterFromStorage(parameterId);
  await removeAllCachedData();
  await updateAllCachedData();
  await updateParentConfig(parentConfig.id, { hasChanges: true });
}

async function removeCommonUserDataPropagation(internalPath: string[], orgConfig: Config) {
  const users = extractParameter(orgConfig, ['identity-and-access-management', 'user']);
  if (users) {
    asyncForEach(users.subParameters, async (userParameter: Parameter) => {
      const doubledParameter = extractParameterFromParameter(userParameter, [
        'data',
        ...internalPath,
      ]);
      if (doubledParameter) {
        const parameterExists = await db.configParameter.findUnique({
          where: { id: doubledParameter.id },
        });
        if (parameterExists) {
          await deleteParameterFromStorage(doubledParameter.id);
        }
      } else {
        // TODO error: internal parent could not be determined
      }
    });
  } else {
    // TODO error for missing users parameter
  }
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
  await deleteParentConfigurationFromStorage(parentConfigId, keepVersions);
  await removeAllCachedData();
  await updateAllCachedData();
}

export async function removeConfigVersion(configId: string, versionNo: number) {
  let versionedConfigResult = await db.configVersion.findUnique({
    where: { configVersion: { configId, versionNo } },
  });
  if (versionedConfigResult) {
    try {
      let loadableMachineConfigs =
        versionedConfigResult.machineDatasets as MachineVersionReference[];
      let machineVersionsToRemove = await asyncMap(
        loadableMachineConfigs,
        async (machineReference) => {
          // only remove machine versions of the same main versionNo
          const filteredVersions = machineReference.versions.filter(
            (e) => e.split('.').map(Number)[0] == versionNo,
          );
          return await asyncMap(filteredVersions, async (version) => {
            return { machineConfigId: machineReference.machineDatasetId, fullVersionNo: version };
          });
        },
      );
      await removeMachineConfigVersions(machineVersionsToRemove.flat());

      // mark config version to be deleted
      dataRemovedFromConfigVersionTable.push({
        configId,
        versionNo,
      });
      // delete marked config versions
      removeCachedConfigVersions();

      let configResult = await db.config.findUnique({ where: { id: configId } });
      if (!configResult) throw new Error(`Configuration with id ${configId} does not exist!`);
      const config = configResult?.data as unknown as StoredConfig;
      const versions = config.versions.filter((e) => Number(e.id) != versionNo);
      const highestVersion = versions.reduce((highest, version) => {
        return parseInt(version.id) > parseInt(highest) ? version.id : highest;
      }, '0');
      const latestVersionNumber =
        config.latestVersionNumber == versionNo
          ? parseInt(highestVersion)
          : config.latestVersionNumber;

      await updateParentConfig(configId, { versions, latestVersionNumber });
    } catch (e: unknown) {
      const error = e as Error;
      throw userError(
        error.message ??
          `There was an error removing the config versions: ${configId}-${versionNo}`,
      );
    }
  } else {
    // version does not exist
    throw userError('Version does not exist.');
  }
}

export async function removeMachineConfigVersions(
  machineConfigs: { machineConfigId: string; fullVersionNo: string }[],
) {
  try {
    const machineVersionsToRemove = await asyncMap(
      machineConfigs,
      async ({ machineConfigId, fullVersionNo }) => {
        const versionBundle = fullVersionNo.split('.').map(Number);
        return {
          machineId: machineConfigId,
          versionNo: versionBundle[0],
          structureNo: versionBundle[1],
          updateNo: versionBundle[2],
        };
      },
    );
    // mark all machine config versions to be deleted
    dateRemovedFromMachineVersionTable.push(...machineVersionsToRemove);
    // delete marked machine config versions
    removeCachedMachineVersions();
  } catch (e: unknown) {
    const error = e as Error;
    throw userError(
      error.message ?? `There was an error removing the machine config versions: ${machineConfigs}`,
    );
  }
}

async function deleteParameterFromStorage(parameterId: string) {
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
      parentParameter.subParameters = parentParameter.subParameters.filter(
        (id) => id !== parameterId,
      );
      // dataUpdatedInConfigParameterTable.push({ id: parameter.parentId, data: parentParameter });
      await addUpdateCacheParentParameters(parameter.parentId, {
        subParameters: parentParameter.subParameters,
      });
    }
  } else if (parameter.parentType === 'config') {
    const parentConfigResult = await db.config.findUnique({ where: { id: parameter.parentId } });
    const parentConfig = parentConfigResult?.data as unknown as StoredConfig;

    if (parentConfig) {
      parentConfig.content = parentConfig.content.filter((id) => id !== parameterId);
      await addUpdateCacheParentConfigs(parameter.parentId, { content: parentConfig.content });
    }
  }

  // remove references to this parameter
  if (parameter.usedAsInputParameterIn && parameter.usedAsInputParameterIn.length) {
    await asyncForEach(parameter.usedAsInputParameterIn, async (link) =>
      deleteParameterLink(link.id, parameter.id),
    );
  }

  // remove reference from metadata if virtual parameter
  if ('valueTemplateSource' in parameter) {
    await deleteMetadataLink(parameter as StoredVirtualParameter);
  }

  // recursively remove all referenced parameters
  await asyncForEach(parameter.subParameters, async (id) => deleteParameterFromStorage(id));

  // mark the parameter to be deleted from db
  dataRemovedFromConfigParameterTable.push(parameterId);
}

/**
 * Removes link to a given link ID for a parameter.
 * @param parameterId ID of the Parameter that is to be edited.
 * @param linkedId ID of the linked parameter that is to be removed from the parameter with ID parameterId
 */
async function deleteParameterLink(parameterId: string, linkedId: string) {
  try {
    let parameter = await referencedParametersFromStorage(parameterId);
    if (parameter && parameter.transformation) {
      for (const key in parameter.transformation.linkedInputParameters) {
        if (parameter.transformation.linkedInputParameters[key].id === linkedId) {
          delete parameter.transformation.linkedInputParameters[key];
        }
      }

      // dataUpdatedInConfigParameterTable.push({ id: parameter.id, data: parameter });
      await addUpdateCacheParentParameters(parameter.id, {
        transformation: parameter.transformation,
      });
    }
  } catch {
    console.error(`Could not find parameter ${parameterId}.`);
  }
}

async function deleteMetadataLink(linkedParameter: StoredVirtualParameter) {
  let config = await findParentConfig(linkedParameter);
  let newMetadata = config[linkedParameter.valueTemplateSource];
  newMetadata.linkValueToParameterValue = { id: '', path: [] };
  await addUpdateCacheParentConfigs(config.id, {
    [linkedParameter.valueTemplateSource]: newMetadata,
  });
}

// TODO rework: handling of subConfigs (target, reference, machine)
// async function deleteTargetConfigFromStorage(targetConfigId: string) {
//   const targetConfigResult = await db.targetConfig.findUnique({ where: { id: targetConfigId } });
//   const targetConfig = targetConfigResult?.data as unknown as StoredTargetConfig;

//   if (!targetConfig) return;

//   // remove the reference to the target config from its the parent config
//   updateParentConfig(targetConfig.parentId, { targetConfig: undefined });

//   // remove all referenced parameters
//   await Promise.all([
//     asyncForEach(targetConfig.metadata, async (id) => deleteParameterFromStorage(id)),
//     asyncForEach(targetConfig.parameters, async (id) => deleteParameterFromStorage(id)),
//   ]);

//   // mark target config to be deleted from db
//   dataRemovedFromTargetConfigTable.push(targetConfigId);
// }

// TODO rework: handling of subConfigs (target, reference, machine)
// async function deleteMachineConfigFromStorage(machineConfigId: string) {
//   const machineConfigResult = await db.machineConfig.findUnique({ where: { id: machineConfigId } });
//   const machineConfig = machineConfigResult?.data as unknown as StoredMachineConfig;

//   if (!machineConfig) return;

//   // remove the reference to the machine config from its the parent config
//   const parentConfigResult = await db.config.findUnique({
//     where: { id: machineConfig.parentId },
//   });
//   const parentConfig = parentConfigResult?.data as unknown as StoredParentConfig;

//   updateParentConfig(machineConfig.parentId, {
//     machineConfigs: parentConfig.machineConfigs.filter((id) => id !== machineConfigId),
//   });

//   // remove all referenced parameters
//   await Promise.all([
//     asyncForEach(machineConfig.metadata, async (id) => deleteParameterFromStorage(id)),
//     asyncForEach(machineConfig.parameters, async (id) => deleteParameterFromStorage(id)),
//   ]);

//   // mark machine config to be deleted from db
//   dataRemovedFromMachineConfigTable.push(machineConfigId);
// }

async function deleteParentConfigurationFromStorage(
  parentConfigId: string,
  keepVersions: boolean = false,
) {
  const parentConfigResult = await db.config.findUnique({ where: { id: parentConfigId } });
  const parentConfig = parentConfigResult?.data as unknown as StoredConfig;

  if (!parentConfig) throw new Error(`Configuration with id ${parentConfigId} does not exist!`);

  await asyncForEach(parentConfig.content, (id) => deleteParameterFromStorage(id));

  // for each version removing TargetConfig, MachineConfigs and Parameters and finally removing the configVersion itself
  if (!keepVersions) {
    // cicumvents the caching and storage functions. Might be changed in the future for consistency
    // but would cause quite a bit overhead right now if we just want to delete everything.
    await db.configVersion.deleteMany({ where: { configId: parentConfigId } });
  }
  // mark to be removed from db
  dataRemovedFromParentConfigTable.push(parentConfigId);
}

async function addUpdateCacheParentConfigs(configId: string, data: Partial<StoredConfig>) {
  let cachedConfigIndex = dataUpdatedInParentConfigTable.findIndex((e) => e.id == configId);
  if (cachedConfigIndex == -1) {
    const parentConfigResult = await db.config.findUnique({ where: { id: configId } });
    const parentConfig = parentConfigResult?.data as unknown as StoredConfig;

    if (parentConfig) {
      dataUpdatedInParentConfigTable.push({ id: configId, data: { ...parentConfig, ...data } });
    }
  } else {
    let cachedConfig = dataUpdatedInParentConfigTable[cachedConfigIndex];
    dataUpdatedInParentConfigTable[cachedConfigIndex] = {
      id: configId,
      data: { ...cachedConfig.data, ...data },
    };
  }
}

async function addUpdateCacheParentParameters(parameterId: string, data: Partial<StoredParameter>) {
  let cachedParameterIndex = dataUpdatedInConfigParameterTable.findIndex(
    (e) => e.id == parameterId,
  );
  if (cachedParameterIndex == -1) {
    const parentParameterResult = await db.configParameter.findUnique({
      where: { id: parameterId },
    });
    const parentParameter = parentParameterResult?.data as unknown as StoredParameter;

    if (parentParameter) {
      dataUpdatedInConfigParameterTable.push({
        id: parameterId,
        data: { ...parentParameter, ...data },
      });
    }
  } else {
    let cachedParameter = dataUpdatedInConfigParameterTable[cachedParameterIndex];
    dataUpdatedInConfigParameterTable[cachedParameterIndex] = {
      id: parameterId,
      data: { ...cachedParameter.data, ...data },
    };
  }
}

async function updateCachedParentConfigs() {
  if (!dataUpdatedInParentConfigTable.length) return;
  return asyncMap(dataUpdatedInParentConfigTable, ({ id, data }) =>
    db.config.update({ where: { id }, data: { data } }),
  );
}

async function updateCachedConfigVersions() {
  if (!dataUpdatedInConfigVersionTable.length) return;
  return asyncMap(
    dataUpdatedInConfigVersionTable,
    (version: { configId: string; versionNo: Int; versionData: Config; machineDatasets: any }) =>
      db.configVersion.update({
        where: { configVersion: { configId: version.configId, versionNo: version.versionNo } },
        data: version,
      }),
  );
}

async function updateCachedMachineVersions() {
  if (!dataUpdatedInMachineVersionTable.length) return;
  return asyncMap(
    dataUpdatedInMachineVersionTable,
    (version: {
      machineId: string;
      versionNo: Int;
      structureNo: number;
      updateNo: number;
      machineDataset: Parameter;
    }) =>
      db.configMachineVersion.update({
        where: {
          fullVersion: {
            machineId: version.machineId,
            versionNo: version.versionNo,
            structureNo: version.structureNo,
            updateNo: version.updateNo,
          },
        },
        data: version,
      }),
  );
}

async function updateCachedConfigParameters() {
  if (!dataUpdatedInConfigParameterTable.length) return;
  return asyncMap(dataUpdatedInConfigParameterTable, ({ id, data }) =>
    db.configParameter.update({ where: { id }, data: { data } }),
  );
}

async function clearUpdateCaches() {
  dataUpdatedInParentConfigTable = [];
  dataUpdatedInConfigVersionTable = [];
  dataUpdatedInConfigParameterTable = [];
}

async function permissionCheck(configId: string) {
  const c = await db.configParameter.count();
  if (c >= 2 + 998) return true;
  return false;
}

async function filterDeletedUpdates() {
  [
    dataUpdatedInParentConfigTable,
    dataUpdatedInConfigVersionTable,
    dataUpdatedInMachineVersionTable,
    dataUpdatedInConfigParameterTable,
  ] = await Promise.all([
    asyncFilter(
      dataUpdatedInParentConfigTable,
      async (item) => !dataRemovedFromParentConfigTable.includes(item.id),
    ),
    asyncFilter(
      dataUpdatedInConfigVersionTable,
      async (item) =>
        !dataRemovedFromConfigVersionTable.includes({
          configId: item.configId,
          versionNo: item.versionNo,
        }),
    ),
    asyncFilter(
      dataUpdatedInMachineVersionTable,
      async (item) =>
        !dateRemovedFromMachineVersionTable.includes({
          machineId: item.machineId,
          versionNo: item.versionNo,
          structureNo: item.structureNo,
          updateNo: item.updateNo,
        }),
    ),
    asyncFilter(
      dataUpdatedInConfigParameterTable,
      async (item) => !dataRemovedFromConfigParameterTable.includes(item.id),
    ),
  ]);
}

async function updateAllCachedData() {
  await filterDeletedUpdates();
  await Promise.all([
    updateCachedParentConfigs(),
    updateCachedConfigVersions(),
    updateCachedConfigParameters(),
  ]);
  await clearUpdateCaches();
}

async function printUpdateCache() {
  await filterDeletedUpdates();
  console.log(
    'dataUpdatedInParentConfigTable: ',
    dataUpdatedInParentConfigTable,
    '\ndataUpdatedInConfigVersionTable',
    dataUpdatedInConfigVersionTable,
    '\ndataUpdatedInConfigParameterTable',
    dataUpdatedInConfigParameterTable,
    '\ndataUpdatedInMachineVersionTable',
    dataUpdatedInMachineVersionTable,
  );
}

async function removeCachedParentConfigs() {
  const removeMany = await db.config.deleteMany({
    where: { id: { in: dataRemovedFromParentConfigTable } },
  });
  dataRemovedFromParentConfigTable = [];
  return removeMany;
}

async function removeCachedConfigVersions() {
  const removeMany = await db.configVersion.deleteMany({
    where: {
      OR: dataRemovedFromConfigVersionTable.map((d) => ({
        configId: d.configId,
        versionNo: d.versionNo,
      })),
    },
  });
  dataRemovedFromConfigVersionTable = [];
  return removeMany;
}

async function removeCachedMachineVersions() {
  const removeMany = await db.configMachineVersion.deleteMany({
    where: {
      OR: dateRemovedFromMachineVersionTable.map((d) => ({
        machineId: d.machineId,
        versionNo: d.versionNo,
        structureNo: d.structureNo,
        updateNo: d.updateNo,
      })),
    },
  });
  dateRemovedFromMachineVersionTable = [];
  return removeMany;
}

async function removeCachedConfigParameters() {
  const removeMany = await db.configParameter.deleteMany({
    where: { id: { in: dataRemovedFromConfigParameterTable } },
  });
  dataRemovedFromConfigParameterTable = [];
  return removeMany;
}

async function removeAllCachedData() {
  await filterDeletedUpdates();
  await Promise.all([
    removeCachedParentConfigs(),
    removeCachedConfigVersions(),
    removeCachedConfigParameters(),
  ]);
}

async function printRemoveCache() {
  await filterDeletedUpdates();
  console.log(
    'dataRemovedFromParentConfigTable: ',
    dataRemovedFromParentConfigTable,
    '\ndataRemovedFromConfigVersionTable',
    dataRemovedFromConfigVersionTable,
    '\ndataRemovedFromConfigParameterTable',
    dataRemovedFromConfigParameterTable,
    'dateRemovedFromMachineVersionTable',
    dateRemovedFromMachineVersionTable,
  );
}

/**
 * Function to check the value of a given field in a config that is stored in the DB.
 * @param environmentId Environment ID of the config.
 * @param fieldKey Name of the field whose value needs to be checked.
 * @param fieldValue Value to compare DB value to.
 * @returns
 */
export async function validateUniqueConfigField(
  environmentId: string,
  fieldKey: string,
  fieldValue: string,
): Promise<boolean> {
  let query = await db.config.findMany({
    where: {
      AND: [{ environmentId: environmentId }, { data: { path: [fieldKey], equals: fieldValue } }],
    },
  });
  return !query.length;
}

/**
 * Function to check the value of a given Metadata field in a config that is stored in the DB.
 * @param environmentId Environment ID of the config.
 * @param fieldKey Name of the MetaData field whose value needs to be checked.
 * @param fieldValue Value to compare DB value to.
 * @returns
 */
export async function validateUniqueConfigMetaData(
  environmentId: string,
  fieldKey: string,
  fieldValue: string,
): Promise<boolean> {
  let query = await db.config.findMany({
    where: {
      AND: [
        { environmentId: environmentId },
        { data: { path: [fieldKey, 'value'], equals: fieldValue } },
      ],
    },
  });
  return !query.length;
}

/**
 * Checks whether the parameters contained in a config already contain a given parameter name.
 * @param configId ID of the config that is to be checked.
 * @param parameterName Parameter name that is to be checked.
 * @returns True if name is not used as a parameter name inside the config.
 */
export async function validateParameterName(
  configId: string,
  parentId: string,
  parentType: 'config' | 'parameter',
  parameterName: string,
): Promise<boolean> {
  const parentConfig = await getDeepConfigurationById(configId);
  if (parentType === 'config') {
    return parentConfig.content.filter((param) => param.name === parameterName).length == 0;
  } else {
    const parent = await findUniqueValue(parentConfig.content, 'id', parentId);
    if (parent) {
      return (
        parent.subParameters.filter((param: Parameter) => param.name === parameterName).length == 0
      );
    } else {
      // parent parameter does not exist
      return false;
    }
  }
}

/**
 * Replaces an existing Parameter with the given. Also removes subParameters of previous parameter.
 * @param parameter Parameter object that is to be stored. Its ID is used to determine which parameter to overwrite
 */
export async function overrideParameter(parameterId: string, parameter: Partial<Parameter>) {
  // remove redundant ID
  if (parameter.id == parameterId) {
    delete parameter.id;
  }

  // check if parameter exists, throws error if ID does not exist
  const oldParameter = await referencedParametersFromStorage(parameterId);
  if (parameter.name !== oldParameter.name) {
    // TODO: on name change
  }
  if ('transformation' in parameter) {
    // TODO: on transformation change
  }
  if ('valueTemplateSource' in parameter) {
    // TODO: on metadata reference change
  }
  if ('subParameters' in parameter) {
    return;
  }

  const parameterTyped: Partial<StoredParameter> = {
    ...parameter,
    parentId: oldParameter.parentId,
    parentType: oldParameter.parentType,
    subParameters: undefined,
  };
  StoredParameterZod.partial().parse(parameterTyped);

  const parentConfig = await findParentConfig(oldParameter);

  await updateParameter(parameterId, parameterTyped, parentConfig.id);
}

async function findParent(parameter: StoredParameter): Promise<{
  parent: StoredConfig | StoredParameter;
  parameterLocation: 'content' | 'subParameters';
}> {
  let parent;
  let parameterLocation: 'content' | 'subParameters';

  if (parameter.parentType === 'parameter') {
    const parentParameterResult = await db.configParameter.findUnique({
      where: { id: parameter.parentId },
    });
    parent = parentParameterResult?.data as unknown as StoredParameter;
    parameterLocation = 'subParameters';
  } else {
    const parentConfigResult = await db.config.findUnique({ where: { id: parameter.parentId } });
    parent = parentConfigResult?.data as unknown as StoredConfig;
    parameterLocation = 'content';
  }

  if (parent) {
    return { parent, parameterLocation };
  } else {
    throw new Error(`Parent for the parameter with the id ${parameter.id} does not exist.`);
  }
}

async function findParentConfig(parameter: StoredParameter): Promise<StoredConfig> {
  let parent;

  if (parameter.parentType === 'parameter') {
    const parentParameterResult = await db.configParameter.findUnique({
      where: { id: parameter.parentId },
    });
    let parentParameter = parentParameterResult?.data as unknown as StoredParameter;
    parent = await findParentConfig(parentParameter);
  } else {
    const parentConfigResult = await db.config.findUnique({ where: { id: parameter.parentId } });
    parent = parentConfigResult?.data as unknown as StoredConfig;
  }

  if (parent) {
    return parent;
  } else {
    throw new Error(`Parent for the parameter with the id ${parameter.id} does not exist.`);
  }
}

export async function validateParentConfig(configId: string, parameterId: string) {
  try {
    let param = await referencedParametersFromStorage(parameterId);
    let parentConfig = await findParentConfig(param);
    return parentConfig.id === configId;
  } catch {
    console.error('Could not validate.');
    return null;
  }
}

export async function sendViaMqtt(
  brokerUrl: string,
  mqttTopic: string,
  payload: any,
  username?: string,
  password?: string,
): Promise<{ error: UserError } | void> {
  try {
    // Connect to the broker
    const client = await mqtt.connectAsync(brokerUrl, { username: username, password: password });

    // Send payload
    await client.publishAsync(mqttTopic, JSON.stringify(payload), { qos: 0 });

    client.end();
  } catch (rej: any) {
    return userError(rej.message);
  }
}

// ----------------------- AAS ---------------------------------

// TODO to be removed
export async function getAasConfigurations(
  environmentId: string,
  ability?: Ability,
): Promise<Config[]> {
  const storedConfigs = await db.config.findMany({
    where: { environmentId: environmentId },
  });
  if (!storedConfigs.length) return [];
  //TODO remove redundancy
  const AASSubmodels = await asyncMap(storedConfigs, async ({ data }) => data as any as Config);

  // TODO: further filtering to only show what the user can see needed?

  return ability
    ? AASSubmodels /*ability.filter('view', 'MachineConfig', machineConfig)*/
    : AASSubmodels;
}

// TODO to be removed
export async function getAasConfigurationById(configId: string): Promise<Config> {
  let configResult = await db.config.findUnique({ where: { id: configId } });
  if (!configResult) throw new Error(`Configuration with id ${configId} does not exist!`);

  return configResult.data as any as Config;
}

// TODO rework: AAS import
export async function addAasData(aasJson: AasJson, environmentId: string) {
  const { userId } = await getCurrentUser();
  const folderId = (await getRootFolder(environmentId)).id;
  let submodel: AasSubmodel = aasJson.submodels[0];
  const idMatch =
    aasJson.assetAdministrationShells[0].assetInformation.globalAssetId.match(/[^/]+$/);
  const versionIdMatch = aasJson.assetAdministrationShells[0].id.match(/[^/]+$/);
  const templateIdMatch = submodel.idShort.match(/[^/]+$/);
  const newConfig: Config = {
    ...defaultConfiguration(
      environmentId,
      aasJson.assetAdministrationShells[0].displayName[0].text,
      aasJson.assetAdministrationShells[0].idShort,
      aasJson.assetAdministrationShells[0].description[0].text,
      [],
    ),
    folderId,
    createdBy: userId,
    lastEditedBy: userId,
    content: [],
    ...(idMatch && { id: idMatch[0] }),
    ...(versionIdMatch && { versionId: versionIdMatch[0] }),
    ...(templateIdMatch && { templateId: templateIdMatch[0] }),
  };

  const newContent: Parameter[] = await asyncMap(
    submodel.submodelElements,
    async (element: AasSubmodelElement) =>
      (await submodelElementToParameter(
        element,
        newConfig.id,
        aasJson.conceptDescriptions,
      )) as Parameter,
  );
  newConfig.content = newContent;

  try {
    const folderData = await getFolderById(newConfig.folderId);
    if (!folderData) throw new Error('Folder not found');
    // TODO
    AasSubmodelZod.parse(submodel);
    return await addParentConfig(newConfig, environmentId, userId);
  } catch (error: any) {
    if (error.errors) {
      return userError('Zod parse errors:', error.errors);
    } else {
      return userError(error.message ?? 'Unknown error during parse:', error);
    }
  }
}

// maybe move this to configuration-helpers?
export async function submodelElementToParameter(
  element: AasSubmodelElement | AasProperty | AasOperation,
  parentId: string,
  conceptDescriptions: AasConceptDescription[],
): Promise<Parameter | VirtualParameter> {
  // parameter ID from qualifiers
  const id: string = element.qualifiers.find((e) => e.type === 'PROCEED-id')!.value;
  if (!id) throw new Error('Prop does not contain an ID.');

  // parameter parameterType from qualifiers
  const rawParameterType = element.qualifiers.find(
    (e) => e.type === 'PROCEED-parameterType',
  )!.value;
  const parameterType: Parameter['parameterType'] = ['content', 'meta', 'none'].includes(
    rawParameterType,
  )
    ? (rawParameterType as Parameter['parameterType'])
    : 'none';

  // parameter unitRef from qualifiers
  const unitRef: string | undefined = element.qualifiers.find(
    (e) => e.type === 'PROCEED-unitRef',
  )?.value;

  // parameter structureVisible from qualifiers
  const structureVisible: boolean =
    element.qualifiers.find((e) => e.type === 'PROCEED-structureVisible')!.value === 'true' || true;

  // parameter changeableByUser from qualifiers
  const changeableByUser: boolean =
    element.qualifiers.find((e) => e.type === 'PROCEED-changeableByUser')!.value === 'true' || true;

  switch (element.modelType) {
    case 'SubmodelElementCollection': {
      let elementTyped = element as AasSubmodelElement;
      const newParameter: Parameter = {
        id,
        name: elementTyped.idShort,
        displayName: elementTyped.displayName ?? [],
        description: elementTyped.description ?? [],
        // TODO
        usedAsInputParameterIn: [],
        subParameters: [],
        parameterType,
        structureVisible,
        changeableByUser,
        hasChanges: false,
      };
      const childParameters: Parameter[] = [];
      if (elementTyped.value) {
        for (const param of elementTyped.value) {
          childParameters.push(
            await submodelElementToParameter(param, newParameter.id, conceptDescriptions),
          );
        }
      }
      newParameter.subParameters = childParameters;
      return newParameter;
    }
    case 'Operation': {
      let elementTyped = element as AasOperation;
      const newParameter: Parameter = {
        id,
        name: elementTyped.idShort,
        displayName: elementTyped.displayName ?? [],
        description: elementTyped.description ?? [],
        // TODO
        usedAsInputParameterIn: [],
        // TODO
        value: elementTyped.qualifiers[0].value,
        subParameters: [],
        parameterType,
        structureVisible,
        changeableByUser,
        hasChanges: false,
      };
      return newParameter;
    }
    default: {
      let elementTyped = element as AasProperty;

      const rawValueTemplateSource = element.qualifiers.find(
        (e) => e.type === 'PROCEED-valueTemplateSource',
      )?.value;

      let unitId = elementTyped.semanticId?.keys[0].value;

      if (rawValueTemplateSource) {
        // -- reading a virtual parameter --
        if (!['category', 'description', 'name', 'shortName'].includes(rawValueTemplateSource)) {
          throw new Error(
            `Invalid metadata set for valueTemplateSource: ${rawValueTemplateSource}`,
          );
        }
        const valueTemplateSource =
          rawValueTemplateSource as VirtualParameter['valueTemplateSource'];
        const newParameter: VirtualParameter = {
          id,
          name: elementTyped.idShort,
          displayName: elementTyped.displayName ?? [],
          description: elementTyped.description ?? [],
          usedAsInputParameterIn: [],
          valueTemplateSource,
          valueType: elementTyped.valueType,
          unitRef,
          parameterType,
          structureVisible,
          subParameters: [],
          changeableByUser,
          hasChanges: false,
        };
        return newParameter;
      } else {
        // -- reading a regular parameter --
        const newParameter: Parameter = {
          id,
          name: elementTyped.idShort,
          displayName: elementTyped.displayName ?? [],
          description: elementTyped.description ?? [],
          value: elementTyped.value,
          valueType: elementTyped.valueType,
          unitRef,
          parameterType,
          structureVisible,
          // TODO
          usedAsInputParameterIn: [],
          subParameters: [],
          changeableByUser,
          hasChanges: false,
        };
        return newParameter;
      }
    }
  }
}

export async function partialPropToParameter(
  element: Partial<AasProperty>,
): Promise<Partial<Parameter | VirtualParameter>> {
  // parameter ID from qualifiers
  const id = element.qualifiers?.find((e) => e.type === 'PROCEED-id')?.value;

  // parameter parameterType from qualifiers
  const rawParameterType = element.qualifiers?.find(
    (e) => e.type === 'PROCEED-parameterType',
  )?.value;

  const parameterType: Parameter['parameterType'] | undefined = rawParameterType
    ? ['content', 'meta', 'none'].includes(rawParameterType)
      ? (rawParameterType as Parameter['parameterType'])
      : 'none'
    : undefined;

  // parameter unitRef from qualifiers
  const unitRef: string | undefined = element.qualifiers?.find(
    (e) => e.type === 'PROCEED-unitRef',
  )?.value;

  // parameter structureVisible from qualifiers
  const structureVisible: boolean =
    element.qualifiers?.find((e) => e.type === 'PROCEED-structureVisible')?.value === 'true' ||
    true;

  // parameter changeableByUser from qualifiers
  const changeableByUser: boolean =
    element.qualifiers?.find((e) => e.type === 'PROCEED-changeableByUser')?.value === 'true' ||
    true;

  const rawValueTemplateSource = element.qualifiers?.find(
    (e) => e.type === 'PROCEED-valueTemplateSource',
  )?.value;

  let unitId = element.semanticId?.keys[0].value;

  if (rawValueTemplateSource) {
    // -- reading a virtual parameter --
    if (!['category', 'description', 'name', 'shortName'].includes(rawValueTemplateSource)) {
      throw new Error(`Invalid metadata set for valueTemplateSource: ${rawValueTemplateSource}`);
    }
    const valueTemplateSource = rawValueTemplateSource as VirtualParameter['valueTemplateSource'];
    let newParameter: Partial<VirtualParameter> = {
      id,
      name: element.idShort,
      displayName: element.displayName ?? [],
      description: element.description ?? [],
      usedAsInputParameterIn: [],
      valueTemplateSource,
      valueType: element.valueType,
      unitRef,
      parameterType,
      structureVisible,
    };
    newParameter = Object.fromEntries(
      Object.entries(newParameter).filter(([key, value]) => truthyFilter(value)),
    );
    return newParameter;
  } else {
    // -- reading a regular parameter --
    let newParameter: Partial<Parameter> = {
      id,
      name: element.idShort,
      displayName: element.displayName ?? [],
      description: element.description ?? [],
      value: element.value,
      valueType: element.valueType,
      unitRef,
      parameterType,
      structureVisible,
    };
    newParameter = Object.fromEntries(
      Object.entries(newParameter).filter(([key, value]) => truthyFilter(value)),
    );
    return newParameter;
  }
}

// TODO rework: units
async function getUnitFromAasConceptDescription(
  conceptDescriptions: AasConceptDescription[],
  queryId: string | undefined,
  // ): Promise<AasUnit | undefined> {
): Promise<undefined> {
  return;
  //   if (!queryId) return;
  //   let result = conceptDescriptions.filter((cd) => cd.id == queryId)[0];
  //   let key = result.idshort;
  //   let displayName = result.embeddedDataSpecifications[0].dataSpecificationContent.preferredName;
  //   let unitSymbol = result.embeddedDataSpecifications[0].dataSpecificationContent.unit;
  // return { key, displayName, unitSymbol } as AasUnit;
}

async function removeNestedKey(obj: any, keyToRemove: string) {
  if (obj !== null && typeof obj === 'object') {
    for (const key in obj) {
      if (key === keyToRemove) {
        delete obj[key];
      } else {
        removeNestedKey(obj[key], keyToRemove);
      }
    }
  }
  return obj;
}

async function replaceNestedObject(obj: any, objToReplace: any) {
  if (obj !== null && typeof obj === 'object') {
    for (const key in obj) {
      if (obj[key].id === objToReplace.id) {
        delete obj[key];
        obj[objToReplace.key] = objToReplace;
      } else {
        replaceNestedObject(obj[key], objToReplace);
      }
    }
  }
  return obj;
}

/**
 * Returns ownerId for a given space in the DB.
 * @param spaceId
 * @returns ownerId
 */
export async function getSpaceOwner(spaceId: string) {
  let storedSpace = await db.space.findUnique({ where: { id: spaceId } });
  return storedSpace?.ownerId;
}

export async function getConfigIdFromShortName(shortName: string, environmentId: string) {
  let query = await db.config.findMany({
    where: {
      AND: [
        { environmentId: environmentId },
        { data: { path: ['shortName', 'value'], equals: shortName } },
      ],
    },
  });
  if (query.length == 0) throw new Error(`No config to the shortName "${shortName}" found.`);
  // assuming only one config is found
  return query[0].id;
}

/**
 * Returns parameter containing the value in the given field.
 * @param parameters List of parameters to be searched recursively.
 * @param fieldKey Key of the field in which to search for the given value.
 * @param fieldValue Value to compare the parameters value at the given field to.
 * @returns the parameter containing the seached value - or undefined if none is found.
 */
async function findUniqueValue(
  parameters: Parameter[],
  fieldKey: keyof Parameter,
  fieldValue: string,
): Promise<Parameter | undefined> {
  for (const parameter of parameters) {
    if (parameter[fieldKey] == fieldValue) {
      return parameter;
    }
    const res = await findUniqueValue(parameter.subParameters, fieldKey, fieldValue);
    if (res) return res;
  }
  return undefined;
}

export async function getParameterParent(parameterId: string) {
  try {
    const parameter = await referencedParametersFromStorage(parameterId);
    return { parentId: parameter.parentId, parentType: parameter.parentType };
  } catch {
    console.error(`Could not find parameter ${parameterId}.`);
    return null;
  }
}

// =============== Target/Reference Dataset Versioning ===============

/**
 * Deep comparison of two parameters and their nested subParameters.
 * Compares all relevant fields to detect any changes.
 */
function deepCompareParameters(
  param1: Parameter | VirtualParameter | undefined,
  param2: Parameter | VirtualParameter | undefined,
  excludeNames: string[] = [],
): { difference: boolean; structureChange: boolean } {
  const equal = { difference: false, structureChange: false };
  const different = { difference: true, structureChange: false };
  const differentStructure = { difference: true, structureChange: true };

  // If both undefined, they are equal
  if (!param1 && !param2) return equal;

  // If one is undefined, they are different
  if (!param1 || !param2) return different;

  // Skip excluded parameters
  if (excludeNames.includes(param1.name) || excludeNames.includes(param2.name)) {
    return equal;
  }

  // Compare basic fields
  if (
    param1.name !== param2.name ||
    param1.parameterType !== param2.parameterType ||
    param1.structureVisible !== param2.structureVisible ||
    param1.valueType !== param2.valueType ||
    param1.unitRef !== param2.unitRef ||
    param1.changeableByUser !== param2.changeableByUser
  ) {
    return different;
  }

  // Compare value field (only exists on Parameter, not VirtualParameter)
  if ('value' in param1 && 'value' in param2) {
    if (param1.value !== param2.value) return different;
  } else if ('value' in param1 || 'value' in param2) {
    // One has value, other doesn't
    return different;
  }

  // Compare valueTemplateSource (only exists on VirtualParameter)
  if ('valueTemplateSource' in param1 && 'valueTemplateSource' in param2) {
    if (param1.valueTemplateSource !== param2.valueTemplateSource) return different;
  } else if ('valueTemplateSource' in param1 || 'valueTemplateSource' in param2) {
    return different;
  }

  // Compare displayName arrays
  if (param1.displayName?.length !== param2.displayName?.length) return different;
  if (param1.displayName && param2.displayName) {
    for (let i = 0; i < param1.displayName.length; i++) {
      if (
        param1.displayName[i].language !== param2.displayName[i].language ||
        param1.displayName[i].text !== param2.displayName[i].text
      ) {
        return different;
      }
    }
  }

  // Compare description arrays
  if (param1.description?.length !== param2.description?.length) return different;
  if (param1.description && param2.description) {
    for (let i = 0; i < param1.description.length; i++) {
      if (
        param1.description[i].language !== param2.description[i].language ||
        param1.description[i].text !== param2.description[i].text
      ) {
        return different;
      }
    }
  }

  // Compare transformation (only exists on Parameter, not VirtualParameter)
  const param1Transformation = 'transformation' in param1 ? param1.transformation : undefined;
  const param2Transformation = 'transformation' in param2 ? param2.transformation : undefined;
  if (JSON.stringify(param1Transformation) !== JSON.stringify(param2Transformation)) {
    return different;
  }

  // Compare subParameters recursively
  if (param1.subParameters?.length !== param2.subParameters?.length) return differentStructure;
  if (param1.subParameters && param2.subParameters) {
    for (let i = 0; i < param1.subParameters.length; i++) {
      const parameterCheck = deepCompareParameters(
        param1.subParameters[i],
        param2.subParameters[i],
        excludeNames,
      );
      if (parameterCheck.difference) {
        if (parameterCheck.structureChange) return differentStructure;
        else return different;
      }
    }
  }

  // No differences found
  return equal;
}

/**
 * Gets the last numeric version from the ConfigVersion table for a given config.
 */
async function getLastNumericVersion(
  configId: string,
): Promise<{ versionNumber: number; versionId: string } | null> {
  // Get all versions for this config from ConfigVersion table
  const versionRecords = await db.configVersion.findMany({
    where: { configId },
  });

  if (versionRecords.length === 0) return null;

  // Parse versions and find the one with the highest numeric VersionNumber in Header
  let highestVersion: { versionNumber: number; versionId: string } | null = null;
  let highestVersionNum = -1;

  for (const versionRecord of versionRecords) {
    if (versionRecord.versionNo > highestVersionNum) {
      highestVersionNum = versionRecord.versionNo;
      highestVersion = {
        versionNumber: versionRecord.versionNo,
        versionId: configId,
      };
    }
  }

  return highestVersion;
}

/**
 * Extracts a parameter at a given path from a config.
 */
function extractParameter(config: Config, path: string[]): Parameter | undefined {
  if (path.length === 0) return undefined;

  let current: Parameter | undefined = config.content.find(
    (p: Parameter | VirtualParameter) => p.name === path[0],
  ) as Parameter | undefined;

  for (let i = 1; i < path.length && current; i++) {
    current = current.subParameters?.find(
      (p: Parameter | VirtualParameter) => p.name === path[i],
    ) as Parameter | undefined;
  }

  return current;
}

/**
 * Extracts a parameter at a given path from a parameter.
 */
function extractParameterFromParameter(
  parameter: Parameter,
  path: string[],
): Parameter | undefined {
  if (path.length === 0) return undefined;

  let current: Parameter | undefined = parameter.subParameters.find(
    (p: Parameter | VirtualParameter) => p.name === path[0],
  ) as Parameter | undefined;

  for (let i = 1; i < path.length && current; i++) {
    current = current.subParameters?.find(
      (p: Parameter | VirtualParameter) => p.name === path[i],
    ) as Parameter | undefined;
  }

  return current;
}

type VersionChangeCheckResult = {
  hasChanged: boolean;
  nextVersionNumber: number | null;
  changedDatasets: ('Header' | 'TargetDataset' | 'ReferenceDataset' | 'MachineDatasets')[];
  changedMachineDatasetIds?: string[];
};

/**
 * Checks if the Header, Target Dataset, or Reference Dataset have changed compared to the previous version.
 */
export async function versioningCheckIfTargetOrReferenceSetChanged(
  configId: string,
  currentConfig: Config,
): Promise<VersionChangeCheckResult> {
  // Get current VersionNumber parameter value
  const headerParam = currentConfig.content.find((p) => p.name === 'Header');
  let currentVersionNumber: string | undefined;

  if (headerParam && headerParam.subParameters) {
    const versionNumberParam = headerParam.subParameters.find((p) => p.name === 'VersionNumber');
    if (versionNumberParam && 'value' in versionNumberParam) {
      currentVersionNumber = versionNumberParam.value;
    }
  }

  // Get the last numeric version from ConfigVersion table
  // const previousVersion = await getLastNumericVersion(configId);
  const previousVersion = currentConfig.latestVersionNumber;

  // If no previous version exists, this is the first version
  if (!previousVersion) {
    return {
      hasChanged: true,
      nextVersionNumber: 1,
      changedDatasets: [],
    };
  }

  // Load previous version config
  const previousConfig = await getlastVersion(configId, previousVersion);

  // Extract relevant datasets from both versions
  const currentHeader = extractParameter(currentConfig, ['Header']);
  const currentTarget = extractParameter(currentConfig, ['Body', 'TargetDataset']);
  const currentReference = extractParameter(currentConfig, ['Body', 'ReferenceDataset']);

  const previousHeader = extractParameter(previousConfig, ['Header']);
  const previousTarget = extractParameter(previousConfig, ['Body', 'TargetDataset']);
  const previousReference = extractParameter(previousConfig, ['Body', 'ReferenceDataset']);

  // Deep comparison (exclude VersionNumber parameter itself)
  const changedDatasets: ('Header' | 'TargetDataset' | 'ReferenceDataset')[] = [];

  // Compare Header (excluding VersionNumber)
  if (deepCompareParameters(currentHeader, previousHeader, ['VersionNumber']).difference) {
    changedDatasets.push('Header');
  }

  // Compare Target Dataset
  if (deepCompareParameters(currentTarget, previousTarget).difference) {
    changedDatasets.push('TargetDataset');
  }

  // Compare Reference Dataset
  if (deepCompareParameters(currentReference, previousReference).difference) {
    changedDatasets.push('ReferenceDataset');
  }

  const hasChanged = changedDatasets.length > 0;

  // Calculate next version number
  // if there is change and MachineDatasets is not the only change: Version + 1
  // else if there is still change: Version stays
  const nextVersionNumber = hasChanged ? previousVersion + 1 : null;

  return { hasChanged, nextVersionNumber, changedDatasets };
}

export async function versioningCheckEachMachineSetChanged(
  configId: string,
  currentConfig: Config,
) {
  // Get current VersionNumber parameter value
  const headerParam = currentConfig.content.find((p) => p.name === 'Header');
  let currentVersionNumber: string | undefined;

  if (headerParam && headerParam.subParameters) {
    const versionNumberParam = headerParam.subParameters.find((p) => p.name === 'VersionNumber');
    if (versionNumberParam && 'value' in versionNumberParam) {
      currentVersionNumber = versionNumberParam.value;
    }
  }

  // Get the last numeric version from ConfigVersion table
  // const previousVersion = await getLastNumericVersion(configId);
  const previousVersion = currentConfig.latestVersionNumber;

  // If no previous version exists, this is the first version
  if (!previousVersion) {
    return {
      hasChanged: true,
      nextVersionNumber: 1,
      changedDatasets: [],
    };
  }

  // Load previous version config
  const previousConfig = await getlastVersion(configId, previousVersion);
  const currentMachines = extractParameter(currentConfig, ['Body', 'MachineDatasets']);
  const previoustMachines = extractParameter(previousConfig, ['Body', 'MachineDatasets']);
  return deepCompareParameters(currentMachines, previoustMachines);
}

export async function versioningCheckIfSetsChanged(
  configId: string,
  currentConfig: Config,
): Promise<VersionChangeCheckResult> {
  // Get current VersionNumber parameter value
  const headerParam = currentConfig.content.find((p) => p.name === 'Header');
  let currentVersionNumber: string | undefined;

  if (headerParam && headerParam.subParameters) {
    const versionNumberParam = headerParam.subParameters.find((p) => p.name === 'VersionNumber');
    if (versionNumberParam && 'value' in versionNumberParam) {
      currentVersionNumber = versionNumberParam.value;
    }
  }

  // Get the last numeric version from ConfigVersion table
  // const previousVersion = await getLastNumericVersion(configId);
  // TODO UPDATE
  const previousVersion = currentConfig.latestVersionNumber;

  // If no previous version exists, this is the first version
  if (!previousVersion) {
    return {
      hasChanged: true,
      nextVersionNumber: 1,
      changedDatasets: [],
      changedMachineDatasetIds: [],
    };
  }

  // Load previous version config
  const previousConfig = await getlastVersion(configId, previousVersion);

  // Extract relevant datasets from both versions
  const currentHeader = extractParameter(currentConfig, ['Header']);
  const currentTarget = extractParameter(currentConfig, ['Body', 'TargetDataset']);
  const currentReference = extractParameter(currentConfig, ['Body', 'ReferenceDataset']);
  const currentMachines = extractParameter(currentConfig, ['Body', 'MachineDatasets']);

  const previousHeader = extractParameter(previousConfig, ['Header']);
  const previousTarget = extractParameter(previousConfig, ['Body', 'TargetDataset']);
  const previousReference = extractParameter(previousConfig, ['Body', 'ReferenceDataset']);
  const previoustMachines = extractParameter(previousConfig, ['Body', 'MachineDatasets']);

  // Deep comparison (exclude VersionNumber parameter itself)
  const changedDatasets: ('Header' | 'TargetDataset' | 'ReferenceDataset' | 'MachineDatasets')[] =
    [];
  const changedMachineDatasetIds: string[] = [];
  // Compare Header (excluding VersionNumber)
  if (deepCompareParameters(currentHeader, previousHeader, ['VersionNumber']).difference) {
    changedDatasets.push('Header');
  }

  // Compare Target Dataset
  if (deepCompareParameters(currentTarget, previousTarget).difference) {
    changedDatasets.push('TargetDataset');
  }

  // Compare Reference Dataset
  if (deepCompareParameters(currentReference, previousReference).difference) {
    changedDatasets.push('ReferenceDataset');
  }
  // check each individual machine dataset
  if (
    currentMachines &&
    currentMachines.subParameters &&
    previoustMachines &&
    previoustMachines.subParameters
  ) {
    const currentMachinesList = currentMachines.subParameters as Parameter[];
    const previousMachinesList = previoustMachines.subParameters as Parameter[];

    currentMachinesList.forEach((currentMachine) => {
      const previousMachine = previousMachinesList.find((pm) => pm.id === currentMachine.id);

      if (!previousMachine) {
        // new machine dataset, a satety check
        changedMachineDatasetIds.push(currentMachine.id);
      } else {
        // if exist
        const comparisonResult = deepCompareParameters(currentMachine, previousMachine, [
          'StructureVersionNumber',
          'VersionNumber',
          'FullVersionNumber',
        ]);

        if (comparisonResult.difference) {
          changedMachineDatasetIds.push(currentMachine.id);
        }
      }
    });

    if (changedMachineDatasetIds.length > 0) {
      changedDatasets.push('MachineDatasets');
    }
  } else if (
    deepCompareParameters(currentMachines, previoustMachines, [
      'StructureVersionNumber',
      'VersionNumber',
      'FullVersionNumber',
    ]).difference
  ) {
    changedDatasets.push('MachineDatasets');
  }

  const hasChanged = changedDatasets.length > 0;

  // Calculate next version number
  // if there is change and MachineDatasets is not the only change: Version + 1
  // else if there is still change: Version stays
  const nextVersionNumber =
    hasChanged && !(changedDatasets.includes('MachineDatasets') && changedDatasets.length == 1)
      ? previousVersion + 1
      : hasChanged
        ? previousVersion
        : null;

  return { hasChanged, nextVersionNumber, changedDatasets, changedMachineDatasetIds };
}

/**
 * Type for the result of creating a new version.
 */
export type VersionCreationResult = {
  versionCreated: boolean;
  newVersionNumber: number | null;
  versionId?: string;
  message: string;
};

/**
 * Creates a new version for Target/Reference datasets if changes are detected.
 * Updates the VersionNumber parameter to "latest" in the current config and stores a snapshot with numeric version.
 */
export async function versioningCreateNewVersionForTargetOrReferenceSet(
  configId: string,
  versionName?: string,
  versionDescription?: string,
): Promise<VersionCreationResult> {
  // Load current config
  const currentConfig = await getDeepConfigurationById(configId);
  if (!currentConfig) {
    throw new Error(`Config with id ${configId} not found`);
  }

  // Check for changes
  const changeCheck = await versioningCheckIfTargetOrReferenceSetChanged(configId, currentConfig);

  if (!changeCheck.hasChanged) {
    return {
      versionCreated: false,
      newVersionNumber: null,
      message: 'No changes detected in Header, Target, Reference or Machine datasets',
    };
  }
  if (changeCheck.nextVersionNumber == null) {
    return {
      versionCreated: false,
      newVersionNumber: null,
      message: 'Something broke.',
    };
  }

  // Find or create VersionNumber parameter
  const headerParam = currentConfig.content.find((p) => p.name === 'Header');
  if (!headerParam) {
    throw new Error('Header parameter not found in config');
  }

  let versionNumberParam = headerParam.subParameters?.find((p) => p.name === 'VersionNumber');

  if (!versionNumberParam) {
    // Create VersionNumber parameter if it doesn't exist
    const newVersionNumberParam: Parameter = {
      id: v4(),
      name: 'VersionNumber',
      parameterType: 'none' as const,
      structureVisible: true,
      displayName: [
        { text: 'Version Number', language: 'en' },
        { text: 'Versionsnummer', language: 'de' },
      ],
      description: [
        {
          text: 'The version number indicates that the structure or content of any parameter of the Target or Reference Dataset has been changed since the last version.',
          language: 'en',
        },
        {
          text: 'Die Versionsnummer zeigt an, dass die Struktur oder der Inhalt eines Parameters des Ziel- oder Referenzdatensatzes seit der letzten Version geändert wurde.',
          language: 'de',
        },
      ],
      value: String(changeCheck.nextVersionNumber),
      valueType: 'xs:integer',
      subParameters: [],
      usedAsInputParameterIn: [],
      changeableByUser: true,
      hasChanges: false,
    };

    // Add to Header's subParameters
    await addParameter(headerParam.id, 'parameter', newVersionNumberParam, configId);
    await storeAllCachedData();

    await updateParameter(newVersionNumberParam.id, { value: 'latest' }, configId);
  } else {
    await updateParameter(versionNumberParam.id, { value: 'latest' }, configId);
  }

  await storeAllCachedData();

  // Reload config after updates
  const updatedConfig = await getDeepConfigurationById(configId);

  // Create version metadata
  let versions = Array.from(updatedConfig.versions || []);
  versions.push({
    id: changeCheck.nextVersionNumber.toString(),
    name: versionName || `Version ${changeCheck.nextVersionNumber}`,
    description:
      versionDescription || `Auto-versioned: Changes in ${changeCheck.changedDatasets.join(', ')}`,
    versionBasedOn: currentConfig.latestVersionNumber?.toString(),
    createdOn: new Date(),
  });

  // Clone current config for versioning
  const versionedConfig: Config = JSON.parse(JSON.stringify(updatedConfig));

  // Set the numeric version number in the cloned config's VersionNumber parameter
  const versionedHeaderParam = versionedConfig.content.find((p) => p.name === 'Header');
  if (versionedHeaderParam && versionedHeaderParam.subParameters) {
    const versionedVersionNumberParam = versionedHeaderParam.subParameters.find(
      (p) => p.name === 'VersionNumber',
    );
    if (versionedVersionNumberParam && 'value' in versionedVersionNumberParam) {
      versionedVersionNumberParam.value = String(changeCheck.nextVersionNumber);
    }
  }

  // Update version metadata in main config
  await updateParentConfig(configId, {
    versions,
    latestVersionNumber: changeCheck.nextVersionNumber,
  });
  await storeAllCachedData();

  await addParentConfigVersion(versionedConfig, changeCheck.nextVersionNumber);

  return {
    versionCreated: true,
    newVersionNumber: changeCheck.nextVersionNumber,
    versionId: currentConfig.id + '-' + currentConfig.latestVersionNumber?.toString(),
    message: `Version ${changeCheck.nextVersionNumber} created successfully`,
  };
}

export async function versioningCreateNewVersion(
  configId: string,
  versionName?: string,
  versionDescription?: string,
): Promise<VersionCreationResult> {
  // Load current config
  const currentConfig = await getDeepConfigurationById(configId);
  if (!currentConfig) {
    throw new Error(`Config with id ${configId} not found`);
  }

  // Check for changes
  const changeCheck = await versioningCheckIfSetsChanged(configId, currentConfig);

  if (!changeCheck.hasChanged) {
    return {
      versionCreated: false,
      newVersionNumber: null,
      message: 'No changes detected in Header, Target, Reference or Machine datasets',
    };
  }
  if (changeCheck.nextVersionNumber == null) {
    return {
      versionCreated: false,
      newVersionNumber: null,
      message: 'Something broke.',
    };
  }

  // Find or create VersionNumber parameter
  const headerParam = currentConfig.content.find((p) => p.name === 'Header');
  if (!headerParam) {
    throw new Error('Header parameter not found in config');
  }

  let versionNumberParam = headerParam.subParameters?.find((p) => p.name === 'VersionNumber');

  if (!versionNumberParam) {
    // Create VersionNumber parameter if it doesn't exist
    const newVersionNumberParam = {
      id: v4(),
      name: 'VersionNumber',
      parameterType: 'none' as const,
      structureVisible: true,
      displayName: [
        { text: 'Version Number', language: 'en' },
        { text: 'Versionsnummer', language: 'de' },
      ],
      description: [
        {
          text: 'The version number indicates that the structure or content of any parameter of the Target or Reference Dataset has been changed since the last version.',
          language: 'en',
        },
        {
          text: 'Die Versionsnummer zeigt an, dass die Struktur oder der Inhalt eines Parameters des Ziel- oder Referenzdatensatzes seit der letzten Version geändert wurde.',
          language: 'de',
        },
      ],
      value: String(changeCheck.nextVersionNumber),
      valueType: 'xs:integer',
      subParameters: [],
      usedAsInputParameterIn: [],
      changeableByUser: true,
      hasChanges: false,
    } as Parameter;

    // Add to Header's subParameters
    await addParameter(headerParam.id, 'parameter', newVersionNumberParam, configId);

    await updateParameter(newVersionNumberParam.id, { value: 'latest' }, configId);
  } else {
    await updateParameter(versionNumberParam.id, { value: 'latest' }, configId);
  }

  // Reload config after updates
  const updatedConfig = await getDeepConfigurationById(configId);

  // Create version metadata
  let versions = Array.from(updatedConfig.versions || []);
  versions.push({
    id: changeCheck.nextVersionNumber.toString(),
    name: versionName || `Version ${changeCheck.nextVersionNumber}`,
    description:
      versionDescription || `Auto-versioned: Changes in ${changeCheck.changedDatasets.join(', ')}`,
    versionBasedOn: currentConfig.latestVersionNumber?.toString(),
    createdOn: new Date(),
  });

  // Clone current config for versioning
  const versionedConfig: Config = JSON.parse(JSON.stringify(updatedConfig));

  // Set the numeric version number in the cloned config's VersionNumber parameter
  const versionedHeaderParam = versionedConfig.content.find((p) => p.name === 'Header');
  if (versionedHeaderParam && versionedHeaderParam.subParameters) {
    const versionedVersionNumberParam = versionedHeaderParam.subParameters.find(
      (p) => p.name === 'VersionNumber',
    );
    if (versionedVersionNumberParam && 'value' in versionedVersionNumberParam) {
      versionedVersionNumberParam.value = String(changeCheck.nextVersionNumber);
    }
  }

  await addParentConfigVersion(versionedConfig, changeCheck.nextVersionNumber);

  // Update version metadata in main config
  await updateParentConfig(configId, {
    versions,
    latestVersionNumber: changeCheck.nextVersionNumber,
    hasChanges: false,
  });

  return {
    versionCreated: true,
    newVersionNumber: changeCheck.nextVersionNumber,
    versionId: currentConfig.id + '-' + currentConfig.latestVersionNumber?.toString(),
    message: `Version ${changeCheck.nextVersionNumber} created successfully`,
  };
}

/**
 * Returns a list of stored versions for a given machine data set ID.
 * @param machineId ID of the data set whichs versions are to be retrieved
 * @returns List of strings of all stored versions. (in the form of ["3.2.1","4.2.0"])
 */
export async function getMachineVersions(machineId: string): Promise<string[]> {
  const machineVersions = await db.configMachineVersion.findMany({
    where: { machineId: machineId },
  });
  const versionMapping = await asyncMap(machineVersions, async (e) => {
    if (e) {
      return e.versionNo + '.' + e.structureNo + '.' + e.updateNo;
    }
  });
  return versionMapping.filter(truthyFilter);
}

/**
 * Returns a list of stored versions for all given machine data set IDs.
 * @param machineIds list of machine IDs whichs versions are to be retrieved
 * @returns List of records of all stored versions
 */
export async function getMultipleMachineVersions(
  machineIds: string[],
): Promise<{ id: string; versions: string[] }[]> {
  const results = await asyncMap(machineIds, async (id) => {
    try {
      const versions = await getMachineVersions(id);
      return { id, versions: versions as string[] };
    } catch (err) {
      // on error return empty versions for that machine
      return { id, versions: [] as string[] };
    }
  });
  return results;
}

export async function getVersionChangeState(configId: string): Promise<{
  tdsVersionInfo: { hasChanges: boolean; currentVersion: string; nextVersion: string };
  machineDatasets: Array<{
    id: string;
    name: string;
    hasChanges: boolean;
    currentVersion: string;
    nextVersion: string;
  }>;
}> {
  // Load current config
  const currentConfig = await getDeepConfigurationById(configId);
  if (!currentConfig) {
    throw new Error(`Config with id ${configId} not found`);
  }
  const machineConfigs = extractParameter(currentConfig, ['Body', 'MachineDatasets']) as Parameter;

  // Check for changes
  const changeCheck = await versioningCheckIfSetsChanged(configId, currentConfig);

  if (!changeCheck.hasChanged) {
    const existingMachineDatasets: Array<{
      id: string;
      name: string;
      hasChanges: boolean;
      currentVersion: string;
      nextVersion: string;
    }> = [];

    if (machineConfigs && machineConfigs.subParameters) {
      if (currentConfig.latestVersionNumber) {
        try {
          const latestVersionedConfig = await db.configVersion.findFirst({
            where: {
              configId: currentConfig.id,
              versionNo: currentConfig.latestVersionNumber,
            },
          });

          if (latestVersionedConfig) {
            const versionData = latestVersionedConfig.machineDatasets as any;
            const machineVersionReferences = (versionData || []) as MachineVersionReference[];

            (machineConfigs.subParameters as Parameter[]).forEach((machine) => {
              const machineParam = machine as Parameter;
              const machineName =
                machineParam?.displayName?.find((item) => item.language === 'de')?.text ||
                machineParam?.name ||
                machine.id;

              const previousRef = machineVersionReferences?.find(
                (ref) => ref.machineDatasetId === machine.id,
              );
              const version =
                previousRef?.latestVersionedNo || `${currentConfig.latestVersionNumber}.0.0`;

              existingMachineDatasets.push({
                id: machine.id,
                name: machineName,
                hasChanges: false,
                currentVersion: version,
                nextVersion: version,
              });
            });
          }
        } catch (error) {
          console.error('Error fetching existing machine versions:', error);
        }
      } else {
        (machineConfigs.subParameters as Parameter[]).forEach((machine) => {
          const machineParam = machine as Parameter;
          const machineName =
            machineParam?.displayName?.find((item) => item.language === 'de')?.text ||
            machineParam?.name ||
            machine.id;

          existingMachineDatasets.push({
            id: machine.id,
            name: machineName,
            hasChanges: false,
            currentVersion: '1.1.0',
            nextVersion: '1.1.0',
          });
        });
      }
    }

    return {
      tdsVersionInfo: {
        hasChanges: false,
        currentVersion: currentConfig.latestVersionNumber?.toString() || '0',
        nextVersion: currentConfig.latestVersionNumber?.toString() || '0',
      },
      machineDatasets: existingMachineDatasets,
    };
  }
  if (changeCheck.nextVersionNumber == null) {
    throw new Error('next Version could not be determined');
  }

  try {
    const versionNo = changeCheck.nextVersionNumber;
    const changedMachineIds = new Set(changeCheck.changedMachineDatasetIds || []);
    let machineVersionList: { id: string; fullVersion: number[] }[] = [];

    const tdsVersionInfo = {
      hasChanges: true,
      currentVersion: currentConfig.latestVersionNumber?.toString() || '0',
      nextVersion: versionNo.toString(),
    };

    if (!currentConfig.latestVersionNumber) {
      const firstMachineVersionList = (machineConfigs.subParameters as Parameter[]).map((e) => ({
        id: e.id,
        fullVersion: [versionNo, 1, 0],
      }));
      machineVersionList = firstMachineVersionList;

      // for first version, mark all machine datasets as changed
      machineVersionList.forEach((machine) => {
        changedMachineIds.add(machine.id);
      });
    } else {
      const latestVersionedConfig = await db.configVersion.findFirst({
        where: {
          configId: currentConfig.id,
          versionNo: currentConfig.latestVersionNumber,
        },
      });

      if (latestVersionedConfig) {
        // console.log('previous version exists..');
        const machineVersionReferences =
          latestVersionedConfig.machineDatasets as MachineVersionReference[];

        if (machineVersionReferences && machineVersionReferences.length) {
          const versionedMachineConfigs = await asyncMap(
            machineVersionReferences,
            async (machineReference) => {
              return machineMapping(
                machineReference,
                currentConfig.latestVersionNumber!,
                versionNo,
                machineConfigs,
              );
            },
          );

          machineVersionList = versionedMachineConfigs.filter(truthyFilter);
          const versionedMachineConfigIds = machineVersionList.map((e) => e.id);
          const untrackedMachineVersions = (machineConfigs.subParameters as Parameter[]).filter(
            (e) => !versionedMachineConfigIds.includes(e.id),
          );

          const untrackedMachineVersionList = untrackedMachineVersions.map((e) => ({
            id: e.id,
            fullVersion: [versionNo, 1, 0],
          }));
          machineVersionList.push(...untrackedMachineVersionList);

          machineVersionList = machineVersionList.map((machine) => {
            const previousRef = machineVersionReferences.find(
              (ref) => ref.machineDatasetId === machine.id,
            );

            if (previousRef) {
              const previousFullVersion = previousRef.latestVersionedNo.split('.').map(Number);

              if (machine.fullVersion[1] === previousFullVersion[1]) {
                return {
                  id: machine.id,
                  fullVersion: [
                    versionNo,
                    machine.fullVersion[1] || 0,
                    machine.fullVersion[2] || 0,
                  ],
                };
              }
            }

            return machine;
          });
        } else {
          const untrackedMachineVersionList = (machineConfigs.subParameters as Parameter[]).map(
            (e) => ({
              id: e.id,
              fullVersion: [versionNo, 1, 0],
            }),
          );
          machineVersionList = untrackedMachineVersionList;
        }
      } else {
        //console.log('Warning: latestVersionNumber exists but version not found in DB');

        const fallbackMachineVersionList = (machineConfigs.subParameters as Parameter[]).map(
          (e) => ({
            id: e.id,
            fullVersion: [versionNo, 1, 0],
          }),
        );
        machineVersionList = fallbackMachineVersionList;
      }
    }

    //console.log('machineVersionList:', machineVersionList);

    // fetch previous version references to get actual previous versions
    let previousMachineVersions: Map<string, string> = new Map();
    if (currentConfig.latestVersionNumber) {
      try {
        const latestVersionedConfig = await db.configVersion.findFirst({
          where: {
            configId: currentConfig.id,
            versionNo: currentConfig.latestVersionNumber,
          },
        });

        if (latestVersionedConfig) {
          const machineVersionReferences =
            latestVersionedConfig.machineDatasets as MachineVersionReference[];

          machineVersionReferences?.forEach((ref) => {
            previousMachineVersions.set(ref.machineDatasetId, ref.latestVersionedNo);
          });
        }
      } catch (error) {
        console.error('Error fetching previous versions:', error);
      }
    }

    const machineDatasets = machineVersionList.map((machine) => {
      const machineParam = (machineConfigs.subParameters as Parameter[]).find(
        (p) => p.id === machine.id,
      );
      const machineName = machineParam?.name || machine.id;

      const nextVersion = machine.fullVersion.join('.');
      const hasChanges = changedMachineIds.has(machine.id);

      // see if this machine existed in previous version
      const hadPreviousVersion = previousMachineVersions.has(machine.id);

      // for first version or the new machine dataset, currentVersion should be 0.0.0
      const currentVersion = hadPreviousVersion
        ? previousMachineVersions.get(machine.id)!
        : '0.0.0';

      return {
        id: machine.id,
        name: machineName,
        hasChanges,
        currentVersion,
        nextVersion,
      };
    });

    return {
      tdsVersionInfo,
      machineDatasets,
    };
  } catch (e: unknown) {
    const error = e as Error;
    throw userError(error.message ?? 'There was an error getting information about this version.');
  }
}

async function machineMapping(
  machineReference: MachineVersionReference,
  previousVersion: number,
  versionNo: number,
  machineConfigs: Parameter,
) {
  // [mainVersionNo, structureVersionNo, updateVersionNo]
  let machineVersionBundle = machineReference.latestVersionedNo.split('.').map(Number);

  if (previousVersion == versionNo) {
    // console.log('has previous version number');
    // only the machine data has changed so we need to calculate version per machine
    if (machineVersionBundle[0] == previousVersion) {
      // console.log(
      //   'latest machine version is on the same main versionNo as previous config versionNo..',
      // );
      // latest machine version is on the same main versionNo as previous config versionNo
      // --> so this machine has possibly changed

      let previousMachineVersion = await db.configMachineVersion.findUnique({
        where: {
          fullVersion: {
            machineId: machineReference.machineDatasetId,
            versionNo: machineVersionBundle[0],
            structureNo: machineVersionBundle[1],
            updateNo: machineVersionBundle[2],
          },
        },
      });
      // TODO handle case where a referenced machine version does not exist
      if (previousMachineVersion) {
        let previousMachineConfig = previousMachineVersion.data as Parameter;
        let currentMachineConfig = machineConfigs.subParameters.find(
          (e: Parameter) => e.id == previousMachineConfig.id,
        );
        if (currentMachineConfig) {
          const parameterCheck = deepCompareParameters(
            previousMachineConfig,
            currentMachineConfig,
            ['StructureVersionNumber', 'VersionNumber', 'FullVersionNumber'],
          );
          if (parameterCheck.difference) {
            // console.log('there is a difference..');
            if (parameterCheck.structureChange) {
              // console.log('structure change..');
              // increase structureNo
              const newFullVersion = [machineVersionBundle[0], machineVersionBundle[1] + 1, 0];
              return {
                id: currentMachineConfig.id,
                fullVersion: newFullVersion,
              };
            } else {
              // console.log('there is an update..');
              // increase updateNo
              const newFullVersion = [
                machineVersionBundle[0],
                machineVersionBundle[1],
                machineVersionBundle[2] + 1,
              ];
              return {
                id: currentMachineConfig.id,
                fullVersion: newFullVersion,
              };
            }
          } else {
            // console.log('(corporate says) there is no difference..');
            // version stays the same
          }
        } else {
          // previous machineConfig removed
          // --> can be discarded for the comparison
        }
      }
    } else {
      // the machineConfig was removed at some point in the past
      // --> can be discarded for the comparison
    }
  } else {
    // header data or similar has changed
    // set all machineConfigs in versionedConfig to versionNo.strucutreNo.0

    // console.log('has new version number');

    let newFullVersion;
    let previousMachineVersion = await db.configMachineVersion.findUnique({
      where: {
        fullVersion: {
          machineId: machineReference.machineDatasetId,
          versionNo: machineVersionBundle[0],
          structureNo: machineVersionBundle[1],
          updateNo: machineVersionBundle[2],
        },
      },
    });
    if (previousMachineVersion) {
      let previousMachineConfig = previousMachineVersion.data as Parameter;
      let currentMachineConfig = machineConfigs.subParameters.find(
        (e: Parameter) => e.id == previousMachineConfig.id,
      );
      const parameterCheck = deepCompareParameters(previousMachineConfig, currentMachineConfig, [
        'StructureVersionNumber',
        'VersionNumber',
        'FullVersionNumber',
      ]);
      if (parameterCheck.structureChange) {
        newFullVersion = [versionNo, machineVersionBundle[1] + 1, 0];
      } else {
        newFullVersion = [versionNo, machineVersionBundle[1], 0];
      }
      return {
        id: machineReference.machineDatasetId,
        fullVersion: newFullVersion,
      };
    }
  }
}

export async function reorderParameter(
  parameterId: string,
  direction: 'up' | 'down',
  configId: string,
): Promise<void> {
  'use server';

  try {
    // load the current config
    const currentConfig = await getDeepConfigurationById(configId);
    if (!currentConfig) {
      throw new Error(`Config with id ${configId} not found`);
    }

    // find the parameter and its parent
    const findParameterWithParent = (
      params: Parameter[],
      targetId: string,
      parent: Config | Parameter,
    ): { param: Parameter; parent: Config | Parameter; siblings: Parameter[] } | null => {
      for (let i = 0; i < params.length; i++) {
        const param = params[i];

        if (param.id === targetId) {
          return { param, parent, siblings: params };
        }

        if (param.subParameters && param.subParameters.length > 0) {
          const found = findParameterWithParent(
            param.subParameters as Parameter[],
            targetId,
            param,
          );
          if (found) return found;
        }
      }
      return null;
    };

    const result = findParameterWithParent(currentConfig.content, parameterId, currentConfig);

    if (!result) {
      throw new Error(`Parameter with id ${parameterId} not found`);
    }

    const { param, parent, siblings } = result;
    const currentIndex = siblings.findIndex((p) => p.id === parameterId);

    if (currentIndex === -1) {
      throw new Error(`Parameter index not found`);
    }

    // calculate new index based on request
    let newIndex: number;
    if (direction === 'up') {
      if (currentIndex === 0) {
        throw new Error('Parameter is already at the top');
      }
      newIndex = currentIndex - 1;
    } else {
      if (currentIndex === siblings.length - 1) {
        throw new Error('Parameter is already at the bottom');
      }
      newIndex = currentIndex + 1;
    }

    // reorder the array
    const reorderedSiblings = [...siblings];
    const [movedParam] = reorderedSiblings.splice(currentIndex, 1);
    reorderedSiblings.splice(newIndex, 0, movedParam);

    // update the parent's subParameters
    if ('content' in parent) {
      // update root level parameters in cache
      (parent as Config).content = reorderedSiblings;

      // update in database
      const reorderedIds = reorderedSiblings.map((p) => p.id);
      await updateParentConfig(configId, { content: reorderedIds });
    } else {
      // update nested subParameters
      (parent as Parameter).subParameters = reorderedSiblings;

      // update in the database
      const reorderedIds = reorderedSiblings.map((p) => p.id);
      await updateParameter(parent.id, { subParameters: reorderedIds }, configId);
    }

    await storeAllCachedData();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`Failed to reorder parameter: ${errorMessage}`);
    throw new Error(`Failed to reorder parameter: ${errorMessage}`);
  }
}

export async function clearChangeTags(configId: string) {
  const storedConfigData = await db.config.findUnique({ where: { id: configId } });
  if (storedConfigData) {
    const storedConfig = storedConfigData.data as unknown as StoredConfig;
    await asyncForEach(storedConfig.content, (e) => clearParameterChangeTags(e, storedConfig.id));
  }
}
async function clearParameterChangeTags(parameterId: string, parentConfigId: string) {
  const storedParameterData = await db.configParameter.findUnique({ where: { id: parameterId } });
  if (storedParameterData) {
    const storedParameter = storedParameterData.data as unknown as StoredParameter;

    await db.configParameter.update({
      where: { id: parameterId },
      data: { data: { ...storedParameter, hasChanges: false } },
    });
    await asyncForEach(storedParameter.subParameters, (id) =>
      clearParameterChangeTags(id, parentConfigId),
    );
  }
}

/**
 * Adds a new default userParameter to the organizational config of the specified
 * organization environment.
 * @param userId ID of the user for whom a new parameter should be created.
 * @param spaceId ID of the organization environment whose organizational config
 * will receive the new userParameter.
 * @returns UserError if the orgConfig has an invalid internal structure, or if the
 * provided user is invalid.
 */
export async function addUserParameter(userId: string, spaceId: string) {
  const member = (await getMembers(spaceId)).find((member) => member.userId === userId);
  if (!member) return userError(`Membership for user ${userId} in space ${spaceId} not found.`);
  const ret = await addMemberParameter(member);
  if (ret && 'error' in ret) return ret;
}

export async function addMemberParameter(member: Membership) {
  const user = await getUserById(member.userId);
  if (user && !user.isGuest) {
    const newUserParameter = defaultUserParameterTemplate(
      user.id,
      member.id,
      user.firstName || 'N/A',
      user.lastName || 'N/A',
    );
    const orgConfig = await getDeepConfigurationById(member.environmentId);
    const parentParameter = extractParameter(orgConfig, ['identity-and-access-management', 'user']);
    if (parentParameter) {
      await addParameter(parentParameter.id, 'parameter', newUserParameter, member.environmentId);
    } else {
      return userError(
        `Parent Parameter at the path ['identity-and-access-management', 'user'] could not be found for organizational config ${member.environmentId}.`,
      );
    }
  } else {
    return userError(`Invalid user: ${member.userId}.`);
  }
}

export async function getUserParameter(userId: string, spaceId: string) {
  const memberId = (await getMembers(spaceId)).find((member) => member.userId === userId)?.id;
  if (memberId) {
    return (await nestedParametersFromStorage([memberId]))[0];
  } else {
    return userError(`Membership for user ${userId} in space ${spaceId} not found.`);
  }
}

/**
 * Retrieves the user-specific data for a given organization space. The returned userdata is
 * wrapped in a dummy config to allow convenient display in the config editor.
 * @param userId ID of the user whose data should be displayed.
 * @param spaceId ID of the organization environment from which the user's data is retrieved.
 * @returns A dummy config containing the userParameter as the sole element of its content field.
 */
export async function getUserConfig(
  userId: string,
  spaceId: string,
): Promise<Config | { error: UserError }> {
  try {
    const userParam = await getUserParameter(userId, spaceId);
    if ('error' in userParam) throw userParam.error;
    const userData = extractParameterFromParameter(userParam, ['data']);
    if (userData) {
      const dummyConfig = defaultConfiguration(spaceId, 'dummy userConfig');
      userParam.changeableByUser = true;
      dummyConfig.configType = 'dummy';
      // dummyConfig.content = userData?.subParameters;
      dummyConfig.content = [userData];
      dummyConfig.id = userId;
      return dummyConfig;
    } else {
      throw userError(`Userdata element 'data' for UserId ${userId} not found.`);
    }
  } catch (error) {
    return userError(
      error instanceof Error
        ? error.message
        : `user config cannot be loaded. \nUserID: ${userId}\nSpaceID: ${spaceId}`,
    );
  }
}

/**
 * Retrieves the user-specific data for a given personal space. The returned userdata is
 * wrapped in a dummy config to allow convenient display in the config editor.
 * @param userId ID of the user whose data should be displayed.
 * @returns A dummy config containing the userParameter as the sole element of its content field.
 */
export async function getUserPersonalConfig(
  userId: string,
): Promise<Config | { error: UserError }> {
  try {
    const userParam = (await nestedParametersFromStorage([userId]))[0];
    const userData = extractParameterFromParameter(userParam, ['data']);
    if (userData) {
      userData.changeableByUser = true;
      const dummyConfig = defaultConfiguration(userId, 'dummy userConfig');
      // userParam.changeableByUser = false;
      dummyConfig.configType = 'dummy';
      // dummyConfig.content = userData?.subParameters;
      dummyConfig.content = [userData];
      dummyConfig.id = userId;
      return dummyConfig;
    } else {
      throw userError(`Userdata element 'data' for UserId ${userId} not found.`);
    }
  } catch (error) {
    return userError(
      error instanceof Error ? error.message : `user config cannot be loaded. \nUserID: ${userId}`,
    );
  }
}

/**
 * Synchronizes the userParameters stored in the organizational config for the given spaceId.
 * Creates a new userParameter for any organization member who does not yet have one. Removes
 * userParameters belonging to users who are no longer part of the organization.
 * @param spaceId ID of the organization environment.
 * @returns UserError if the orgConfig has an invalid internal structure, or if the provided config
 *          has the wrong configType (expected: 'organization').
 */
export async function syncOrganizationUsers(spaceId: string) {
  console.info(`SYNCING: Users for organization-config ${spaceId}`);
  const spaceMembers = await getMembers(spaceId);
  if (!spaceMembers.length) return userError(`No members for space ${spaceId} found.`);
  const orgConfig = await getDeepConfigurationById(spaceId);
  const matchedUsers = new Set<string>();
  const parametersToRemove = [];
  if (orgConfig.configType === 'organization') {
    const userListParameter = extractParameter(orgConfig, [
      'identity-and-access-management',
      'user',
    ]);
    if (userListParameter) {
      for (const userParameter of userListParameter.subParameters) {
        const matchFound = spaceMembers.find((member) => member.id === userParameter.id);
        if (!matchFound) {
          parametersToRemove.push(userParameter.id);
        } else {
          matchedUsers.add(matchFound.id);
        }
      }
      const usersToAdd = spaceMembers.filter((member) => !matchedUsers.has(member.id));
      for (const newUser of usersToAdd) {
        await addMemberParameter(newUser);
      }
      for (const parameterId of parametersToRemove) {
        await removeParameter(parameterId);
      }
    } else {
      return userError(
        `Parent Parameter at the path ['identity-and-access-management', 'user'] could not be found for organizational config ${spaceId}.`,
      );
    }
  } else {
    return userError(`Config ${spaceId} is not of type 'organization'.`);
  }
}

/**
 * Synchronizes the userParameter stored in the organizational config for the given personal space.
 * Creates a new userParameter for the corresponding user if it doesn't exist.
 * Removes userParameters belonging to users who do not belong to the personal space.
 * @param spaceId ID of the personal space (userId).
 * @returns UserError if the orgConfig has an invalid internal structure, or if the provided config
 *          has the wrong configType (expected: 'organization').
 */
export async function syncPersonalSpaceUser(spaceId: string) {
  console.info(`SYNCING: User for space-config ${spaceId}`);
  const orgConfig = await getDeepConfigurationById(spaceId);
  const parametersToRemove = [];
  let userMissing = true;
  if (orgConfig.configType === 'organization') {
    const userListParameter = extractParameter(orgConfig, [
      'identity-and-access-management',
      'user',
    ]);
    if (userListParameter) {
      for (const userParameter of userListParameter.subParameters) {
        const matchFound = spaceId === userParameter.id;
        if (!matchFound) {
          parametersToRemove.push(userParameter.id);
        } else {
          userMissing = false;
        }
      }
      if (userMissing) {
        await addMemberParameter({
          id: spaceId,
          environmentId: spaceId,
          createdOn: new Date(),
          userId: spaceId,
        });
      }
      for (const parameterId of parametersToRemove) {
        await removeParameter(parameterId);
      }
    } else {
      return userError(
        `Parent Parameter at the path ['identity-and-access-management', 'user'] could not be found for organizational config ${spaceId}.`,
      );
    }
  } else {
    return userError(`Config ${spaceId} is not of type 'organization'.`);
  }
}

/**
 * Synchronizes the database state of spaces (formerly only organizations) with their corresponding
 * organizational configs. Creates a new config for any space that does not yet have one.
 * Removes outdated configs that belong to spaces which no longer exist.
 * @returns UserError if a configuration cannot be created.
 */
export async function syncSpaceConfigs() {
  console.info(`SYNCING: Organization Configs`);
  const spaces = await db.space.findMany({
    // where: {
    //   isOrganization: true,
    // },
  });
  const configs = await db.config.findMany();
  const spaceConfigs = await asyncFilter(
    configs,
    async (config) => (config.data as unknown as Config).configType === 'organization',
  );
  const matchedSpaces = new Set<string>();
  const spacesToAdd = [];

  // matching all configs of configType:'organization' to the organizations
  for (const org of spaces) {
    const existingConfig = await db.config.findUnique({ where: { id: org.id } });
    if (existingConfig) matchedSpaces.add(existingConfig.id);
    else spacesToAdd.push(org);
  }

  // adding missing configs for the spaces that do not have a config yet
  for (const newSpace of spacesToAdd) {
    const ret = await addParentConfig(
      {
        ...defaultOrganizationConfigurationTemplate(
          newSpace.id,
          newSpace.name || 'Organizational Config',
        ),
      },
      newSpace.id,
    );
    if (ret && 'error' in ret) {
      return ret;
    }
  }

  // removing organizational configs for which no organization exists anymore
  const configsToRemove = spaceConfigs.filter((config) => !matchedSpaces.has(config.id));
  for (const oldConfig of configsToRemove) {
    await removeParentConfiguration(oldConfig.id);
  }
}
