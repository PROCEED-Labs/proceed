'use server';

import { getCurrentUser } from '@/components/auth';
import { toCaslResource } from '../ability/caslAbility';
// Workaround because top-level await is not supported in server action modules.
// The rest of the app can import from process.ts directly, where init is
// awaited. Since this will always run AFTER init was run and we cache with
// global, we can ignore init here.
import {
  removeProcess,
  getProcessMetaObjects,
  addProcess as _addProcess,
  getProcessBpmn as _getProcessBpmn,
  updateProcess as _updateProcess,
  getProcessVersionBpmn,
  addProcessVersion,
} from './legacy/_process';
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
import { ApiData } from '../fetch-data';
import {
  areVersionsEqual,
  getLocalVersionBpmn,
  selectAsLatestVersion,
  updateProcessVersionBasedOn,
  versionUserTasks,
} from '../helpers/processVersioning';
// Antd uses barrel files, which next optimizes away. That requires us to import
// antd components directly from their files in this server actions file.
import Button from 'antd/es/button';
import { Process } from './process-schema';
import { revalidatePath } from 'next/cache';

export const getProcessBPMN = async (definitionId: string) => {
  const { ability } = await getCurrentUser();

  const processMetaObjects: any = getProcessMetaObjects();
  const process = processMetaObjects[definitionId];

  if (!ability.can('view', toCaslResource('Process', process))) {
    return userError('Not allowed to read this process', UserErrorType.PermissionError);
  }

  if (!process) {
    return userError('A process with this id does not exist.', UserErrorType.NotFoundError);
  }

  const bpmn = await _getProcessBpmn(definitionId);

  return bpmn;
};

export const deleteProcesses = async (definitionIds: string[]) => {
  const processMetaObjects: any = getProcessMetaObjects();

  // Get ability again since it might have changed.
  const { ability } = await getCurrentUser();

  for (const definitionId of definitionIds) {
    const process = processMetaObjects[definitionId];

    if (!process) {
      return userError('A process with this id does not exist.', UserErrorType.NotFoundError);
    }

    if (!ability.can('delete', toCaslResource('Process', process))) {
      return userError('Not allowed to delete this process', UserErrorType.PermissionError);
    }

    await removeProcess(definitionId);
  }
};

export const addProcesses = async (
  values: { name: string; description: string; bpmn?: string }[],
) => {
  const { ability, session, activeEnvironment } = await getCurrentUser();

  const newProcesses: Process[] = [];

  for (const value of values) {
    const { bpmn } = await createProcess({
      name: value.name,
      description: value.description,
      bpmn: value.bpmn,
    });

    const newProcess = {
      bpmn,
      owner: session?.user.id || '',
      environmentId: activeEnvironment,
    };

    if (!ability.can('create', toCaslResource('Process', newProcess))) {
      return userError('Not allowed to create this process', UserErrorType.PermissionError);
    }

    // bpmn prop gets deleted in addProcess()
    const process = await _addProcess({ ...newProcess });

    if (typeof process !== 'object') {
      return userError('A process with this id does already exist');
    }

    newProcesses.push({ ...process, bpmn });
  }

  return newProcesses;
};

export const updateProcess = async (
  definitionsId: string,
  bpmn?: string,
  description?: string,
  name?: string,
  invalidate = false,
) => {
  const { ability } = await getCurrentUser();

  const processMetaObjects: any = getProcessMetaObjects();
  const process = processMetaObjects[definitionsId];

  if (!process) {
    return userError('A process with this id does not exist.', UserErrorType.NotFoundError);
  }

  if (!ability.can('update', toCaslResource('Process', process))) {
    return userError('Not allowed to update this process', UserErrorType.PermissionError);
  }

  // Either replace or update the old BPMN.
  let newBpmn = bpmn ?? (await _getProcessBpmn(definitionsId));
  if (description !== undefined) {
    newBpmn = (await addDocumentation(newBpmn, description)) as string;
  }
  if (name !== undefined) {
    newBpmn = (await setDefinitionsName(newBpmn, name)) as string;
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
) => {
  const res = await Promise.all(
    processes.map(async (process) => {
      return await updateProcess(process.id, process.bpmn, process.description, process.name);
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
  }[],
) => {
  const { ability, session, activeEnvironment } = await getCurrentUser();

  const copiedProcesses: Process[] = [];

  for (const copyProcess of processes) {
    // Copy the original BPMN and update it for the new process.
    const newId = generateDefinitionsId();
    // Copy either a process or a specific version.
    const originalBpmn = copyProcess.originalVersion
      ? await getProcessVersionBpmn(copyProcess.originalId, +copyProcess.originalVersion)
      : await _getProcessBpmn(copyProcess.originalId);

    // TODO: Does createProcess() do the same as this function?
    const newBpmn = await getFinalBpmn({ ...copyProcess, id: newId, bpmn: originalBpmn });

    // TODO: include variables in copy?
    const newProcess = {
      owner: session?.user.id || '',
      definitionId: newId,
      bpmn: newBpmn,
      environmentId: activeEnvironment,
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
) => {
  const { ability, session } = await getCurrentUser();

  const processMetaObjects: any = getProcessMetaObjects();
  const process = processMetaObjects[processId];

  if (!process) {
    return userError('A process with this id does not exist.', UserErrorType.NotFoundError);
  }

  if (!ability.can('update', toCaslResource('Process', process))) {
    return userError('Not allowed to update this process', UserErrorType.PermissionError);
  }

  const bpmn = await _getProcessBpmn(processId);
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

  await updateProcessVersionBasedOn(process, epochTime);

  return epochTime;
};

export const setVersionAsLatest = async (processId: string, version: number) => {
  const { ability } = await getCurrentUser();

  const processMetaObjects: any = getProcessMetaObjects();
  const process = processMetaObjects[processId];

  if (!process) {
    return userError('A process with this id does not exist.', UserErrorType.NotFoundError);
  }

  if (!ability.can('update', toCaslResource('Process', process))) {
    return userError('Not allowed to update this process', UserErrorType.PermissionError);
  }

  await selectAsLatestVersion(processId, version);
};
