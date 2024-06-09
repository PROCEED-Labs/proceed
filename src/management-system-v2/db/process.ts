'use server';
import db from '@/db';
import { Process } from '@prisma/client';

export async function createProcess(data: Process) {
  try {
    const process = await db.process.create({
      data: {
        originalId: data.originalId,
        name: data.name,
        description: data.description,
        createdOn: data.createdOn || new Date(),
        lastEdited: data.lastEdited || new Date(),
        type: data.type,
        sharedAs: data.sharedAs,
        shareTimestamp: data.shareTimestamp || 0,
        allowIframeTimestamp: data.allowIframeTimestamp || 0,
        workspaceId: data.workspaceId,
        ownerId: data.ownerId,
        folderId: data.folderId,
      },
    });
    return process;
  } catch (error) {
    throw new Error(`Error creating process: ${error}`);
  }
}

export async function getProcessById(id: string) {
  try {
    const process = await db.process.findUnique({
      where: {
        id,
      },
      include: {
        // departments: true,
        // variables: true,
        // versions: true,
        bpmn: true,
      },
    });
    return process;
  } catch (error: any) {
    throw new Error(`Error getting process by ID: ${error}`);
  }
}

export async function updateProcess(id: string, data: Partial<Process>) {
  try {
    const process = await db.process.update({
      where: {
        id,
      },
      data: {
        ...data,
        lastEdited: new Date(),
      },
    });
    return process;
  } catch (error: any) {
    throw new Error(`Error updating process: ${error}`);
  }
}

export async function deleteProcess(id: string) {
  try {
    const process = await db.process.delete({
      where: {
        id,
      },
    });
    return process;
  } catch (error: any) {
    throw new Error(`Error deleting process: ${error}`);
  }
}
