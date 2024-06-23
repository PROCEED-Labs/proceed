import Ability from '@/lib/ability/abilityHelper.js';
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
import db from '@/lib/data';

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

/** initializes the folders meta information objects */
export function init() {
  if (!firstInit) return;

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
import { removeProcess } from './_process';
import { enableUseDB } from 'FeatureFlags';

export async function getRootFolder(environmentId: string, ability?: Ability) {
  if (enableUseDB) {
    const rootFolder = await db.folder.findFirst({
      where: {
        environmentId: environmentId,
        parentId: null,
      },
    });

    if (!rootFolder) {
      throw new Error(`MS Error: environment ${environmentId} has no root folder`);
    }

    if (ability && !ability.can('view', toCaslResource('Folder', rootFolder))) {
      throw new Error('Permission denied');
    }

    return rootFolder;
  }
  const rootFolderId = foldersMetaObject.rootFolders[environmentId];
  if (!rootFolderId) throw new Error(`MS Error: environment ${environmentId} has no root folder`);

  const rootFolderData = foldersMetaObject.folders[rootFolderId];
  if (!rootFolderData) throw new Error('Root folder not found');

  if (ability && !ability.can('view', toCaslResource('Folder', rootFolderData.folder)))
    throw new Error('Permission denied');

  return rootFolderData.folder;
}

export async function getFolderById(folderId: string, ability?: Ability) {
  if (enableUseDB) {
    const folder = await db.folder.findUnique({
      where: {
        id: folderId,
      },
      include: {
        childrenFolder: true,
      },
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    if (ability && !ability.can('view', toCaslResource('Folder', folder))) {
      throw new Error('Permission denied');
    }

    return folder;
  }
  const folderData = foldersMetaObject.folders[folderId];
  if (!folderData) throw new Error('Folder not found');

  if (ability && !ability.can('view', toCaslResource('Folder', folderData.folder)))
    throw new Error('Permission denied');

  return folderData.folder;
}

export async function getFolderChildren(folderId: string, ability?: Ability) {
  if (enableUseDB) {
    const folder = await db.folder.findUnique({
      where: {
        id: folderId,
      },
      include: {
        childrenFolder: true,
        processes: true,
      },
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    if (ability && !ability.can('view', toCaslResource('Folder', folder))) {
      throw new Error('Permission denied');
    }

    const combinedResults = [...folder.childrenFolder, ...folder.processes];

    return combinedResults;
  }
  const folderData = foldersMetaObject.folders[folderId];
  if (!folderData) throw new Error('Folder not found');

  if (ability && !ability.can('view', toCaslResource('Folder', folderData.folder)))
    throw new Error('Permission denied');

  return folderData.children;
}

export async function createFolder(folderInput: FolderInput, ability?: Ability) {
  if (enableUseDB) {
    const folder = FolderSchema.parse(folderInput);
    if (!folder.id) folder.id = v4();

    // Checks
    if (ability && !ability.can('create', toCaslResource('Folder', folder)))
      throw new Error('Permission denied');

    const existingFolder = await db.folder.findUnique({
      where: {
        id: folder.id,
      },
    });
    if (existingFolder) {
      throw new Error('Folder already exists');
    }

    if (folder.parentId) {
      const parentFolder = await db.folder.findUnique({
        where: {
          id: folder.parentId,
        },
      });

      if (!parentFolder) {
        throw new Error('Parent folder does not exist');
      }

      if (parentFolder.environmentId !== folder.environmentId) {
        throw new Error('Parent folder is in a different environment');
      }
      await db.folder.update({
        where: {
          id: folder.parentId,
        },
        data: {
          lastEditedOn: new Date().toISOString(),
        },
      });
    } else {
      const rootFolder = await db.folder.findFirst({
        where: {
          environmentId: folder.environmentId,
          parentId: null,
        },
      });

      if (rootFolder) {
        throw new Error(`Environment ${folder.environmentId} already has a root folder`);
      }
    }

    const createdFolder = await db.folder.create({
      data: {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        createdBy: folder.createdBy!,
        environmentId: folder.environmentId,
        lastEditedOn: new Date().toISOString(),
        createdOn: new Date().toISOString(),
      },
    });

    return createdFolder;
  }
  const folder = FolderSchema.parse(folderInput);
  if (!folder.id) folder.id = v4();

  // Checks
  if (ability && !ability.can('create', toCaslResource('Folder', folder)))
    throw new Error('Permission denied');

  if (foldersMetaObject.folders[folder.id]) throw new Error('Folder already exists');

  const parentFolderData = folder.parentId && foldersMetaObject.folders[folder.parentId];
  if (folder.parentId) {
    if (!parentFolderData) throw new Error('Parent folder does not exist');

    if (parentFolderData.folder.environmentId !== folder.environmentId)
      throw new Error('Parent folder is in a different environment');

    parentFolderData.folder.lastEdited = new Date().toISOString();
    store.update('folders', parentFolderData.folder.id, parentFolderData.folder);
  } else {
    if (foldersMetaObject.rootFolders[folder.environmentId])
      throw new Error(`Environment ${folder.environmentId} already has a root folder`);
  }

  // Store
  const newFolder = {
    ...folder,
    createdOn: new Date().toISOString(),
    lastEdited: new Date().toISOString(),
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
  if (enableUseDB) {
    const folderToDelete = await db.folder.findUnique({
      where: { id: folderId },
    });

    if (!folderToDelete) {
      throw new Error('Folder not found');
    }

    if (ability && !ability.can('delete', toCaslResource('Folder', folderToDelete))) {
      throw new Error('Permission denied');
    }

    await db.folder.delete({
      where: { id: folderId },
    });

    return { success: true };
  }
  const folderData = foldersMetaObject.folders[folderId];
  if (!folderData) throw new Error('Folder not found');

  if (folderData.folder.parentId) {
    const parent = foldersMetaObject.folders[folderData.folder.parentId];
    if (!parent) throw new Error('Parent not found');

    const folderIndex = parent.children.findIndex((f) => f.id === folderId);
    if (folderIndex === -1) throw new Error("Folder not found in parent's children");

    parent.children.splice(folderIndex, 1);

    parent.folder.lastEdited = new Date().toISOString();
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
    throw new Error('Permission denied');

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
  newMetaDataInput: Partial<FolderUserInput>,
  ability?: Ability,
) {
  if (enableUseDB) {
    const folder = await db.folder.findUnique({
      where: { id: folderId },
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    if (ability && !ability.can('update', toCaslResource('Folder', folder))) {
      throw new Error('Permission denied');
    }

    if (newMetaDataInput.environmentId && newMetaDataInput.environmentId !== folder.environmentId) {
      throw new Error('environmentId cannot be changed');
    }

    const updatedFolder = await db.folder.update({
      where: { id: folderId },
      data: { ...newMetaDataInput, lastEditedOn: new Date().toISOString() },
    });

    return updatedFolder;
  }
  const folderData = foldersMetaObject.folders[folderId];
  if (!folderData) throw new Error('Folder not found');

  if (ability && !ability.can('update', toCaslResource('Folder', folderData.folder)))
    throw new Error('Permission denied');

  const newMetaData = FolderUserInputSchema.partial().parse(newMetaDataInput);
  if (
    newMetaDataInput.environmentId &&
    newMetaDataInput.environmentId != folderData.folder.environmentId
  )
    throw new Error('environmentId cannot be changed');

  const newFolder: Folder = {
    ...folderData.folder,
    ...newMetaData,
    lastEdited: new Date().toISOString(),
  };

  folderData.folder = newFolder;
  store.update('folders', folderId, newFolder);
}

async function isInSubtree(rootId: string, nodeId: string) {
  if (enableUseDB) {
    const folderData = await db.folder.findUnique({
      where: { id: rootId },
      include: { childrenFolder: true },
    });

    if (!folderData) {
      throw new Error('RootId not found');
    }

    const nodeFolder = await db.folder.findUnique({
      where: { id: nodeId },
    });

    if (!nodeFolder) {
      throw new Error('NodeId not found');
    }

    if (rootId === nodeId) {
      return true;
    }
    for (const child of folderData.childrenFolder) {
      if (await isInSubtree(child.id, nodeId)) return true;
    }
    return false;
  }
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
  if (enableUseDB) {
    const folder = await db.folder.findUnique({
      where: { id: folderId },
      include: { childrenFolder: true, parentFolder: true },
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    if (!folder.parentId) {
      throw new Error('Root folders cannot be moved');
    }

    if (folder.parentId === newParentId) {
      return;
    }

    const newParentFolder = await db.folder.findUnique({
      where: { id: newParentId },
    });

    if (!newParentFolder) {
      throw new Error('New parent folder not found');
    }

    if (newParentFolder.environmentId !== folder.environmentId) {
      throw new Error('Cannot move folder to a different environment');
    }

    // Check permissions
    if (
      ability &&
      !(
        ability.can('update', toCaslResource('Folder', folder)) &&
        ability.can('update', toCaslResource('Folder', newParentFolder)) &&
        ability.can('update', toCaslResource('Folder', folder.parentFolder!))
      )
    ) {
      throw new Error('Permission denied');
    }

    // Check if moving to its own subtree
    if (await isInSubtree(folderId, newParentId)) {
      throw new Error('Folder cannot be moved to its children');
    }

    // Update old parent
    await db.folder.update({
      where: { id: folder.parentId },
      data: {
        childrenFolder: {
          disconnect: [{ id: folderId }],
        },
        lastEditedOn: new Date().toISOString(),
      },
    });

    // Update folder
    await db.folder.update({
      where: { id: folderId },
      data: {
        parentFolder: {
          connect: { id: newParentId },
        },
        lastEditedOn: new Date().toISOString(),
      },
    });

    // Update new parent
    await db.folder.update({
      where: { id: newParentId },
      data: {
        childrenFolder: {
          connect: [{ id: folderId }],
        },
        lastEditedOn: new Date().toISOString(),
      },
    });
  }
  const folderData = foldersMetaObject.folders[folderId];
  if (!folderData) throw new Error('Folder not found');

  // Checks
  if (!folderData.folder.parentId) throw new Error('Root folders cannot be moved');
  if (folderData.folder.parentId === newParentId) return;

  const newParentData = foldersMetaObject.folders[newParentId];
  if (!newParentData) throw new Error('New parent folder not found');

  if (newParentData.folder.environmentId !== folderData.folder.environmentId)
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
  oldParentData.folder.lastEdited = new Date().toISOString();
  store.update('folders', oldParentData.folder.id, oldParentData.folder);

  folderData.folder.parentId = newParentId;
  newParentData.children.push({ type: 'folder', id: folderData.folder.id });
  newParentData.folder.lastEdited = new Date().toISOString();
  store.update('folders', newParentData.folder.id, newParentData.folder);

  store.update('folders', folderId, folderData.folder);
}
