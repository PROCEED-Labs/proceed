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
  toExternalFormat,
  addProcess as _addProcess,
  getProcessBpmn,
  updateProcess as _updateProcess,
  getProcessVersionBpmn,
} from './legacy/_process';
import { addDocumentation, generateDefinitionsId, setDefinitionsName } from '@proceed/bpmn-helper';
import { createProcess, getFinalBpmn } from '../helpers/processHelpers';
import { UserErrorType, userError } from '../user-error';
import { ApiData } from '../fetch-data';

export const deleteProcesses = async (definitionIds: string[]) => {
  const processMetaObjects: any = getProcessMetaObjects();

  // Get ability again since it might have changed.
  const { ability } = await getCurrentUser();

  await Promise.all(
    definitionIds.map(async (definitionId) => {
      const process = processMetaObjects[definitionId];
      if (process && ability.can('delete', toCaslResource('Process', process))) {
        await removeProcess(definitionId);
      }
    }),
  );
};

export const addProcesses = async (
  values: { definitionName: string; description: string; bpmn?: string }[],
) => {
  const { ability, session } = await getCurrentUser();

  const newProcesses: ApiData<'/process/{definitionId}', 'get'>[] = [];

  for (const value of values) {
    const { bpmn } = await createProcess({
      name: value.definitionName,
      description: value.description,
      bpmn: value.bpmn,
    });

    const newProcess = {
      bpmn,
      owner: session?.user.id || '',
    };

    if (!ability.can('create', toCaslResource('Process', newProcess))) {
      return userError('Not allowed to create this process', UserErrorType.PermissionError);
    }
    // bpmn prop gets deleted in addProcess()
    const process = await _addProcess(newProcess);

    if (typeof process !== 'object') {
      return userError('A process with this id does already exist');
    }

    newProcesses.push(toExternalFormat({ ...process, bpmn }));
  }

  return newProcesses;
};

export const updateProcess = async (
  definitionsId: string,
  bpmn?: string,
  description?: string,
  name?: string,
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
  let newBpmn = bpmn ?? (await getProcessBpmn(definitionsId));
  if (description !== undefined) {
    newBpmn = (await addDocumentation(newBpmn, description)) as string;
  }
  if (name !== undefined) {
    newBpmn = (await setDefinitionsName(newBpmn, name)) as string;
  }

  const newProcessInfo = await _updateProcess(definitionsId, { bpmn: newBpmn });
  return toExternalFormat({ ...newProcessInfo, bpmn: newBpmn });
};

export const copyProcesses = async (
  processes: {
    definitionName: string;
    description: string;
    originalId: string;
    originalVersion?: string;
  }[],
) => {
  const { ability, session } = await getCurrentUser();

  const copiedProcesses: ApiData<'/process/{definitionId}', 'get'>[] = [];

  for (const cpyProcess of processes) {
    // Copy the original BPMN and update it for the new process.
    const newId = generateDefinitionsId();
    // Copy either a process or a specific version.
    const originalBpmn = cpyProcess.originalVersion
      ? await getProcessVersionBpmn(cpyProcess.originalId, cpyProcess.originalVersion)
      : await getProcessBpmn(cpyProcess.originalId);

    // TODO: Does createProcess() do the same as this function?
    const newBpmn = await getFinalBpmn({ ...cpyProcess, definitionId: newId, bpmn: originalBpmn });

    // TODO: include variables in copy?
    const newProcess = {
      owner: session?.user.id || '',
      definitionId: newId,
      bpmn: newBpmn,
    };

    if (!ability.can('create', toCaslResource('Process', newProcess))) {
      return userError('Not allowed to create this process', UserErrorType.PermissionError);
    }
    const process = await _addProcess(newProcess);

    if (typeof process !== 'object') {
      return userError('A process with this id does already exist');
    }

    copiedProcesses.push(toExternalFormat({ ...process, bpmn: newBpmn }));
  }

  return copiedProcesses;
};
