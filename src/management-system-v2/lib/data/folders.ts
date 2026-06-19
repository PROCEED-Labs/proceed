'use server';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { Folder, FolderUserInput, FolderUserInputSchema } from './folder-schema';
import {
  UserError,
  UserErrorType,
  internalError,
  isUserErrorResponse,
  permissionDenied,
  userError,
} from '../user-error';
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
  getFolderChildren,
} from '@/lib/data/db/folders';
import { Process, ProcessMetadata } from './process-schema';
import { asyncMap } from '../helpers/javascriptHelpers';
import { canDeleteProcess, deleteProcesses } from './processes';
import { truthyFilter } from '../typescript-utils';
import { ReactNode } from 'react';

export type FolderChildren = { id: string; type: 'folder' } | { id: string; type: Process['type'] };

export type RecursiveFolderItem = ProcessMetadata | (Folder & { type: 'folder' });

/** Recursively collects all processes and folders inside a given folder, including nested ones */
export async function getAllProcessesRecursive(
  spaceId: string,
  folderId: string,
  ability?: Ability,
  collected: RecursiveFolderItem[] = [],
): Promise<RecursiveFolderItem[]> {
  const contents = await getFolderContents(spaceId, folderId, ability);
  if (isUserErrorResponse(contents)) return collected;

  for (const item of contents) {
    if (item.type === 'process') {
      collected.push(item);
    } else if (item.type === 'folder') {
      collected.push(item);
      await getAllProcessesRecursive(spaceId, item.id, ability, collected);
    }
  }
  return collected;
}

export async function createFolder(folderInput: FolderUserInput) {
  try {
    const folder = FolderUserInputSchema.parse(folderInput);
    const { ability } = await getCurrentEnvironment(folder.environmentId);
    const { userId } = await getCurrentUser();

    if (!folder.parentId) folder.parentId = (await getRootFolder(folder.environmentId)).id;

    return await _createFolder({ ...folder, createdBy: userId }, ability);
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
      await moveProcess(item.id, folderId, ability);
    } else if (item.type === 'folder') {
      await moveFolder(item.id, folderId, ability);
    }
  }
}

export async function getFolder(environmentId: string, folderId?: string, ability?: Ability) {
  if (!ability) ({ ability } = await getCurrentEnvironment(environmentId));

  let folder;
  if (!folderId) folder = await getRootFolder(environmentId, ability);
  else folder = await getFolderById(folderId);

  if (folder && !ability.can('view', toCaslResource('Folder', folder)))
    return userError('Permission denied');

  if (!folder) return userError('Folder not found');

  return folder;
}

export async function getFolderContents(
  environmentId: string,
  folderId?: string,
  ability?: Ability,
) {
  if (!ability) ({ ability } = await getCurrentEnvironment(environmentId));

  if (!folderId) folderId = (await getRootFolder(environmentId)).id;

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

    await updateFolderMetaData(folderId, folderUpdate, ability);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);

    return userError("Couldn't create folder");
  }
}

type Removable = {
  id: string;
  type: 'folder' | string;
  name: string;
  error?: ReactNode;
  nestedResults?: Removable[];
};

export async function canDeleteFolder(spaceId: string, folderId: string): Promise<Removable> {
  const { ability } = await getCurrentEnvironment(spaceId);

  const evaluation: Removable = {
    id: folderId,
    type: 'folder',
    name: '',
  };

  const folder = await getFolder(spaceId, folderId);
  if (isUserErrorResponse(folder)) return { ...evaluation, error: folder.error.message };

  evaluation.name = folder.name;

  if (ability && !ability.can('delete', toCaslResource('Folder', folder))) {
    return { ...evaluation, error: 'Permissions denied' };
  }

  const children = await getFolderChildren(folderId, ability);
  evaluation.nestedResults = await asyncMap(children, async (child) => {
    if (child.type === 'folder') {
      return await canDeleteFolder(spaceId, child.id);
    } else {
      const canRemove = await canDeleteProcess(spaceId, child.id);

      return {
        id: child.id,
        type: child.type,
        name: child.name,
        error: isUserErrorResponse(canRemove) ? canRemove.error.message : undefined,
      };
    }
  });

  if (evaluation.nestedResults.some((r) => !!r.error)) {
    evaluation.error = 'Some nested elements cannot be removed';
  }

  return evaluation;
}

export async function deleteFolders(
  folderIds: string[],
  spaceId: string,
): Promise<{ success: true } | { failed: string[]; error: UserError }> {
  const { ability } = await getCurrentEnvironment(spaceId);

  const res = await asyncMap(folderIds, async (folderId) => {
    const folder = await getFolder(spaceId, folderId);
    if (isUserErrorResponse(folder)) return folder;

    try {
      const entries = await getFolderChildren(folderId, ability);
      const nestedFolders = entries.filter((entry) => entry.type === 'folder');
      const folderPromise = await deleteFolders(
        nestedFolders.map(({ id }) => id),
        spaceId,
      );

      const nestedProcesses = entries.filter((entry) => entry.type !== 'folder');
      const processPromise = await deleteProcesses(
        nestedProcesses.map(({ id }) => id),
        spaceId,
      );

      const result = await Promise.all([folderPromise, processPromise]);

      const nestedError = result.find(isUserErrorResponse);
      if (nestedError) return nestedError;

      const removeResult = await _deleteFolder(folderId, ability);
      if (isUserErrorResponse(removeResult)) return removeResult;
    } catch (_) {
      return internalError();
    }

    return { success: true };
  });

  if (res.some(isUserErrorResponse)) {
    return {
      failed: res
        .map((r, index) => isUserErrorResponse(r) && folderIds[index])
        .filter(truthyFilter),
      error: {
        message: 'Could not remove all of the requested folders.',
        type: UserErrorType.UnknownError,
      },
    };
  }

  return { success: true };
}
