'use server';

import { userError } from '../user-error';
import { deployProcess as _deployProcess } from './deployment';
import { getEngines } from './machines';

export async function deployProcess(
  definitionId: string,
  version: number,
  spaceId: string,
  method: 'static' | 'dynamic' = 'dynamic',
) {
  try {
    // TODO: manage permissions
    // TODO: get machines allowed for user

    const engines = await getEngines();

    await _deployProcess(definitionId, version, spaceId, method, engines);
  } catch (e) {
    console.error(e);
    return userError('Something went wrong');
  }
}
