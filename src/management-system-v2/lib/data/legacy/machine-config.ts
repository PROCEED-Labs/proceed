'use server';

import store from './store.js';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import {
  MachineConfig,
  MachineConfigInput,
  MachineConfigInputSchema,
  MachineConfigMetadata,
} from '../machine-config-schema';
import { foldersMetaObject, getRootFolder } from './folders';
import { UserErrorType, userError } from '@/lib/user-error';
import { v4 } from 'uuid';
import eventHandler from './eventHandler.js';
import { toCaslResource } from '@/lib/ability/caslAbility';

// @ts-ignore
let firstInit = !global.machineConfigMetaObjects;

let machineConfigMetaObjects: Record<string, MachineConfig> =
  // @ts-ignore
  global.machineConfigMetaObjects || (global.machineConfigMetaObjects = {});

/**
 * initializes the machineConfig meta information objects
 */
export async function init() {
  if (!firstInit) return;

  // get machineConfig that were persistently stored
  const storedMachineConfig = store.get('machineConfig') as MachineConfig[];

  // set machineConfig store cache for quick access
  storedMachineConfig.forEach((config) => (machineConfigMetaObjects[config.id] = config));
}
await init();

const checkValidity = async (
  definitionId: string,
  operation: 'view' | 'update' | 'delete',
  spaceId: string,
) => {
  const { ability } = await getCurrentEnvironment(spaceId);

  const machineConfig = machineConfigMetaObjects[definitionId];

  if (!machineConfig) {
    return userError(
      'A machine configuration with this id does not exist.',
      UserErrorType.NotFoundError,
    );
  }

  /*if (!ability.can('view', toCaslResource('Process', machineConfig))) {
      return userError('Not allowed to delete this machineConfig', UserErrorType.PermissionError);
    }*/

  const errorMessages = {
    view: 'Not allowed to read this machine configuration',
    update: 'Not allowed to update this machine configuration',
    delete: 'Not allowed to delete this machine configuration',
  };

  if (
    !ability.can(operation, toCaslResource('Process', machineConfig), {
      environmentId: machineConfig.environmentId,
    })
  ) {
    return userError(errorMessages[operation], UserErrorType.PermissionError);
  }
};

/** Returns all machineConfigs in form of an array */
export async function getMachineConfig(environmentId: string, ability?: Ability) {
  const machineConfig = Object.values(machineConfigMetaObjects).filter(
    (config) => config.environmentId === environmentId,
  );

  return ability
    ? machineConfig /*ability.filter('view', 'MachineConfig', machineConfig)*/
    : machineConfig;
}

/**
 * Returns a machineConfig based on machineConfig id
 *
 * @throws {UnauthorizedError}
 */
export async function getMachineConfigById(machineConfigId: string, ability?: Ability) {
  const machineConfig = machineConfigMetaObjects[machineConfigId];
  if (!ability) return machineConfig;

  if (
    machineConfig &&
    false /*!ability.can('view', toCaslResource('MachineConfig', machineConfig))*/
  )
    throw new UnauthorizedError();

  return machineConfig;
}

export async function createMachineConfig(
  machineConfigInput: MachineConfigInput,
  environmentId: string,
) {
  try {
    const machineConfigData = MachineConfigInputSchema.parse(machineConfigInput);

    // create meta info object
    const date = new Date().toUTCString();
    const metadata = {
      ...({
        id: v4(),
        type: 'machine-config',
        environmentId: environmentId,
        name: 'Default Machine Configuration',
        description: '',
        owner: '',
        variables: [],
        departments: [],
        inEditingBy: [],
        createdOn: date,
        lastEdited: date,
        sharedAs: 'protected',
        shareTimestamp: 0,
        allowIframeTimestamp: 0,
        versions: [],
        folderId: '',
      } as MachineConfig),
      ...machineConfigData,
    };
    if (!metadata.folderId) {
      metadata.folderId = getRootFolder(metadata.environmentId).id;
    }

    const folderData = foldersMetaObject.folders[metadata.folderId];
    if (!folderData) throw new Error('Folder not found');
    const { id: definitionId } = metadata;
    if (machineConfigMetaObjects[definitionId]) {
      throw new Error(`A machine configuration with the id ${definitionId} already exists!`);
    }

    machineConfigMetaObjects[definitionId] = metadata;
    store.add('machineConfig', removeExcessiveInformation(metadata));

    moveMachineConfig({
      definitionId,
      newFolderId: metadata.folderId,
      dontUpdateOldFolder: true,
    });

    eventHandler.dispatch('machineConfigAdded', { machineConfig: metadata });

    return metadata;
  } catch (e) {
    return userError("Couldn't create Machine Config");
  }
}

export async function saveMachineConfig(id: string, machineConfigInput: MachineConfig) {
  try {
    let machineConfig = machineConfigMetaObjects[id];
    if (!machineConfig) {
      return;
    }

    machineConfigMetaObjects[id] = machineConfigInput;
    store.update('machineConfig', id, removeExcessiveInformation(machineConfigInput));

    eventHandler.dispatch('machineConfigSaved', { machineConfig: machineConfigInput });

    return machineConfigInput;
  } catch (e) {
    return userError("Couldn't save Machine Config");
  }
}

export async function moveMachineConfig({
  definitionId,
  newFolderId,
  ability,
  dontUpdateOldFolder = false,
}: {
  definitionId: string;
  newFolderId: string;
  dontUpdateOldFolder?: boolean;
  ability?: Ability;
}) {
  // Checks
  const machineConfig = machineConfigMetaObjects[definitionId];
  if (!machineConfig) throw new Error('Machine Config not found');

  const folderData = foldersMetaObject.folders[newFolderId];
  if (!folderData) throw new Error('Folder not found');

  if (
    ability &&
    !ability.can('update', toCaslResource('MachineConfig', machineConfig)) &&
    !ability.can('update', toCaslResource('Folder', folderData.folder))
  )
    throw new UnauthorizedError();

  if (!dontUpdateOldFolder) {
    const oldFolder = foldersMetaObject.folders[machineConfig.folderId];
    if (!oldFolder) throw new Error("Consistensy Error: Machine Config' folder not found");
    const machineConfigOldFolderIdx = oldFolder.children.findIndex(
      (item) => 'type' in item && item.type === 'machine-config' && item.id === definitionId,
    );
    if (machineConfigOldFolderIdx === -1)
      throw new Error('Consistensy Error: Machine Config not found in folder');

    oldFolder.children.splice(machineConfigOldFolderIdx as number, 1);
  }

  folderData.children.push({ id: machineConfig.id, type: machineConfig.type });
  machineConfig.folderId = newFolderId;

  store.update('machineConfig', definitionId, removeExcessiveInformation(machineConfig));
}

function removeExcessiveInformation(machineConfigInfo: MachineConfigMetadata) {
  const newInfo = { ...machineConfigInfo };
  delete newInfo.inEditingBy;
  return newInfo;
}

/** Removes an existing machine config */
export async function removeMachineConfig(machineConfigDefinitionsId: string) {
  const machineConfig = machineConfigMetaObjects[machineConfigDefinitionsId];

  if (!machineConfig) {
    return;
  }

  // remove machineConfig from frolder
  foldersMetaObject.folders[machineConfig.folderId]!.children = foldersMetaObject.folders[
    machineConfig.folderId
  ]!.children.filter((folder) => folder.id !== machineConfigDefinitionsId);

  // remove from store
  store.remove('machineConfig', machineConfigDefinitionsId);
  delete machineConfigMetaObjects[machineConfigDefinitionsId];
  eventHandler.dispatch('machineConfigRemoved', { machineConfigDefinitionsId });
}

export const deleteMachineConfigs = async (definitionIds: string[], spaceId: string) => {
  for (const definitionId of definitionIds) {
    const error = await checkValidity(definitionId, 'delete', spaceId);

    if (error) return error;

    await removeMachineConfig(definitionId);
  }
};
