'use server';

import { getCurrentUser } from '@/components/auth';
import { deleteuser, addUser as _addUser, updateUser as _updateUser } from './legacy/iam/users';
import { userError } from '../user-error';
import { UserData } from './user-schema';

export async function deleteUser() {
  const { session } = await getCurrentUser();
  const userId = session?.user.id || '';

  try {
    deleteuser(userId);
  } catch (_) {
    return userError('Error deleting user');
  }
}

export async function addUser(user: Parameters<typeof _addUser>[0]) {
  try {
    return _addUser(user);
  } catch (_) {
    return userError('Error adding user');
  }
}

export async function updateUser(newUserData: UserData) {
  try {
    const { session } = await getCurrentUser();
    const userId = session?.user.id || '';

    _updateUser(userId, newUserData);
  } catch (_) {
    return userError('Error updating user');
  }
}
