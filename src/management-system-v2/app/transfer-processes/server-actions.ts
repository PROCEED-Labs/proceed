'use server';

import { getCurrentUser } from '@/components/auth';
import { Folder } from '@/lib/data/folder-schema';
import {
  getProcesses,
  getFolders,
  getRootFolder,
  moveFolder,
  updateFolderMetaData,
  updateProcess,
} from '@/lib/data/DTOs';
import { deleteUser, getUserById } from '@/lib/data/legacy/iam/users';
import { Process } from '@/lib/data/process-schema';
import { getGuestReference } from '@/lib/reference-guest-user-token';
import { UserErrorType, userError } from '@/lib/user-error';
import { redirect } from 'next/navigation';

export async function transferProcesses(referenceToken: string, callbackUrl: string = '/') {
  const { session } = await getCurrentUser();
  if (!session) return userError("You're not signed in", UserErrorType.PermissionError);
  if (session.user.isGuest)
    return userError("You can't be a guest to transfer processes", UserErrorType.PermissionError);

  const reference = getGuestReference(referenceToken);
  if ('error' in reference) return userError(reference.error);
  const guestId = reference.guestId;

  if (guestId === session.user.id) redirect(callbackUrl);

  const possibleGuest = await getUserById(guestId);
  if (!possibleGuest || !possibleGuest.isGuest)
    return userError('Invalid guest id', UserErrorType.PermissionError);

  // Processes and folders under root folder of guest space guet their folderId changed to the
  // root folder of the new owner space, for the rest we just update the environmentId
  const userRootFolderId = (await getRootFolder(session.user.id)).id;
  const guestRootFolderId = (await getRootFolder(guestId)).id;

  // no ability check necessary, owners of personal spaces can do anything
  const guestProcesses = await getProcesses(guestId);
  for (const process of guestProcesses) {
    const processUpdate: Partial<Process> = {
      environmentId: session.user.id,
      creatorId: session.user.id,
    };
    if (process.folderId === guestRootFolderId) processUpdate.folderId = userRootFolderId;
    await updateProcess(process.id, processUpdate);
  }

  const guestFolders = await getFolders(guestId);
  for (const folder of guestFolders) {
    if (folder.id === guestRootFolderId) continue;

    const folderData: Partial<Folder> = { createdBy: session.user.id };

    if (folder.parentId === guestRootFolderId) moveFolder(folder.id, userRootFolderId);
    else folderData.environmentId = session.user.id;

    updateFolderMetaData(folder.id, folderData);
  }

  deleteUser(guestId);

  redirect(callbackUrl);
}

export async function discardProcesses(referenceToken: string, redirectUrl: string = '/') {
  const { session } = await getCurrentUser();
  if (!session) return userError("You're not signed in", UserErrorType.PermissionError);
  if (session.user.isGuest)
    return userError("You can't be a guest to transfer processes", UserErrorType.PermissionError);

  const reference = getGuestReference(referenceToken);
  if ('error' in reference) return userError(reference.error);
  const guestId = reference.guestId;

  if (guestId === session.user.id) redirect(redirectUrl);

  const possibleGuest = await getUserById(guestId);
  if (!possibleGuest || !possibleGuest.isGuest)
    return userError('Invalid guest id', UserErrorType.PermissionError);

  deleteUser(guestId);

  redirect(redirectUrl);
}
