'use server';

import { getCurrentUser } from '@/components/auth';
import { deleteuser, addUser as _addUser, updateUser as _updateUser } from './legacy/iam/users';
import { userError } from '../user-error';
import { UserData } from './user-schema';

export async function deleteUser() {
  const { userId } = await getCurrentUser();

  try {
    deleteuser(userId);
  } catch (_) {
    return userError('Error deleting user');
  }
}

export async function updateUser(newUserData: UserData) {
  try {
    const { userId } = await getCurrentUser();

    _updateUser(userId, newUserData);
  } catch (_) {
    return userError('Error updating user');
  }
}
