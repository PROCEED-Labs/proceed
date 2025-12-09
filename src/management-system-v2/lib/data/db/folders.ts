import { ok, err, Result } from 'neverthrow';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { Folder, FolderInput, FolderSchema, FolderUserInput } from '../folder-schema';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { v4 } from 'uuid';
import { ProcessMetadata } from '../process-schema';
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
    return err(new Error(`MS Error: environment ${environmentId} has no root folder`));
  }

  if (ability && !ability.can('view', toCaslResource('Folder', rootFolder))) {
    return err(new UnauthorizedError());
  }

  return ok(rootFolder);
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
    return err(new Error('Folder not found'));
  }

  if (ability && !ability.can('view', toCaslResource('Folder', folder))) {
    return err(new UnauthorizedError());
  }

  return ok(folder);
}

export async function getFolders(spaceId?: string) {
  const selection = await db.folder.findMany({
    where: { environmentId: spaceId },
  });
  return ok(selection);
}

export async function getFolderChildren(folderId: string, ability?: Ability) {
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
    return err(new Error('Folder not found'));
  }

  if (ability && !ability.can('view', toCaslResource('Folder', folder))) {
    return err(new UnauthorizedError());
  }

  const combinedResults = [
    ...folder.childrenFolder.map((child) => ({ ...child, type: 'folder' })),
    ...folder.processes.map((process) => ({ ...process, type: process.type.toLowerCase() })),
  ];
  return ok(combinedResults);
}

export async function getFolderContents(folderId: string, ability?: Ability) {
  const folderChildren = await getFolderChildren(folderId, ability);
  if (folderChildren.isErr()) return folderChildren;

  const folderContent: ((Folder & { type: 'folder' }) | ProcessMetadata)[] = [];

  for (let i = 0; i < folderChildren.value.length; i++) {
    try {
      const child = folderChildren.value[i];

      if (child.type !== 'folder') {
        const process = await getProcess(child.id);
        if (process.isErr()) return process;

        // NOTE: this check should probably done inside inside getprocess
        if (ability && !ability.can('view', toCaslResource('Process', process.value))) continue;
        folderContent.push(process.value as ProcessMetadata);
      } else {
        const folder = await getFolderById(child.id, ability);
        if (folder.isErr()) return folder;

        folderContent.push({ ...folder.value, type: 'folder' });
      }
    } catch (e) {
      return err(e);
    }
  }

  return ok(folderContent);
}

// This is needed to inferr the return type
async function _createFolder(
  folderInput: FolderInput,
  ability: Ability | undefined,
  tx: Prisma.TransactionClient,
) {
  const folderParseResult = FolderSchema.safeParse(folderInput);
  if (!folderParseResult.success) return err(folderParseResult.error);

  const folder = folderParseResult.data;
  if (!folder.id) folder.id = v4();

  // Checks
  if (ability && !ability.can('create', toCaslResource('Folder', folder)))
    return err(new UnauthorizedError());

  const existingFolder = await db.folder.findUnique({
    where: {
      id: folder.id,
    },
  });
  if (existingFolder) {
    return err(new Error('Folder already exists'));
  }

  if (folder.parentId) {
    const parentFolder = await db.folder.findUnique({
      where: {
        id: folder.parentId,
      },
    });

    if (!parentFolder) {
      return err(new Error('Parent folder does not exist'));
    }

    if (parentFolder.environmentId !== folder.environmentId) {
      return err(new Error('Parent folder is in a different environment'));
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
      return err(new Error(`Environment ${folder.environmentId} already has a root folder`));
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

  return ok(createdFolder);
}
export async function createFolder(
  folderInput: FolderInput,
  ability?: Ability,
  tx?: Prisma.TransactionClient,
) {
  if (!tx) {
    return await db.$transaction(async (trx: Prisma.TransactionClient) => {
      return await _createFolder(folderInput, ability, trx);
    });
  } else {
    return _createFolder(folderInput, ability, tx);
  }
}

/** Deletes a folder and every child recursively */
export async function deleteFolder(folderId: string, ability?: Ability) {
  // NOTE: maybe the ability should do this recursive check
  const folderToDelete = await db.folder.findUnique({
    where: { id: folderId },
  });

  if (!folderToDelete) {
    return err(new Error('Folder not found'));
  }

  if (ability && !ability.can('delete', toCaslResource('Folder', folderToDelete))) {
    return err(new UnauthorizedError());
  }

  await db.folder.delete({
    where: { id: folderId },
  });

  return ok();
}

export async function updateFolderMetaData(
  folderId: string,
  newMetaDataInput: Partial<FolderUserInput>,
  ability?: Ability,
  tx?: Prisma.TransactionClient,
) {
  const mutator = tx || db;
  const folder = await mutator.folder.findUnique({
    where: { id: folderId },
  });

  if (!folder) {
    return err(new Error('Folder not found'));
  }

  if (ability && !ability.can('update', toCaslResource('Folder', folder))) {
    return err(new UnauthorizedError());
  }

  if (newMetaDataInput.environmentId && newMetaDataInput.environmentId !== folder.environmentId) {
    return err(new Error('environmentId cannot be changed'));
  }

  const updatedFolder = await mutator.folder.update({
    where: { id: folderId },
    data: { ...newMetaDataInput, lastEditedOn: new Date() },
  });

  return ok(updatedFolder);
}

async function isInSubtree(rootId: string, nodeId: string): Promise<Result<boolean, Error>> {
  const folderData = await db.folder.findUnique({
    where: { id: rootId },
    include: { childrenFolder: true },
  });

  if (!folderData) {
    return err(new Error('RootId not found'));
  }

  const nodeFolder = await db.folder.findUnique({
    where: { id: nodeId },
  });

  if (!nodeFolder) {
    return err(new Error('NodeId not found'));
  }

  if (rootId === nodeId) {
    return ok(true);
  }

  for (const child of folderData.childrenFolder) {
    const recursiveCallResult = await isInSubtree(child.id, nodeId);
    if (recursiveCallResult.isErr()) return recursiveCallResult;

    if (recursiveCallResult.value) return ok(true);
  }
  return ok(false);
}

export async function moveFolder(
  folderId: string,
  newParentId: string,
  ability?: Ability,
  tx?: Prisma.TransactionClient,
) {
  const mutator = tx || db;

  const folder = await mutator.folder.findUnique({
    where: { id: folderId },
    include: { childrenFolder: true, parentFolder: true },
  });

  if (!folder) {
    return err(new Error('Folder not found'));
  }

  if (!folder.parentId) {
    return err(new Error('Root folders cannot be moved'));
  }

  if (folder.parentId === newParentId) {
    return;
  }

  const newParentFolder = await mutator.folder.findUnique({
    where: { id: newParentId },
  });

  if (!newParentFolder) {
    return err(new Error('New parent folder not found'));
  }

  if (newParentFolder.environmentId !== folder.environmentId) {
    return err(new Error('Cannot move folder to a different environment'));
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
    return err(new UnauthorizedError());
  }

  // Check if moving to its own subtree
  if (await isInSubtree(folderId, newParentId)) {
    return err(new Error('Folder cannot be moved to its children'));
  }

  // Update folder
  await mutator.folder.update({
    where: { id: folderId },
    data: {
      parentFolder: {
        connect: { id: newParentId },
      },
      lastEditedOn: new Date(),
    },
  });
}

export async function moveProcess(processId: string, newParentId: string, ability?: Ability) {
  const process = await db.process.findUnique({
    where: { id: processId },
  });

  if (!process) return err(new Error('Folder not found'));

  if (process.folderId === newParentId) return ok();

  const [oldParentFolder, newParentFolder] = await Promise.all([
    db.folder.findUnique({
      where: { id: process.folderId },
    }),

    db.folder.findUnique({
      where: { id: newParentId },
    }),
  ]);

  if (!newParentFolder) return err(new Error('New parent folder not found'));

  if (newParentFolder.environmentId !== process.environmentId)
    return err(new Error('Cannot move folder to a different environment'));

  // Check permissions
  if (
    ability &&
    !(
      ability.can('update', toCaslResource('Process', process)) &&
      ability.can('update', toCaslResource('Folder', newParentFolder)) &&
      ability.can('update', toCaslResource('Folder', oldParentFolder!))
    )
  ) {
    return err(new UnauthorizedError());
  }

  // Update process
  await db.process.update({
    where: { id: processId },
    data: {
      folderId: newParentId,
      lastEditedOn: new Date(),
    },
  });
}
