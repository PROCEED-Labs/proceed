'use server';

import { getCurrentUser } from '@/components/auth';
import { Folder } from '@/lib/data/folder-schema';
import { getProcesses, removeProcess, updateProcess } from '@/lib/data/legacy/_process';
import {
  getFolders,
  getRootFolder,
  moveFolder,
  updateFolderMetaData,
} from '@/lib/data/legacy/folders';
import { deleteEnvironment } from '@/lib/data/legacy/iam/environments';
import { deleteUser, getUserById } from '@/lib/data/legacy/iam/users';
import { Process } from '@/lib/data/process-schema';
import { UserErrorType, userError } from '@/lib/user-error';
import { redirect } from 'next/navigation';

async function ensureValidRequest(guestId: string) {}

export async function transferProcesses(guestId: string, callbackUrl: string = '/') {
  const { session } = await getCurrentUser();
  if (!session) return userError("You're not signed in", UserErrorType.PermissionError);
  if (session.user.guest)
    return userError("You can't be a guest to transfer processes", UserErrorType.PermissionError);

  if (guestId === session.user.id) redirect(callbackUrl);

  const possibleGuest = getUserById(guestId);
  if (
    !possibleGuest ||
    !possibleGuest.guest ||
    possibleGuest?.signedInWithUserId !== session.user.id
  )
    return userError('Invalid guest id', UserErrorType.PermissionError);

  // Processes and folders under root folder of guest space guet their folderId changed to the
  // root folder of the new owner space, for the rest we just update the environmentId
  const userRootFolderId = getRootFolder(session.user.id).id;
  const guestRootFolderId = getRootFolder(guestId).id;

  const guestProcesses = (await getProcesses()).filter(
    ({ environmentId }) => environmentId === guestId,
  );
  for (const process of guestProcesses) {
    const processUpdate: Partial<Process> = {
      environmentId: session.user.id,
      owner: session.user.id,
    };
    if (process.folderId === guestRootFolderId) processUpdate.folderId = userRootFolderId;
    updateProcess(process.id, processUpdate);
  }

  const guestFolders = getFolders(guestId);
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

export async function discardProcesses(guestId: string, redirectUrl: string = '/') {
  const { session } = await getCurrentUser();
  if (!session) return userError("You're not signed in", UserErrorType.PermissionError);
  if (session.user.guest)
    return userError("You can't be a guest to transfer processes", UserErrorType.PermissionError);

  if (guestId === session.user.id) redirect(redirectUrl);

  const possibleGuest = getUserById(guestId);
  if (
    !possibleGuest ||
    !possibleGuest.guest ||
    possibleGuest?.signedInWithUserId !== session.user.id
  )
    return userError('Invalid guest id', UserErrorType.PermissionError);

  deleteUser(guestId);

  redirect(redirectUrl);
}
