'use server';

import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { FolderUserInput, FolderUserInputSchema } from './folder-schema';
import {
  FolderChildren,
  createFolder as _createFolder,
  getFolderById,
  getRootFolder,
  moveFolder,
  getFolderChildren as _getFolderChildren,
} from './legacy/folders';
import { userError } from '../user-error';
import { toCaslResource } from '../ability/caslAbility';
import { getProcess, moveProcess } from './legacy/_process';
import { asyncMap } from '../helpers/javascriptHelpers';

export async function getFolder(folderId: string, spaceId: string) {
  try {
    const { ability } = await getCurrentEnvironment(spaceId);

    const folder = getFolderById(folderId, ability);
    if (!folder) throw new Error();

    return folder;
  } catch (e) {
    return userError('Something went wrong');
  }
}

export async function createFolder(folderInput: FolderUserInput) {
  try {
    const folder = FolderUserInputSchema.parse(folderInput);
    const { ability } = await getCurrentEnvironment(folder.environmentId);
    const { userId } = await getCurrentUser();

    if (!folder.parentId) folder.parentId = getRootFolder(folder.environmentId).id;

    _createFolder({ ...folder, createdBy: userId }, ability);
  } catch (e) {
    return userError("Couldn't create folder");
  }
}

export async function moveIntoFolder(items: FolderChildren[], folderId: string) {
  const folder = getFolderById(folderId);
  if (!folder) return userError('Folder not found');

  const { ability } = await getCurrentEnvironment(folder.environmentId);

  if (!ability.can('update', toCaslResource('Folder', folder)))
    return userError('Permission denied');

  for (const item of items) {
    if (['process', 'project', 'process-instance'].includes(item.type)) {
      moveProcess({
        processDefinitionsId: item.id,
        newFolderId: folderId,
        ability: ability,
      });
    } else if (item.type === 'folder') {
      moveFolder(item.id, folderId, ability);
    }
  }
}

export async function getFolderChildren(folderId: string, spaceId: string) {
  try {
    const { ability } = await getCurrentEnvironment(spaceId);

    const children = _getFolderChildren(folderId, ability);
    if (!children) throw new Error();

    const folderContents = await asyncMap(children, async (item) => {
      if (item.type === 'folder') {
        return {
          ...getFolderById(item.id),
          type: 'folder' as const,
        };
      } else {
        return await getProcess(item.id);
      }
    });

    return folderContents;
  } catch (e) {
    console.error(e);
    return userError('Something went wrong');
  }
}
