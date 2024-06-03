'use server';

import { getCurrentUser } from '@/components/auth';
import {
  deleteUser as _deleteUser,
  updateUser as _updateUser,
  usersMetaObject,
  UserHasToDeleteOrganizationsError,
} from './legacy/iam/users';
import { userError } from '../user-error';
import { AuthenticatedUserData, AuthenticatedUserDataSchema } from './user-schema';
import { ReactNode } from 'react';
import { getEnvironmentById } from './legacy/iam/environments';
import { OrganizationEnvironment } from './environment-schema';
import Link from 'next/link';

export async function deleteUser() {
  const { userId } = await getCurrentUser();

  try {
    _deleteUser(userId);
  } catch (e) {
    let message: ReactNode = 'Error deleting user';

    if (e instanceof UserHasToDeleteOrganizationsError) {
      const conflictingOrgsNames = e.conflictingOrgs.map(
        (orgId) => (getEnvironmentById(orgId) as OrganizationEnvironment).name,
      );

      message = (
        <>
          <p>
            You're part of organizations where you are the only admin, in order to delete your
            accounts you first have to either add another admin or delete these organizations.
          </p>
          <p>The affected organizations are:</p>
          <ul>
            {conflictingOrgsNames.map((name, idx) => (
              <li>
                {name}: <Link href={`/${e.conflictingOrgs[idx]}/iam/roles`}>manage roles here</Link>
              </li>
            ))}
          </ul>
          <p>
            You can delete these organizations <Link href="/environments">here</Link>.
          </p>
        </>
      );
    }

    return userError(message);
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
