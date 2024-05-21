import store from './store.js';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import {
  MachineConfig,
  MachineConfigInput,
  MachineConfigInputSchema,
} from '../machine-config-schema';
import { useEnvironment } from '@/components/auth-can';
import { userError } from '@/lib/user-error';
import { v4 } from 'uuid';

// @ts-ignore
let firstInit = !global.machineConfigMetaObjects;

export let machineConfigMetaObjects: Record<string, MachineConfig> =
  // @ts-ignore
  global.machineConfigMetaObjects || (global.machineConfigMetaObjects = {});

/**
 * initializes the machineConfig meta information objects
 */
export function init() {
  if (!firstInit) return;

  // get machineConfig that were persistently stored
  const storedMachineConfig = store.get('machineConfig') as MachineConfig[];

  // set machineConfig store cache for quick access
  storedMachineConfig.forEach((config) => (machineConfigMetaObjects[config.id] = config));
}
init();

/** Returns all machineConfigs in form of an array */
export function getMachineConfig(environmentId: string, ability?: Ability) {
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
export function getMachineConfigById(machineConfigId: string, ability?: Ability) {
  const machineConfig = machineConfigMetaObjects[machineConfigId];
  if (!ability) return machineConfig;

  if (
    machineConfig &&
    false /*!ability.can('view', toCaslResource('MachineConfig', machineConfig))*/
  )
    throw new UnauthorizedError();

  return machineConfig;
}

export async function createMachineConfig(machineConfigInput: MachineConfigInput) {
  try {
    const environment = useEnvironment();
    const machineConfig = MachineConfigInputSchema.parse(machineConfigInput);
    const { ability, activeEnvironment } = await getCurrentEnvironment(environment.spaceId);
    const { userId } = await getCurrentUser();

    //if (!machineConfig.parentId)
    //  machineConfig.parentId = getRootFolder(machineConfig.environmentId).id;

    if (!machineConfig.id) machineConfig.id = v4();

    // Checks
    //if (ability && !ability.can('create', toCaslResource('MachineConfig', machineConfig)))
    //  throw new Error('Permission denied');

    //if (machineConfigsMetaObjects.machineConfigs[machineConfig.id]) throw new Error('MachineConfig already exists');

    // Store
    const newMachineConfig = {
      ...machineConfig,
      environmentId: activeEnvironment.spaceId,
      //createdAt: new Date().toISOString(),
      //updatedAt: new Date().toISOString(),
      //createdBy: userId,
    } as MachineConfig;

    machineConfigMetaObjects[machineConfig.id] = {
      ...newMachineConfig,
    };

    store.add('machineConfig', newMachineConfig);

    return newMachineConfig;
  } catch (e) {
    return userError("Couldn't create Machine Config");
  }
}

// delete, update, create ... etc.

//adapted from folders.ts, not functional yet

/* function _createMachineConfig(machineConfigInput: MachineConfigInput, ability?: Ability) {
  const machineConfig = MachineConfigSchema.parse(machineConfigInput);
  if (!machineConfig.id) machineConfig.id = v4();

  // Checks
  //if (ability && !ability.can('create', toCaslResource('MachineConfig', machineConfig)))
  //  throw new Error('Permission denied');

  //if (machineConfigsMetaObjects.machineConfigs[machineConfig.id]) throw new Error('MachineConfig already exists');

  // Store
  const newMachineConfig = {
    ...machineConfig,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as MachineConfig;

  //machineConfigsMetaObjects.machineConfigs[machineConfig.id] = { machineConfig: newMachineConfig };

  store.add('machineConfig', newMachineConfig);

  return newMachineConfig;
}

export async function createMachineConfig(machineConfigInput: MachineConfigUserInput) {
  try {
    const machineConfig = MachineConfigUserInputSchema.parse(machineConfigInput);
    const { ability } = await getCurrentEnvironment(machineConfig.environmentId);
    const { userId } = await getCurrentUser();

    if (!machineConfig.parentId)
      machineConfig.parentId = getRootFolder(machineConfig.environmentId).id;

    _createMachineConfig({ ...machineConfig, createdBy: userId }, ability);
  } catch (e) {
    return userError("Couldn't create Machine Config");
  }
}

// from data/processes.tsx
export const addProcesses = async (
  values: { name: string; description: string; bpmn?: string; folderId?: string }[],
  spaceId: string,
) => {
  const { ability, activeEnvironment } = await getCurrentEnvironment(spaceId);
  const { userId } = await getCurrentUser();

  const newProcesses: Process[] = [];

  for (const value of values) {
    const { bpmn } = await createProcess({
      name: value.name,
      description: value.description,
      bpmn: value.bpmn,
    });

    const newProcess = {
      bpmn,
      owner: userId,
      environmentId: activeEnvironment.spaceId,
    };

    if (!ability.can('create', toCaslResource('Process', newProcess))) {
      return userError('Not allowed to create this process', UserErrorType.PermissionError);
    }

    // bpmn prop gets deleted in addProcess()
    const process = await _addProcess({ ...newProcess, folderId: value.folderId });

    if (typeof process !== 'object') {
      return userError('A process with this id does already exist');
    }

    newProcesses.push({ ...process, bpmn });
  }

  return newProcesses;
};

// from lib/helpers/processHelpers.ts
/**
 * Creates a new proceed process either from a given bpmn or from a default bpmn template
 * creates a bpmn and a meta info object
 *
export async function createProcess(
  processInfo: ProcessInput & { bpmn?: string },
  noDefaults: boolean = false,
) {
  // create default bpmn if user didn't provide any
  let bpmn = processInfo.bpmn || initXml();

  // schema parser removes bpmn property
  let metaInfo = ProcessInputSchema.parse(processInfo);

  let definitions;

  try {
    const xmlObj = await toBpmnObject(bpmn);
    [definitions] = getElementsByTagName(xmlObj, 'bpmn:Definitions');
  } catch (err) {
    throw new Error(`Invalid bpmn: ${err}`);
  }

  // from data/legacy/_process.ts
  /** Handles adding a process, makes sure all necessary information gets parsed from bpmn
export async function addProcess(processInput: ProcessServerInput & { bpmn: string }) {
  // const processData = ProcessInputSchema.parse(processInput) as OptionalKeys<ProcessInput, 'bpmn'>;
  const { bpmn } = processInput;

  const processData = ProcessServerInputSchema.parse(processInput);

  if (!bpmn) {
    throw new Error("Can't create a process without a bpmn!");
  }

  // create meta info object
  const metadata = {
    ...getDefaultProcessMetaInfo(),
    ...processData,
    ...(await getProcessInfo(bpmn)),
  };

  if (!metadata.folderId) {
    metadata.folderId = getRootFolder(metadata.environmentId).id;
  }

  const folderData = foldersMetaObject.folders[metadata.folderId];
  if (!folderData) throw new Error('Folder not found');
  // TODO check folder permissions here, they're checked in movefolder,
  // but by then the folder was already created

  const { id: processDefinitionsId } = metadata;

  // check if there is an id collision
  if (processMetaObjects[processDefinitionsId]) {
    throw new Error(`A process with the id ${processDefinitionsId} already exists!`);
  }

  // save process info
  processMetaObjects[processDefinitionsId] = metadata;

  // write meta data to store
  store.add('processes', removeExcessiveInformation(metadata));
  // save bpmn
  await saveProcess(processDefinitionsId, bpmn);

  moveProcess({ processDefinitionsId, newFolderId: metadata.folderId, dontUpdateOldFolder: true });

  eventHandler.dispatch('processAdded', { process: metadata });

  return metadata;
}

// from data/legacy/fileHandling.js
/**
 * Saves the process bpmn of a process
 *
 * @param {String} id the id of the process
 * @param {String} bpmn the process description
 *
export async function saveProcess(id, bpmn) {
  const currentProcessFolder = getFolder(id);

  fse.ensureDirSync(currentProcessFolder);

  fse.writeFileSync(path.join(currentProcessFolder, id.concat('.bpmn')), bpmn);

  eventHandler.dispatch('files_changed_bpmn', { processDefinitionsId: id, bpmn });
}

*/
