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
} from './legacy/_process';

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
