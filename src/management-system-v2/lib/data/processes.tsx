'use server';

import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { toCaslResource } from '../ability/caslAbility';
import {
  addDocumentation,
  generateDefinitionsId,
  getDefinitionsVersionInformation,
  getUserTaskFileNameMapping,
  setDefinitionsName,
  setDefinitionsVersionInformation,
  setUserTaskData,
  toBpmnObject,
  toBpmnXml,
} from '@proceed/bpmn-helper';
import {
  createProcess,
  getFinalBpmn,
  updateScriptTaskFileName,
  updateUserTaskFileName,
} from '../helpers/processHelpers';
import { UserErrorType, userError } from '../user-error';
import {
  areVersionsEqual,
  getLocalVersionBpmn,
  selectAsLatestVersion,
  updateProcessVersionBasedOn,
  versionScriptTasks,
  versionUserTasks,
} from '../helpers/processVersioning';
// Antd uses barrel files, which next optimizes away. That requires us to import
// antd components directly from their files in this server actions file.
import { Process } from './process-schema';
import { revalidatePath } from 'next/cache';
import { getUsersFavourites } from './users';
import { enableUseDB, enableUseFileManager } from 'FeatureFlags';
import { TProcessModule } from './module-import-types-temp';
import { copyProcessArtifactReferences, copyProcessFiles } from './db/process';
import { v4 } from 'uuid';
import { toCustomUTCString } from '../helpers/timeHelper';

// Declare variables to hold the process module functions
let removeProcess: TProcessModule['removeProcess'];
let _addProcess: TProcessModule['addProcess'];
let _getProcess: TProcessModule['getProcess'];
let _updateProcess: TProcessModule['updateProcess'];
let getProcessVersionBpmn: TProcessModule['getProcessVersionBpmn'];
let addProcessVersion: TProcessModule['addProcessVersion'];

let updateProcessMetaData: TProcessModule['updateProcessMetaData'];

let _getProcessImage: TProcessModule['getProcessImage'];
let _getProcessBpmn: TProcessModule['getProcessBpmn'];
let _saveProcessUserTask: TProcessModule['saveProcessUserTask'];
let _getProcessUserTaskJSON: TProcessModule['getProcessUserTaskJSON'];
let _getProcessUserTaskHtml: TProcessModule['getProcessUserTaskHtml'];
let _saveProcessScriptTask: TProcessModule['saveProcessScriptTask'];
let _deleteProcessScriptTask: TProcessModule['deleteProcessScriptTask'];
let _getProcessScriptTaskScript: TProcessModule['getProcessScriptTaskScript'];

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
    saveProcessUserTask: _saveProcessUserTask,
    getProcessUserTaskJSON: _getProcessUserTaskJSON,
    getProcessImage: _getProcessImage,
    getProcessUserTaskHtml: _getProcessUserTaskHtml,
    saveProcessScriptTask: _saveProcessScriptTask,
    deleteProcessScriptTask: _deleteProcessScriptTask,
    getProcessScriptTaskScript: _getProcessScriptTaskScript,
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

const getBpmnVersion = async (definitionId: string, versionId?: string) => {
  await loadModules();

  const process = await _getProcess(definitionId);

  if (versionId) {
    const version = process.versions.find((version) => version.id === versionId);

    if (!version) {
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

export const getSharedProcessWithBpmn = async (definitionId: string, versionCreatedOn?: string) => {
  await loadModules();

  const processMetaObj = await _getProcess(definitionId);

  if (!processMetaObj) {
    return userError(`Process does not exist `);
  }

  if (processMetaObj.shareTimestamp > 0 || processMetaObj.allowIframeTimestamp > 0) {
    const bpmn = await getBpmnVersion(definitionId, versionCreatedOn);

    // check if getBpmnVersion returned an error that should be shown to the user instead of the bpmn
    if (typeof bpmn === 'object') {
      return bpmn;
    }

    const processWithBPMN = { ...processMetaObj, bpmn: bpmn };
    return processWithBPMN;
  }

  return userError(`Access Denied: Process is not shared`, UserErrorType.PermissionError);
};

export const getProcess = async (definitionId: string, spaceId: string) => {
  await loadModules();

  const error = await checkValidity(definitionId, 'view', spaceId);

  if (error) return error;
  const result = await _getProcess(definitionId);
  return result as Process;
};

export const getProcessBPMN = async (definitionId: string, spaceId: string, versionId?: string) => {
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
  destinationfolderId?: string,
  referencedProcessId?: string,
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
      ? await getProcessVersionBpmn(copyProcess.originalId, copyProcess.originalVersion)
      : await _getProcessBpmn(copyProcess.originalId);

    // TODO: Does createProcess() do the same as this function?
    let newBpmn = await getFinalBpmn({ ...copyProcess, id: newId, bpmn: originalBpmn! });

    // TODO: include variables in copy?
    const newProcess = {
      creatorId: userId,
      definitionId: newId,
      bpmn: newBpmn,
      environmentId: activeEnvironment.spaceId,
      folderId: destinationfolderId,
    };

    if (!ability.can('create', toCaslResource('Process', newProcess))) {
      return userError('Not allowed to create this process', UserErrorType.PermissionError);
    }
    const process = await _addProcess(newProcess, referencedProcessId);

    if (typeof process !== 'object') {
      return userError('A process with this id does already exist');
    }

    if (enableUseDB && enableUseFileManager) {
      await copyProcessArtifactReferences(copyProcess.originalId, newProcess.definitionId);

      const copiedFiles = await copyProcessFiles(copyProcess.originalId, newProcess.definitionId);
      if (copiedFiles) {
        // TODO: check if this works
        // TODO: possibly optimize this by parsing and serializing the bpmn once instead of on every invocation of the updateXTaskFileName functions
        for (const file of copiedFiles) {
          switch (file?.artifactType) {
            case 'user-tasks': {
              ({ bpmn: newBpmn } = await updateUserTaskFileName(
                newBpmn,
                file.mapping.oldFilename,
                file.mapping.newFilename,
              ));
            }
            case 'script-tasks': {
              ({ bpmn: newBpmn } = await updateScriptTaskFileName(
                newBpmn,
                file.mapping.oldFilename,
                file.mapping.newFilename,
              ));
            }
          }
        }

        await _updateProcess(newProcess.definitionId, { bpmn: newBpmn });
      }
    }
    copiedProcesses.push({ ...process, bpmn: newBpmn });
  }

  return copiedProcesses;
};

// TODO: fix: this function doesn't work yet
export const processHasChangesSinceLastVersion = async (processId: string, spaceId: string) => {
  const error = await checkValidity(processId, 'view', spaceId);
  if (error) return error;

  const process = await _getProcess(processId, true);
  if (!process) return userError('Process not found', UserErrorType.NotFoundError);

  const bpmnObj = await toBpmnObject(process.bpmn!);
  const { versionBasedOn, versionCreatedOn } = await getDefinitionsVersionInformation(bpmnObj);

  const versionedBpmn = await toBpmnXml(bpmnObj);

  // if the new version has no changes to the version it is based on don't create a new version and return the previous version
  const basedOnBPMN =
    versionBasedOn !== undefined
      ? await getLocalVersionBpmn(process as Process, versionBasedOn)
      : undefined;

  const versionsAreEqual = basedOnBPMN && (await areVersionsEqual(versionedBpmn, basedOnBPMN));
  return !versionsAreEqual;
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
  const versionCreatedOn = toCustomUTCString(new Date());
  // add process version to bpmn
  const versionId = `_${v4()}`;
  await setDefinitionsVersionInformation(bpmnObj, {
    versionId: versionId,
    versionName,
    versionDescription,
    versionBasedOn,
    versionCreatedOn,
  });

  const process = (await _getProcess(processId)) as Process;

  const versionedUserTaskFilenames = await versionUserTasks(process, versionId, bpmnObj);
  const versionedScriptTaskFilenames = await versionScriptTasks(process, versionId, bpmnObj);

  const versionedBpmn = await toBpmnXml(bpmnObj);

  // if the new version has no changes to the version it is based on don't create a new version and return the previous version
  const basedOnBPMN =
    versionBasedOn !== undefined ? await getLocalVersionBpmn(process, versionCreatedOn) : undefined;

  if (basedOnBPMN && (await areVersionsEqual(versionedBpmn, basedOnBPMN))) {
    return versionBasedOn;
  }

  // send final process version bpmn to the backend
  addProcessVersion(
    processId,
    versionedBpmn,
    versionedUserTaskFilenames,
    versionedScriptTaskFilenames,
  );

  await updateProcessVersionBasedOn({ ...process, bpmn }, versionId);

  return versionId;
};

export const setVersionAsLatest = async (processId: string, versionId: string, spaceId: string) => {
  const error = await checkValidity(processId, 'update', spaceId);

  if (error) return error;

  await selectAsLatestVersion(processId, versionId);
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

export const getProcessUserTaskHTML = async (
  definitionId: string,
  taskFileName: string,
  spaceId: string,
) => {
  const error = await checkValidity(definitionId, 'view', spaceId);

  if (error) return error;

  try {
    return await _getProcessUserTaskHtml(definitionId, taskFileName);
  } catch (err) {
    return userError('Unable to get the requested User Task html.', UserErrorType.NotFoundError);
  }
};

export const saveProcessUserTask = async (
  definitionId: string,
  taskFileName: string,
  json: string,
  html: string,
  spaceId: string,
) => {
  const error = await checkValidity(definitionId, 'update', spaceId);

  if (error) return error;

  if (/-\d+$/.test(taskFileName))
    return userError(
      'Illegal attempt to overwrite a user task version!',
      UserErrorType.ConstraintError,
    );
  await _saveProcessUserTask!(definitionId, taskFileName, json, html);
};

export const getProcessScriptTaskData = async (
  definitionId: string,
  taskFileName: string,
  fileExtension: 'js' | 'ts' | 'xml',
  spaceId: string,
) => {
  const error = await checkValidity(definitionId, 'view', spaceId);

  if (error) return error;

  try {
    return await _getProcessScriptTaskScript(definitionId, `${taskFileName}.${fileExtension}`);
  } catch (err) {
    return userError('Unable to get the requested Script Task data.', UserErrorType.NotFoundError);
  }
};

export const saveProcessScriptTask = async (
  definitionId: string,
  taskFileName: string,
  fileExtension: 'js' | 'ts' | 'xml',
  script: string,
  spaceId: string,
) => {
  const error = await checkValidity(definitionId, 'update', spaceId);

  if (error) return error;

  if (/-\d+$/.test(taskFileName))
    return userError(
      'Illegal attempt to overwrite a script task version!',
      UserErrorType.ConstraintError,
    );

  await _saveProcessScriptTask(definitionId, `${taskFileName}.${fileExtension}`, script);
};

export const deleteProcessScriptTask = async (
  definitionId: string,
  taskFileName: string,
  fileExtension: 'js' | 'ts' | 'xml',
  spaceId: string,
) => {
  const error = await checkValidity(definitionId, 'delete', spaceId);

  if (error) return error;

  await _deleteProcessScriptTask(definitionId, `${taskFileName}.${fileExtension}`);
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
