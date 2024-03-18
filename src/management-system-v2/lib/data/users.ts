'use server';

import { getCurrentUser } from '@/components/auth';
import {
  deleteuser,
  addUser as _addUser,
  updateUser as _updateUser,
  usersMetaObject,
} from './legacy/iam/users';
import { userError } from '../user-error';
import { AuthenticatedUserData, AuthenticatedUserDataSchema } from './user-schema';

export async function deleteUser() {
  const { userId } = await getCurrentUser();

  try {
    deleteuser(userId);
  } catch (_) {
    return userError('Error deleting user');
  }
}

export async function updateUser(newUserDataInput: AuthenticatedUserData) {
  try {
    const { userId } = await getCurrentUser();

    const newUserData = AuthenticatedUserDataSchema.parse(newUserDataInput);

    _updateUser(userId, newUserData);
  } catch (_) {
    return userError('Error updating user');
  }
}

export async function getUsersFavourites(): Promise<String[]> {
  const { userId } = await getCurrentUser();

  const user = usersMetaObject[userId];

  if (user.guest) {
    return []; // Guest users have no favourites
  }
  return user.favourites ?? [];
}
