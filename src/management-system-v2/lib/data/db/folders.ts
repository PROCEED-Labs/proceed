import Ability from '@/lib/ability/abilityHelper.js';
import {
  Folder,
  FolderInput,
  FolderSchema,
  FolderUserInput,
  FolderUserInputSchema,
} from '../folder-schema';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { v4 } from 'uuid';
import { Process, ProcessMetadata } from '../process-schema';
import db from '@/lib/data/db';
import { getProcess } from './process';
import { Prisma } from '@prisma/client';

export async function getRootFolder(environmentId: string, ability?: Ability) {
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

export async function getFolderById(folderId: string, ability?: Ability) {
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

export async function getFolders(spaceId?: string) {
  const selection = await db.folder.findMany({
    where: { environmentId: spaceId },
  });
  return selection;
}

export async function getFolderChildren(folderId: string, ability?: Ability) {
  const folder = await db.folder.findUnique({
    where: {
      id: folderId,
    },
    include: {
      childrenFolder: true,
      processes: true,
      templateProcesses: true,
    },
  });

  if (!folder) {
    throw new Error('Folder not found');
  }

  if (ability && !ability.can('view', toCaslResource('Folder', folder))) {
    throw new Error('Permission denied');
  }

  const combinedResults = [
    ...folder.childrenFolder.map((child) => ({ ...child, type: 'folder' })),
    ...folder.processes.map((process) => ({ ...process, type: process.type.toLowerCase() })),
    ...folder.templateProcesses.map((process) => ({
      ...process,
      type: process.type.toLowerCase(),
    })),
  ];
  return combinedResults;
}

export async function getFolderContents(folderId: string, ability?: Ability) {
  const folderChildren = await getFolderChildren(folderId, ability);
  const folderContent: ((Folder & { type: 'folder' }) | ProcessMetadata)[] = [];

  for (let i = 0; i < folderChildren.length; i++) {
    try {
      const child = folderChildren[i];

      if (child.type !== 'folder') {
        const process = (await getProcess(child.id)) as unknown as Process;
        // NOTE: this check should probably done inside inside getprocess
        if (
          ability &&
          process.type === 'process' &&
          !ability.can('view', toCaslResource('Process', process))
        ) {
          continue;
        }
        folderContent.push(process);
      } else {
        folderContent.push({ ...(await getFolderById(child.id, ability)), type: 'folder' });
      }
    } catch (e) {}
  }

  return folderContent;
}

export async function createFolder(
  folderInput: FolderInput,
  ability?: Ability,
  tx?: Prisma.TransactionClient,
): Promise<Folder> {
  if (!tx) {
    return await db.$transaction(async (trx: Prisma.TransactionClient) => {
      return await createFolder(folderInput, ability, trx);
    });
  }

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
    await tx.folder.update({
      where: {
        id: folder.parentId,
      },
      data: {
        lastEditedOn: new Date(),
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

  const createdFolder = await tx.folder.create({
    data: {
      id: folder.id,
      name: folder.name,
      description: folder.description ?? '',
      parentId: folder.parentId,
      createdBy: folder.createdBy!,
      environmentId: folder.environmentId,
      createdOn: new Date(),
    },
  });

  return createdFolder;
}

/** Deletes a folder and every child recursively */
export async function deleteFolder(folderId: string, ability?: Ability) {
  // NOTE: maybe the ability should do this recursive check
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

export async function updateFolderMetaData(
  folderId: string,
  newMetaDataInput: Partial<FolderUserInput>,
  ability?: Ability,
) {
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
    data: { ...newMetaDataInput, lastEditedOn: new Date() },
  });

  return updatedFolder;
}

async function isInSubtree(rootId: string, nodeId: string) {
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

export async function moveFolder(folderId: string, newParentId: string, ability?: Ability) {
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

  // Update folder
  await db.folder.update({
    where: { id: folderId },
    data: {
      parentFolder: {
        connect: { id: newParentId },
      },
      lastEditedOn: new Date(),
    },
  });
}
