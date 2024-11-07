'use server';

import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { FolderUserInput, FolderUserInputSchema } from './folder-schema';
import { UserErrorType, userError } from '../user-error';
import { toCaslResource } from '../ability/caslAbility';

import { UnauthorizedError } from '../ability/abilityHelper';
import { FolderChildren } from './legacy/folders';
import { enableUseDB } from 'FeatureFlags';
import { TFoldersModule, TProcessModule } from './module-import-types-temp';

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

    return _createFolder({ ...folder, createdBy: userId }, ability);
  } catch (e) {
    return userError("Couldn't create folder");
  }
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

export async function getFolder(folderId: string) {
  await loadModules();

  const folder = await getFolderById(folderId);
  if (!folder) return userError('Folder not found');

  const { ability } = await getCurrentEnvironment(folder.environmentId);

  if (!ability.can('view', toCaslResource('Folder', folder))) return userError('Permission denied');

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
