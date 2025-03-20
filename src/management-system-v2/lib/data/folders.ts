'use server';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { FolderUserInput, FolderUserInputSchema } from './folder-schema';
import { UserErrorType, userError } from '../user-error';
import { toCaslResource } from '../ability/caslAbility';

import Ability, { UnauthorizedError } from '../ability/abilityHelper';
import { FolderChildren } from './legacy/folders';
import { getFolders } from './DTOs';
import {
  getRootFolder,
  moveFolder,
  createFolder as _createFolder,
  getFolderById,
  getFolderContents as _getFolderContent,
  updateFolderMetaData,
  deleteFolder as _deleteFolder,
} from './db/folders';
import { moveProcess } from './db/process';

export async function createFolder(
  folderInput: FolderUserInput & { type: 'process' | 'template' },
) {
  try {
    const folder = FolderUserInputSchema.parse(folderInput);
    const { ability } = await getCurrentEnvironment(folder.environmentId);
    const { userId } = await getCurrentUser();

    if (!folder.parentId)
      folder.parentId = (await getRootFolder(folder.environmentId, folderInput.type)).id;

    _createFolder({ ...folder, type: folderInput.type, createdBy: userId }, ability);
  } catch (e) {
    return userError("Couldn't create folder");
  }
}
export type FolderTreeNode = {
  id: string;
  name: string;
  children: FolderTreeNode[];
};

export async function getSpaceFolderTree(
  spaceId: string,
  ability?: Ability,
): Promise<FolderTreeNode[]> {
  //TODO: ability check

  const folders = await getFolders(spaceId);

  const folderMap: Record<string, FolderTreeNode> = {};

  // Initialize the folder map with empty children arrays and only id and name
  for (const folder of folders) {
    folderMap[folder.id] = { id: folder.id, name: folder.name, children: [] };
  }

  const rootFolders: FolderTreeNode[] = [];

  for (const folder of folders) {
    if (folder.parentId) {
      const parent = folderMap[folder.parentId];
      if (parent) {
        parent.children.push(folderMap[folder.id]);
      }
    } else {
      // Folders with no parentId are root folders
      rootFolders.push(folderMap[folder.id]);
    }
  }

  return rootFolders;
}

export async function moveIntoFolder(items: FolderChildren[], folderId: string) {
  const folder = await getFolderById(folderId);
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

export async function getFolder(
  environmentId: string,
  folderId?: string,
  type?: 'process' | 'template',
) {
  const { ability } = await getCurrentEnvironment(environmentId);

  let folder;
  if (!folderId) folder = await getRootFolder(environmentId, type!, ability);
  else folder = await getFolderById(folderId);

  if (folder && !ability.can('view', toCaslResource('Folder', folder)))
    return userError('Permission denied');

  if (!folder) return userError('Folder not found');

  return folder;
}

export async function getFolderContents(
  environmentId: string,
  folderId?: string,
  type?: 'process' | 'template',
) {
  const { ability } = await getCurrentEnvironment(environmentId);

  if (!folderId) folderId = (await getRootFolder(environmentId, type!)).id;

  try {
    return _getFolderContent(folderId, ability);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);

    return userError('Something went wrong');
  }
}

/** This is only for updating a folder's metadata, to move a folder use moveIntoFolder */
export async function updateFolder(
  folderInput: Omit<Partial<FolderUserInput>, 'environmentId' | 'parentId'>,
  folderId: string,
) {
  try {
    const folder = await getFolderById(folderId);
    if (!folder) return userError('Folder not found');

    const { ability } = await getCurrentEnvironment(folder.environmentId);

    const folderUpdate = FolderUserInputSchema.partial().parse(folderInput);
    if (folderUpdate.parentId) return userError('Wrong method for moving folders');

    updateFolderMetaData(folderId, folderUpdate, ability);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);

    return userError("Couldn't create folder");
  }
}

export async function deleteFolder(folderIds: string[], spaceId: string) {
  try {
    const { ability } = await getCurrentEnvironment(spaceId);

    for (const folderId of folderIds) _deleteFolder(folderId, ability);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);

    return userError("Couldn't create folder");
  }
}
