'use server';

import store from './store.js';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import {
  ParentConfig,
  AbstractConfigInputSchema,
  ParentConfigMetadata,
  AbstractConfigInput,
} from '../machine-config-schema';
import { foldersMetaObject, getRootFolder } from './folders';
import { UserErrorType, userError } from '@/lib/user-error';
import { v4 } from 'uuid';
import eventHandler from './eventHandler.js';
import { toCaslResource } from '@/lib/ability/caslAbility';

// @ts-ignore
let firstInit = !global.parentConfigMetaObjects;

let parentConfigMetaObjects: Record<string, ParentConfig> =
  // @ts-ignore
  global.parentConfigMetaObjects || (global.parentConfigMetaObjects = {});

/**
 * initializes the machineConfig meta information objects
 */
export async function init() {
  if (!firstInit) return;

  // get machineConfig that were persistently stored
  const storedMachineConfig = store.get('machineConfig') as ParentConfig[];

  // set machineConfig store cache for quick access
  storedMachineConfig.forEach((config) => (parentConfigMetaObjects[config.id] = config));
}
await init();

const checkValidity = async (
  definitionId: string,
  operation: 'view' | 'update' | 'delete',
  spaceId: string,
) => {
  const { ability } = await getCurrentEnvironment(spaceId);

  const machineConfig = parentConfigMetaObjects[definitionId];

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
export async function getConfigurations(environmentId: string, ability?: Ability) {
  const parentConfig = Object.values(parentConfigMetaObjects).filter(
    (config) => config.environmentId === environmentId,
  );

  return ability
    ? parentConfig /*ability.filter('view', 'MachineConfig', machineConfig)*/
    : parentConfig;
}

/**
 * Returns a machineConfig based on machineConfig id
 *
 * @throws {UnauthorizedError}
 */
export async function getConfigurationById(
  machineConfigId: string,
  ability?: Ability,
): Promise<ParentConfig> {
  const parentConfig = parentConfigMetaObjects[machineConfigId];
  if (!ability) return parentConfig;

  if (
    parentConfig &&
    false /*!ability.can('view', toCaslResource('MachineConfig', machineConfig))*/
  )
    throw new UnauthorizedError();

  return parentConfig;
}

export async function createParentConfig(
  machineConfigInput: AbstractConfigInput,
  environmentId: string,
) {
  try {
    const parentConfigData = AbstractConfigInputSchema.parse(machineConfigInput);
    const date = new Date().toUTCString();
    const metadata: ParentConfig = {
      ...({
        id: v4(),
        type: 'config',
        name: 'Default Parent Configuration',
        description: { label: 'description', value: '' },
        variables: [],
        parameters: [],
        createdBy: environmentId,
        lastEditedBy: environmentId,
        lastEditedOn: date,
        userId: { label: 'User ID', value: environmentId },
        customFields: [],
        picture: { label: 'Picture', value: '' },
        departments: [],
        inEditingBy: [],
        createdOn: date,
        lastEdited: date,
        sharedAs: 'protected',
        shareTimestamp: 0,
        allowIframeTimestamp: 0,
        versions: [],
        folderId: '',
        targetConfig: undefined,
        machineConfigs: [],
        environmentId: environmentId,
        owner: { label: 'owner', value: environmentId },
      } as ParentConfig),
      ...parentConfigData,
    };
    if (!metadata.folderId) {
      metadata.folderId = getRootFolder(metadata.environmentId).id;
    }

    const folderData = foldersMetaObject.folders[metadata.folderId];
    if (!folderData) throw new Error('Folder not found');
    const { id: definitionId } = metadata;
    if (parentConfigMetaObjects[definitionId]) {
      throw new Error(`A parent configuration with the id ${definitionId} already exists!`);
    }

    parentConfigMetaObjects[definitionId] = metadata;
    store.add('machineConfig', removeExcessiveInformation(metadata));

    eventHandler.dispatch('machineConfigAdded', { machineConfig: metadata });

    return metadata;
  } catch (e) {
    return userError("Couldn't create Machine Config");
  }
}

export async function saveParentConfig(id: string, machineConfigInput: ParentConfig) {
  try {
    let machineConfig = parentConfigMetaObjects[id];
    if (!machineConfig) {
      return;
    }

    parentConfigMetaObjects[id] = machineConfigInput;
    store.update('machineConfig', id, removeExcessiveInformation(machineConfigInput));

    eventHandler.dispatch('machineConfigSaved', { machineConfig: machineConfigInput });

    return machineConfigInput;
  } catch (e) {
    return userError("Couldn't save Machine Config");
  }
}

function removeExcessiveInformation(parentConfigInfo: ParentConfigMetadata) {
  const newInfo = { ...parentConfigInfo };
  delete newInfo.inEditingBy;
  return newInfo;
}

/** Removes an existing machine config */
export async function removeParentConfiguration(parentConfigDefinitionsId: string) {
  const parentConfig = parentConfigMetaObjects[parentConfigDefinitionsId];

  if (!parentConfig) {
    return;
  }

  // remove parentConfig from frolder
  foldersMetaObject.folders[parentConfig.folderId]!.children = foldersMetaObject.folders[
    parentConfig.folderId
  ]!.children.filter((folder) => folder.id !== parentConfigDefinitionsId);

  // remove from store
  store.remove('machineConfig', parentConfigDefinitionsId);
  delete parentConfigMetaObjects[parentConfigDefinitionsId];
  eventHandler.dispatch('configurationRemoved', { parentConfigDefinitionsId });
}

export const deleteParentConfigurations = async (definitionIds: string[], spaceId: string) => {
  for (const definitionId of definitionIds) {
    const error = await checkValidity(definitionId, 'delete', spaceId);

    if (error) return error;

    await removeParentConfiguration(definitionId);
  }
};
