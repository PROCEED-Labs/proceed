'use server';

import { getCurrentUser } from '@/components/auth';
import { deleteuser, addUser as _addUser } from './legacy/iam/users';
import { userError } from '../user-error';

export async function deleteUsers(userIds: string[]) {
  const { ability } = await getCurrentUser();

  try {
    for (const userId of userIds) {
      deleteuser(userId, ability);
    }
  } catch (_) {
    return userError('Error deleting users');
  }
}

export async function addUser(user: Parameters<typeof _addUser>[0]) {
  try {
    const { ability } = await getCurrentUser();
    _addUser(user, ability);
  } catch (_) {
    return userError('Error adding user');
  }
}
