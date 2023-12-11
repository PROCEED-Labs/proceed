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
} from './legacy/_process';
import { addDocumentation, setDefinitionsName } from '@proceed/bpmn-helper';

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

export const addProcess = async (newProcess: any) => {
  const { ability, session } = await getCurrentUser();

  newProcess.owner = session?.user.id || '';

  if (!ability.can('create', toCaslResource('Process', newProcess))) {
    throw new Error('Not allowed to create this process');
  }
  // bpmn prop gets deleted in addProcess()
  const { bpmn } = newProcess;
  const process = await _addProcess(newProcess);

  if (typeof process !== 'object') {
    throw new Error('A process with this id does already exist');
  }

  return toExternalFormat({ ...process, bpmn });
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
    throw new Error('A process with this id does not exist.');
  }

  if (!ability.can('update', toCaslResource('Process', process))) {
    throw new Error('Forbidden.');
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
