import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import {
  Folder,
  FolderInput,
  FolderSchema,
  FolderUserInput,
  FolderUserInputSchema,
} from '../folder-schema';
import store from './store.js';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { v4 } from 'uuid';
import { Process, ProcessMetadata } from '../process-schema';
import { getProcess, removeProcess, init as initProcesses } from './_process';

// @ts-ignore
let firstInit = !global.foldersMetaObject;

export type FolderChildren = { id: string; type: 'folder' } | { id: string; type: Process['type'] };
export let foldersMetaObject: {
  folders: Partial<{
    [Id: string]: {
      folder: Folder;
      children: FolderChildren[];
    };
  }>;
  rootFolders: Partial<{ [environmentId: string]: string }>;
} =
  // @ts-ignore
  global.foldersMetaObject || (global.foldersMetaObject = { folders: {}, rootFolders: {} });

let inited = false;
/** initializes the folders meta information objects */
export function init() {
  if (!firstInit || inited) return;
  inited = true;

  foldersMetaObject.folders = {};
  foldersMetaObject.rootFolders = {};

  const storedFolders = store.get('folders') as Folder[];

  //first create all the folders
  for (const folder of storedFolders) {
    if (!folder.parentId) {
      if (foldersMetaObject.rootFolders[folder.environmentId])
        throw new Error(`Environment ${folder.environmentId} has multiple root folders`);

      foldersMetaObject.rootFolders[folder.environmentId] = folder.id;
    }

    foldersMetaObject.folders[folder.id] = { folder, children: [] };
  }

  //populate children
  //children fill their parent's children array
  for (const folder of storedFolders) {
    // skip roots
    if (!folder.parentId) continue;

    const parentData = foldersMetaObject.folders[folder.parentId];
    if (!parentData)
      throw new Error(`Inconsistency in folder structure: folder ${folder.id} has no parent`);

    parentData.children.push({ id: folder.id, type: 'folder' });
  }

  for (let process of store.get('processes') as ProcessMetadata[]) {
    if (!process.folderId) {
      console.warn(
        `Process ${process.id} has no parent folder, it was stored in it's environment's root folder`,
      );

      process = {
        ...process,
        folderId: foldersMetaObject.rootFolders[process.environmentId] as string,
      };

      store.update('processes', process.id, process);
    }

    const folderData = foldersMetaObject.folders[process.folderId];
    if (!folderData) throw new Error(`Process ${process.id}'s folder wasn't found`);

    folderData.children.push({ id: process.id, type: process.type });
  }
}
init();

export async function getRootFolder(environmentId: string, ability?: Ability) {
  const rootFolderId = foldersMetaObject.rootFolders[environmentId];
  if (!rootFolderId) throw new Error(`MS Error: environment ${environmentId} has no root folder`);

  const rootFolderData = foldersMetaObject.folders[rootFolderId];
  if (!rootFolderData) throw new Error('Root folder not found');

  if (ability && !ability.can('view', toCaslResource('Folder', rootFolderData.folder)))
    throw new UnauthorizedError();

  return rootFolderData.folder;
}

export async function getFolderById(folderId: string, ability?: Ability) {
  const folderData = foldersMetaObject.folders[folderId];
  if (!folderData) throw new Error('Folder not found');

  if (ability && !ability.can('view', toCaslResource('Folder', folderData.folder)))
    throw new UnauthorizedError();

  return folderData.folder as Folder;
}

export function getFolders(environmentId?: string, ability?: Ability) {
  const _folders = environmentId
    ? Object.values(foldersMetaObject.folders).filter(
        (folder) => folder?.folder.environmentId === environmentId,
      )
    : Object.values(foldersMetaObject.folders);

  const folders = _folders.map((f) => f!.folder);

  if (ability)
    return folders.filter((folder) => ability.can('view', toCaslResource('Folder', folder)));

  return folders;
}

export async function getFolderChildren(folderId: string, ability?: Ability) {
  const folderData = foldersMetaObject.folders[folderId];
  if (!folderData) throw new Error('Folder not found');

  if (ability && !ability.can('view', toCaslResource('Folder', folderData.folder)))
    throw new UnauthorizedError();

  return folderData.children;
}

export async function getFolderContents(folderId: string, ability?: Ability) {
  const folderChildren = await getFolderChildren(folderId, ability);
  const folderContent: ((Folder & { type: 'folder' }) | ProcessMetadata)[] = [];

  await initProcesses();

  for (let i = 0; i < folderChildren.length; i++) {
    try {
      const child = folderChildren[i];

      if (child.type !== 'folder') {
        const process = (await getProcess(child.id)) as Process;
        // NOTE: this check should probably done inside inside getprocess
        if (ability && !ability.can('view', toCaslResource('Process', process))) continue;
        folderContent.push(process);
      } else {
        folderContent.push({ ...(await getFolderById(child.id, ability)), type: 'folder' });
      }
    } catch (e) {}
  }

  return folderContent;
}

export async function createFolder(folderInput: FolderInput, ability?: Ability) {
  const folder = FolderSchema.parse(folderInput);
  if (!folder.id) folder.id = v4();

  // Checks
  if (ability && !ability.can('create', toCaslResource('Folder', folder)))
    throw new UnauthorizedError();

  if (foldersMetaObject.folders[folder.id]) throw new Error('Folder already exists');

  const parentFolderData = folder.parentId && foldersMetaObject.folders[folder.parentId];
  if (folder.parentId) {
    if (!parentFolderData) throw new Error('Parent folder does not exist');

    if (parentFolderData.folder.environmentId !== folder.environmentId)
      throw new Error('Parent folder is in a different environment');

    parentFolderData.folder.lastEditedOn = new Date();
    store.update('folders', parentFolderData.folder.id, parentFolderData.folder);
  } else {
    if (foldersMetaObject.rootFolders[folder.environmentId])
      throw new Error(`Environment ${folder.environmentId} already has a root folder`);
  }

  // Store
  const newFolder = {
    ...folder,
    createdOn: new Date(),
    lastEditedOn: new Date(),
  } as Folder;

  foldersMetaObject.folders[folder.id] = { folder: newFolder, children: [] };

  if (parentFolderData) parentFolderData.children.push({ id: newFolder.id, type: 'folder' });
  else foldersMetaObject.rootFolders[newFolder.environmentId] = newFolder.id;

  store.add('folders', newFolder);

  return newFolder;
}

/** Deletes a folder and every child recursively */
export async function deleteFolder(folderId: string, ability?: Ability) {
  // NOTE: maybe the ability should do this recursive check
  const folderData = foldersMetaObject.folders[folderId];
  if (!folderData) throw new Error('Folder not found');

  if (folderData.folder.parentId) {
    const parent = foldersMetaObject.folders[folderData.folder.parentId];
    if (!parent) throw new Error('Parent not found');

    const folderIndex = parent.children.findIndex((f) => f.id === folderId);
    if (folderIndex === -1) throw new Error("Folder not found in parent's children");

    parent.children.splice(folderIndex, 1);

    parent.folder.lastEditedOn = new Date();
    store.update('folders', parent.folder.id, parent.folder);
  }

  _deleteFolder(folderData, ability);
}

/** internal function to delete folders from bottom to top */
function _deleteFolder(
  folderData: NonNullable<(typeof foldersMetaObject)['folders'][string]>,
  ability?: Ability,
) {
  if (ability && !ability.can('delete', toCaslResource('Folder', folderData.folder)))
    throw new UnauthorizedError();

  for (const child of folderData.children) {
    if ('type' in child && child.type === 'process') {
      removeProcess(child.id);
      continue;
    }

    const childData = foldersMetaObject.folders[child.id];
    if (!childData) throw new Error('Inconsistency in folder structure: child folder not found');

    _deleteFolder(childData, ability);
  }
  delete foldersMetaObject.folders[folderData.folder.id];
  if (!folderData.folder.parentId)
    delete foldersMetaObject.rootFolders[folderData.folder.environmentId];

  store.remove('folders', folderData.folder.id);
}

export async function updateFolderMetaData(
  folderId: string,
  newMetaDataInput: Partial<Omit<FolderInput, 'parentId'>>,
  ability?: Ability,
) {
  const folderData = foldersMetaObject.folders[folderId];
  if (!folderData) throw new Error('Folder not found');

  if (ability && !ability.can('update', toCaslResource('Folder', folderData.folder)))
    throw new UnauthorizedError();

  const newMetaData = FolderSchema.omit({
    parentId: true,
    id: true,
    // if there is an ability, we interpret this as a user updating the folder
    environmentId: ability ? true : undefined,
    createdBy: ability ? true : undefined,
  })
    .partial()
    .parse(newMetaDataInput);

  const newFolder: Folder = {
    ...folderData.folder,
    ...newMetaData,
    lastEditedOn: new Date(),
  };

  folderData.folder = newFolder;
  store.update('folders', folderId, newFolder);
}

async function isInSubtree(rootId: string, nodeId: string) {
  const folderData = foldersMetaObject.folders[rootId];
  if (!folderData) throw new Error('RootId not found');

  if (!foldersMetaObject.folders[nodeId]) throw new Error('NodeId not found');

  if (rootId === nodeId) return true;

  for (const child of folderData.children) {
    if (child.type === 'folder') if (await isInSubtree(child.id, nodeId)) return true;
  }

  return false;
}

export async function moveFolder(folderId: string, newParentId: string, ability?: Ability) {
  const folderData = foldersMetaObject.folders[folderId];
  if (!folderData) throw new Error('Folder not found');

  // Checks
  if (!folderData.folder.parentId) throw new Error('Root folders cannot be moved');
  if (folderData.folder.parentId === newParentId) return;

  const newParentData = foldersMetaObject.folders[newParentId];
  if (!newParentData) throw new Error('New parent folder not found');

  // only perform this check when an ability is present (it means that a user is moving the folder)
  if (ability && newParentData.folder.environmentId !== folderData.folder.environmentId)
    throw new Error('Cannot move folder to a different environment');

  const oldParentData = foldersMetaObject.folders[folderData.folder.parentId];
  if (!oldParentData)
    throw new Error(`Consistency error: current parent folder of ${folderId} not found`);

  const folderIndex = oldParentData.children.findIndex(
    (f) => f.type === 'folder' && f.id === folderId,
  );
  if (folderIndex === -1)
    throw new Error("Consistency error: folder not found in parent's children");

  if (
    ability &&
    !ability.can('update', toCaslResource('Folder', folderData.folder)) &&
    !ability.can('update', toCaslResource('Folder', newParentData.folder)) &&
    !ability.can('update', toCaslResource('Folder', oldParentData.folder))
  )
    throw new Error('Permission denied');

  // Folder cannot be movet to it's sub tree
  if (await isInSubtree(folderId, newParentId))
    throw new Error('Folder cannot be moved to its children');

  // Store
  oldParentData.children.splice(folderIndex, 1);
  oldParentData.folder.lastEditedOn = new Date();
  store.update('folders', oldParentData.folder.id, oldParentData.folder);

  folderData.folder.parentId = newParentId;
  folderData.folder.environmentId = newParentData.folder.environmentId;
  newParentData.children.push({ type: 'folder', id: folderData.folder.id });
  newParentData.folder.lastEditedOn = new Date();
  store.update('folders', newParentData.folder.id, newParentData.folder);

  store.update('folders', folderId, folderData.folder);
}
