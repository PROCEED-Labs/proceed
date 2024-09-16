'use server';

import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { toCaslResource } from '../ability/caslAbility';
import {
  addDocumentation,
  generateDefinitionsId,
  getDefinitionsVersionInformation,
  setDefinitionsName,
  setDefinitionsVersionInformation,
  toBpmnObject,
  toBpmnXml,
} from '@proceed/bpmn-helper';
import { createProcess, getFinalBpmn } from '../helpers/processHelpers';
import { UserErrorType, userError } from '../user-error';
import {
  areVersionsEqual,
  getLocalVersionBpmn,
  selectAsLatestVersion,
  updateProcessVersionBasedOn,
  versionUserTasks,
} from '../helpers/processVersioning';
// Antd uses barrel files, which next optimizes away. That requires us to import
// antd components directly from their files in this server actions file.
import { Process } from './process-schema';
import { revalidatePath } from 'next/cache';
import { getUsersFavourites } from './users';
import { enableUseDB } from 'FeatureFlags';
import { TProcessModule } from './module-import-types-temp';
import {
  getProcessUserTaskJSON as _getProcessUserTaskJSON,
  getProcessImage as _getProcessImage,
  saveProcessUserTask as _saveProcessUserTask,
} from './legacy/_process';
import { error } from 'console';

// Declare variables to hold the process module functions
let removeProcess: TProcessModule['removeProcess'];
let _addProcess: TProcessModule['addProcess'];
let _getProcess: TProcessModule['getProcess'];
let _updateProcess: TProcessModule['updateProcess'];
let getProcessVersionBpmn: TProcessModule['getProcessVersionBpmn'];
let addProcessVersion: TProcessModule['addProcessVersion'];

let updateProcessMetaData: TProcessModule['updateProcessMetaData'];

let _getProcessBpmn: TProcessModule['getProcessBpmn'];

const loadModules = async () => {
  const moduleImport = await (enableUseDB ? import('./db/process') : import('./legacy/_process'));

  ({
    removeProcess,
    addProcess: _addProcess,
    getProcess: _getProcess,
    updateProcess: _updateProcess,
    getProcessVersionBpmn,
    addProcessVersion,
    updateProcessMetaData,
    getProcessBpmn: _getProcessBpmn,
  } = moduleImport);
};

loadModules().catch(console.error);

// Import necessary functions from processModule

const checkValidity = async (
  definitionId: string,
  operation: 'view' | 'update' | 'delete',
  spaceId: string,
) => {
  await loadModules();

  const { ability } = await getCurrentEnvironment(spaceId);

  const process = await _getProcess(definitionId);
  if (!process) {
    return userError('A process with this id does not exist.', UserErrorType.NotFoundError);
  }

  /*if (!ability.can('view', toCaslResource('Process', process))) {
    return userError('Not allowed to delete this process', UserErrorType.PermissionError);
  }*/

  const errorMessages = {
    view: 'Not allowed to read this process',
    update: 'Not allowed to update this process',
    delete: 'Not allowed to delete this process',
  };

  if (
    !ability.can(operation, toCaslResource('Process', process), {
      environmentId: process.environmentId,
    })
  ) {
    return userError(errorMessages[operation], UserErrorType.PermissionError);
  }
};

const getBpmnVersion = async (definitionId: string, versionId?: number) => {
  await loadModules();

  const process = await _getProcess(definitionId);

  if (versionId) {
    if (!process.versions.some((version: { version: number }) => version.version === versionId)) {
      return userError(
        `The requested version does not exist for the requested process.`,
        UserErrorType.NotFoundError,
      );
    }

    return await getProcessVersionBpmn(definitionId, versionId);
  } else {
    return await _getProcessBpmn(definitionId);
  }
};

export const getSharedProcessWithBpmn = async (definitionId: string, versionId?: number) => {
  await loadModules();

  const processMetaObj = await _getProcess(definitionId);

  if (!processMetaObj) {
    return userError(`Process does not exist `);
  }

  if (processMetaObj.shareTimestamp > 0 || processMetaObj.allowIframeTimestamp > 0) {
    const bpmn = await getBpmnVersion(definitionId, versionId);

    // check if getBpmnVersion returned an error that should be shown to the user instead of the bpmn
    if (typeof bpmn === 'object') {
      return bpmn;
    }

    const processWithBPMN = { ...processMetaObj, bpmn: bpmn };
    return processWithBPMN;
  }

  return userError(`Access Denied: Process is not shared`, UserErrorType.PermissionError);
};

export const getProcess = async (definitionId: string, spaceId: 'unauthenticated' | string) => {
  await loadModules();

  const result = await _getProcess(definitionId);

  // If the spaceId is authenticated, check validity
  if (spaceId !== 'unauthenticated') {
    const error = await checkValidity(definitionId, 'view', spaceId);
    if (error) return error; // Return error if validity check fails
    return result as Process; // Otherwise, return the process
  }

  // If the spaceId is unauthenticated, check if sharing is allowed
  if (
    spaceId === 'unauthenticated' &&
    result.sharedAs &&
    (result.shareTimestamp > 0 || result.allowIframeTimestamp > 0)
  ) {
    return result as Process;
  }
  return userError('Permission Error', UserErrorType.PermissionError);
};

export const getProcessBPMN = async (definitionId: string, spaceId: string, versionId?: number) => {
  await loadModules();

  const error = await checkValidity(definitionId, 'view', spaceId);

  if (error) return error;

  return await getBpmnVersion(definitionId, versionId);
};

export const deleteProcesses = async (definitionIds: string[], spaceId: string) => {
  await loadModules();

  for (const definitionId of definitionIds) {
    const error = await checkValidity(definitionId, 'delete', spaceId);

    if (error) return error;

    await removeProcess(definitionId);
  }
};

export const addProcesses = async (
  values: { name: string; description: string; bpmn?: string; folderId?: string }[],
  spaceId: string,
) => {
  await loadModules();

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
      creatorId: userId,
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

export const updateProcessShareInfo = async (
  definitionsId: string,
  sharedAs: 'public' | 'protected' | undefined,
  shareTimestamp: number | undefined,
  allowIframeTimestamp: number | undefined,
  spaceId: string,
) => {
  await loadModules();

  const error = await checkValidity(definitionsId, 'update', spaceId);

  if (error) return error;

  await updateProcessMetaData(definitionsId, {
    sharedAs: sharedAs,
    shareTimestamp: shareTimestamp,
    allowIframeTimestamp: allowIframeTimestamp,
  });
};

export const updateProcess = async (
  definitionsId: string,
  spaceId: string,
  bpmn?: string,
  description?: string,
  name?: string,
  invalidate = false,
) => {
  await loadModules();

  const error = await checkValidity(definitionsId, 'update', spaceId);

  if (error) return error;

  // Either replace or update the old BPMN.
  let newBpmn = bpmn ?? (await _getProcessBpmn(definitionsId));
  if (description !== undefined) {
    newBpmn = (await addDocumentation(newBpmn!, description)) as string;
  }
  if (name !== undefined) {
    newBpmn = (await setDefinitionsName(newBpmn!, name)) as string;
  }

  // This invalidates the client-side router cache. Since we don't call
  // router.refresh() in the modeler for every change, we need to invalidate the
  // cache here so that the old BPMN isn't reused within 30s. See:
  // https://nextjs.org/docs/app/building-your-application/caching#invalidation-1
  if (invalidate) {
    revalidatePath(`/processes/${definitionsId}`);
  }

  await _updateProcess(definitionsId, { bpmn: newBpmn });
};

export const updateProcesses = async (
  processes: {
    name?: string;
    description?: string;
    bpmn?: string;
    id: string;
  }[],
  spaceId: string,
) => {
  await loadModules();

  const res = await Promise.all(
    processes.map(async (process) => {
      return await updateProcess(
        process.id,
        spaceId,
        process.bpmn,
        process.description,
        process.name,
      );
    }),
  );

  const firstError = res.find((r) => r && 'error' in r);

  return firstError ?? res;
};

export const copyProcesses = async (
  processes: {
    name: string;
    description: string;
    originalId: string;
    originalVersion?: string;
    folderId?: string;
  }[],
  spaceId: string,
) => {
  await loadModules();

  const { ability, activeEnvironment } = await getCurrentEnvironment(spaceId);
  const { userId } = await getCurrentUser();
  const copiedProcesses: Process[] = [];

  for (const copyProcess of processes) {
    // Copy the original BPMN and update it for the new process.
    const newId = generateDefinitionsId();
    // Copy either a process or a specific version.
    const originalBpmn = copyProcess.originalVersion
      ? await getProcessVersionBpmn(copyProcess.originalId, +copyProcess.originalVersion)
      : await _getProcessBpmn(copyProcess.originalId);

    // TODO: Does createProcess() do the same as this function?
    const newBpmn = await getFinalBpmn({ ...copyProcess, id: newId, bpmn: originalBpmn! });

    // TODO: include variables in copy?
    const newProcess = {
      creatorId: userId,
      definitionId: newId,
      bpmn: newBpmn,
      environmentId: activeEnvironment.spaceId,
    };

    if (!ability.can('create', toCaslResource('Process', newProcess))) {
      return userError('Not allowed to create this process', UserErrorType.PermissionError);
    }
    const process = await _addProcess(newProcess);

    if (typeof process !== 'object') {
      return userError('A process with this id does already exist');
    }

    copiedProcesses.push({ ...process, bpmn: newBpmn });
  }

  return copiedProcesses;
};

export const createVersion = async (
  versionName: string,
  versionDescription: string,
  processId: string,
  spaceId: string,
) => {
  const error = await checkValidity(processId, 'update', spaceId);

  if (error) return error;

  const bpmn = await _getProcessBpmn(processId);
  if (!bpmn) {
    return null;
  }
  const bpmnObj = await toBpmnObject(bpmn);

  const { versionBasedOn } = await getDefinitionsVersionInformation(bpmnObj);

  // add process version to bpmn
  const epochTime = +new Date();
  await setDefinitionsVersionInformation(bpmnObj, {
    version: epochTime,
    versionName,
    versionDescription,
    versionBasedOn,
  });

  const process = (await _getProcess(processId)) as Process;

  await versionUserTasks(process, epochTime, bpmnObj);

  const versionedBpmn = await toBpmnXml(bpmnObj);

  // if the new version has no changes to the version it is based on don't create a new version and return the previous version
  const basedOnBPMN =
    versionBasedOn !== undefined ? await getLocalVersionBpmn(process, versionBasedOn) : undefined;

  if (basedOnBPMN && (await areVersionsEqual(versionedBpmn, basedOnBPMN))) {
    return versionBasedOn;
  }

  // send final process version bpmn to the backend
  addProcessVersion(processId, versionedBpmn);

  await updateProcessVersionBasedOn({ ...process, bpmn }, epochTime);

  return epochTime;
};

export const setVersionAsLatest = async (processId: string, version: number, spaceId: string) => {
  const error = await checkValidity(processId, 'update', spaceId);

  if (error) return error;

  await selectAsLatestVersion(processId, version);
};

export const getFavouritesProcessIds = async () => {
  const favs = await getUsersFavourites();

  return favs ?? [];
};

export const getProcessUserTaskData = async (
  definitionId: string,
  taskFileName: string,
  spaceId: string,
) => {
  const error = await checkValidity(definitionId, 'view', spaceId);

  if (error) return error;

  try {
    return await _getProcessUserTaskJSON(definitionId, taskFileName);
  } catch (err) {
    return userError('Unable to get the requested User Task data.', UserErrorType.NotFoundError);
  }
};

export const saveProcessUserTask = async (
  definitionId: string,
  taskFileName: string,
  json: string,
  spaceId: string,
) => {
  const error = await checkValidity(definitionId, 'update', spaceId);

  if (error) return error;

  if (/-\d+$/.test(taskFileName))
    return userError(
      'Illegal attempt to overwrite a user task version!',
      UserErrorType.ConstraintError,
    );

  await _saveProcessUserTask!(definitionId, taskFileName, json);
};

export const getProcessImage = async (
  definitionId: string,
  imageFileName: string,
  spaceId: string,
) => {
  const error = await checkValidity(definitionId, 'view', spaceId);

  if (error) return error;

  return _getProcessImage!(definitionId, imageFileName);
};
