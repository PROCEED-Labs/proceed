'use server';
import * as util from 'util';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { Folder, FolderUserInput, FolderUserInputSchema } from './folder-schema';
import { UserErrorType, userError } from '../user-error';
import { TreeMap, toCaslResource } from '../ability/caslAbility';

import Ability, { UnauthorizedError } from '../ability/abilityHelper';
import { FolderChildren } from './legacy/folders';
import { enableUseDB } from 'FeatureFlags';
import { TFoldersModule, TProcessModule } from './module-import-types-temp';
import { getFolders } from './DTOs';

let _createFolder: TFoldersModule['createFolder'],
  _getFolderContent: TFoldersModule['getFolderContents'],
  getFolderById: TFoldersModule['getFolderById'],
  getRootFolder: TFoldersModule['getRootFolder'],
  moveFolder: TFoldersModule['moveFolder'],
  updateFolderMetaData: TFoldersModule['updateFolderMetaData'],
  _deleteFolder: TFoldersModule['deleteFolder'],
  moveProcess: TProcessModule['moveProcess'];

const loadModules = async () => {
  const [folderModule, processModule] = await Promise.all([
    enableUseDB ? import('./db/folders') : import('./legacy/folders'),
    enableUseDB ? import('./db/process') : import('./legacy/_process'),
  ]);

  _createFolder = folderModule.createFolder;
  _getFolderContent = folderModule.getFolderContents;
  getFolderById = folderModule.getFolderById;
  getRootFolder = folderModule.getRootFolder;
  moveFolder = folderModule.moveFolder;
  updateFolderMetaData = folderModule.updateFolderMetaData;
  _deleteFolder = folderModule.deleteFolder;
  moveProcess = processModule.moveProcess;
};

loadModules().catch(console.error);

export async function createFolder(folderInput: FolderUserInput) {
  await loadModules();
  try {
    const folder = FolderUserInputSchema.parse(folderInput);
    const { ability } = await getCurrentEnvironment(folder.environmentId);
    const { userId } = await getCurrentUser();

    if (!folder.parentId) folder.parentId = (await getRootFolder(folder.environmentId)).id;

    _createFolder({ ...folder, createdBy: userId }, ability);
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
  await loadModules();

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

export async function getFolder(environmentId: string, folderId?: string) {
  await loadModules();
  const { ability } = await getCurrentEnvironment(environmentId);

  let folder;
  if (!folderId) folder = getRootFolder(environmentId, ability);
  else folder = await getFolderById(folderId);

  if (folder && !ability.can('view', toCaslResource('Folder', folder)))
    return userError('Permission denied');

  if (!folder) return userError('Folder not found');

  return folder;
}

export async function getFolderContents(environmentId: string, folderId?: string) {
  await loadModules();

  const { ability } = await getCurrentEnvironment(environmentId);

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
  await loadModules();

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
  await loadModules();

  try {
    const { ability } = await getCurrentEnvironment(spaceId);

    for (const folderId of folderIds) _deleteFolder(folderId, ability);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('Permission denied', UserErrorType.PermissionError);

    return userError("Couldn't create folder");
  }
}
