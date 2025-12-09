'use server';
import { getCurrentUser } from '@/components/auth';
import { Folder } from '@/lib/data/folder-schema';
import { getFolders, getRootFolder, moveFolder, updateFolderMetaData } from '@/lib/data/db/folders';
import { getProcesses, updateProcess } from '@/lib/data/db/process';
import { getUserById, deleteUser } from '@/lib/data/db/iam/users';
import { Process } from '@/lib/data/process-schema';
import { getGuestReference } from '@/lib/reference-guest-user-token';
import { UserErrorType, getErrorMessage, userError } from '@/lib/server-error-handling/user-error';
import { redirect } from 'next/navigation';
import db from '@/lib/data/db';

export async function transferProcesses(referenceToken: string, callbackUrl: string = '/') {
  const currentUser = await getCurrentUser();
  if (currentUser.isErr()) {
    return userError(getErrorMessage(currentUser.error));
  }
  const { session } = currentUser.value;
  if (!session) return userError("You're not signed in", UserErrorType.PermissionError);
  if (session.user.isGuest)
    return userError("You can't be a guest to transfer processes", UserErrorType.PermissionError);

  const reference = getGuestReference(referenceToken);
  if ('error' in reference) return userError(reference.error);
  const guestId = reference.guestId;

  if (guestId === session.user.id) redirect(callbackUrl);

  const possibleGuest = await getUserById(guestId);
  if (possibleGuest.isErr()) {
    return userError(getErrorMessage(possibleGuest.error));
  }
  if (!possibleGuest.value || !possibleGuest.value.isGuest)
    return userError('Invalid guest id', UserErrorType.PermissionError);

  // Processes and folders under root folder of guest space guet their folderId changed to the
  // root folder of the new owner space, for the rest we just update the environmentId
  const userRootFolder = await getRootFolder(session.user.id);
  if (userRootFolder.isErr()) {
    return userError(getErrorMessage(userRootFolder.error));
  }

  const guestRootFolder = await getRootFolder(guestId);
  if (guestRootFolder.isErr()) {
    return userError(getErrorMessage(guestRootFolder.error));
  }

  // no ability check necessary, owners of personal spaces can do anything
  const guestProcesses = await getProcesses(guestId);
  if (guestProcesses.isErr()) {
    return userError(getErrorMessage(guestProcesses.error));
  }

  try {
    await db.$transaction(async (tx) => {
      for (const process of guestProcesses.value) {
        const processUpdate: Partial<Process> = {
          environmentId: session.user.id,
          creatorId: session.user.id,
        };

        if (process.folderId === guestRootFolder.value.id) {
          processUpdate.folderId = userRootFolder.value.id;
        }
        const result = await updateProcess(process.id, processUpdate, tx);
        if (result.isErr()) {
          throw result.error;
        }
      }

      const guestFolders = await getFolders(guestId);
      if (guestFolders.isErr()) {
        throw guestFolders.error;
      }

      for (const folder of guestFolders.value) {
        // skip the guest's root folder
        if (folder.id === guestRootFolder.value.id) continue;

        const folderData: Partial<Folder> = { createdBy: session.user.id };

        if (folder.parentId === guestRootFolder.value.id) {
          const moveResult = await moveFolder(folder.id, userRootFolder.value.id, undefined, tx);
          if (moveResult?.isErr()) {
            throw moveResult.error;
          }
        } else {
          folderData.environmentId = session.user.id;
        }

        const updateResult = await updateFolderMetaData(folder.id, folderData, undefined, tx);
        if (updateResult.isErr()) {
          throw updateResult.error;
        }
      }

      const deleteResult = await deleteUser(guestId, tx);
      if (deleteResult.isErr()) {
        throw deleteResult.error;
      }
    });
  } catch (error) {
    return userError(getErrorMessage(error));
  }

  redirect(callbackUrl);
}

export async function discardProcesses(referenceToken: string, redirectUrl: string = '/') {
  const currentUser = await getCurrentUser();
  if (currentUser.isErr()) {
    return userError(getErrorMessage(currentUser.error));
  }
  const { session } = currentUser.value;
  if (!session) return userError("You're not signed in", UserErrorType.PermissionError);
  if (session.user.isGuest)
    return userError("You can't be a guest to transfer processes", UserErrorType.PermissionError);

  const reference = getGuestReference(referenceToken);
  if ('error' in reference) return userError(reference.error);
  const guestId = reference.guestId;

  if (guestId === session.user.id) redirect(redirectUrl);

  const possibleGuest = await getUserById(guestId);
  if (possibleGuest.isErr()) {
    return userError(getErrorMessage(possibleGuest.error));
  }

  if (!possibleGuest.value || !possibleGuest.value.isGuest)
    return userError('Invalid guest id', UserErrorType.PermissionError);

  const deleteResult = await deleteUser(guestId);
  if (deleteResult.isErr()) {
    return userError(getErrorMessage(deleteResult.error));
  }

  redirect(redirectUrl);
}
