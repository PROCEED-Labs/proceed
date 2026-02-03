'use server';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { FolderUserInput, FolderUserInputSchema } from './folder-schema';
import { UserErrorType, getErrorMessage, userError } from '../server-error-handling/user-error';
import { toCaslResource } from '../ability/caslAbility';

import Ability, { UnauthorizedError } from '../ability/abilityHelper';

import {
  getFolders,
  createFolder as _createFolder,
  getFolderContents as _getFolderContent,
  getFolderById,
  getRootFolder,
  moveFolder,
  updateFolderMetaData,
  deleteFolder as _deleteFolder,
  moveProcess,
} from '@/lib/data/db/folders';
import { Process } from './process-schema';

export type FolderChildren = { id: string; type: 'folder' } | { id: string; type: Process['type'] };

export async function createFolder(folderInput: FolderUserInput) {
  try {
    const folder = FolderUserInputSchema.parse(folderInput);

    const currentEnvironment = await getCurrentEnvironment(folder.environmentId);
    if (currentEnvironment.isErr()) return userError(getErrorMessage(currentEnvironment.error));
    const { ability } = currentEnvironment.value;

    const currentUser = await getCurrentUser();
    if (currentUser.isErr()) return userError(getErrorMessage(currentUser.error));
    const { userId } = currentUser.value;

    if (!folder.parentId) {
      const rootFolder = await getRootFolder(folder.environmentId);
      if (rootFolder.isErr()) {
        return userError(getErrorMessage(rootFolder.error));
      }

      folder.parentId = rootFolder.value.id;
    }

    const result = await _createFolder({ ...folder, createdBy: userId }, ability);
    if (result.isErr()) {
      return userError(getErrorMessage(result.error));
    }
  } catch (e) {
    return userError("Couldn't create folder");
  }
}
export type FolderTreeNode = {
  id: string;
  name: string;
  children: FolderTreeNode[];
};

export async function getSpaceFolderTree(spaceId: string, ability?: Ability) {
  //TODO: ability check

  const folders = await getFolders(spaceId);
  if (folders.isErr()) {
    return userError(getErrorMessage(folders.error));
  }

  const folderMap: Record<string, FolderTreeNode> = {};

  // Initialize the folder map with empty children arrays and only id and name
  for (const folder of folders.value) {
    folderMap[folder.id] = { id: folder.id, name: folder.name, children: [] };
  }

  const rootFolders: FolderTreeNode[] = [];

  for (const folder of folders.value) {
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

  return rootFolders as FolderTreeNode[];
}

export async function moveIntoFolder(items: FolderChildren[], folderId: string) {
  const folder = await getFolderById(folderId);
  if (folder.isErr()) {
    return userError(getErrorMessage(folder.error));
  }
  if (!folder) return userError('Folder not found');

  const currentEnvironment = await getCurrentEnvironment(folder.value.environmentId);
  if (currentEnvironment.isErr()) {
    return userError(getErrorMessage(currentEnvironment.error));
  }
  const { ability } = currentEnvironment.value;

  if (!ability.can('update', toCaslResource('Folder', folder.value)))
    return userError('Permission denied');

  for (const item of items) {
    if (['process', 'project', 'process-instance'].includes(item.type)) {
      await moveProcess(item.id, folderId, ability);
    } else if (item.type === 'folder') {
      await moveFolder(item.id, folderId, ability);
    }
  }
}

export async function getFolder(environmentId: string, folderId?: string) {
  const currentEnvironment = await getCurrentEnvironment(environmentId);
  if (currentEnvironment.isErr()) {
    return userError(getErrorMessage(currentEnvironment.error));
  }
  const { ability } = currentEnvironment.value;

  let folder;
  if (!folderId) folder = await getRootFolder(environmentId, ability);
  else folder = await getFolderById(folderId);

  if (folder.isErr()) {
    return userError(getErrorMessage(folder.error));
  }

  if (folder.value && !ability.can('view', toCaslResource('Folder', folder.value)))
    return userError('Permission denied');

  if (!folder.value) return userError('Folder not found');

  return folder.value;
}

export async function getFolderContents(environmentId: string, folderId?: string) {
  const currentEnvironment = await getCurrentEnvironment(environmentId);
  if (currentEnvironment.isErr()) {
    return userError(getErrorMessage(currentEnvironment.error));
  }
  const { ability } = currentEnvironment.value;

  const rootFolder = await getRootFolder(environmentId);
  if (rootFolder.isErr()) {
    return userError(getErrorMessage(rootFolder.error));
  }

  if (!folderId) folderId = rootFolder.value.id;

  try {
    const result = await _getFolderContent(folderId, ability);
    if (result.isErr()) {
      return userError(getErrorMessage(result.error));
    } else {
      return result.value;
    }
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
    if (folder.isErr()) {
      return userError(getErrorMessage(folder.error));
    }
    if (!folder.value) return userError('Folder not found');

    const currentEnvironment = await getCurrentEnvironment(folder.value.environmentId);
    if (currentEnvironment.isErr()) {
      return userError(getErrorMessage(currentEnvironment.error));
    }
    const { ability } = currentEnvironment.value;

    const folderUpdate = FolderUserInputSchema.partial().parse(folderInput);
    if (folderUpdate.parentId) return userError('Wrong method for moving folders');

    const res = await updateFolderMetaData(folderId, folderUpdate, ability);
    if (res.isErr()) return userError(getErrorMessage(res.error));
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);

    return userError("Couldn't create folder");
  }
}

export async function deleteFolder(folderIds: string[], spaceId: string) {
  try {
    const currentEnvironment = await getCurrentEnvironment(spaceId);
    if (currentEnvironment.isErr()) {
      return userError(getErrorMessage(currentEnvironment.error));
    }
    const { ability } = currentEnvironment.value;

    for (const folderId of folderIds) await _deleteFolder(folderId, ability);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);

    return userError("Couldn't create folder");
  }
}
