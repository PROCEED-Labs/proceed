'use server';

import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { FolderUserInput, FolderUserInputSchema } from './folder-schema';
import { createFolder as _createFolder, getRootFolder } from './legacy/folders';
import { userError } from '../user-error';

export async function createFolder(folderInput: FolderUserInput) {
  try {
    const folder = FolderUserInputSchema.parse(folderInput);
    const { ability } = await getCurrentEnvironment(folder.environmentId);
    const { userId } = await getCurrentUser();

    if (!folder.parentId) folder.parentId = getRootFolder(folder.environmentId).id;

    _createFolder({ ...folder, createdBy: userId }, ability);
  } catch (e) {
    return userError("Couldn't create folder");
  }
}
