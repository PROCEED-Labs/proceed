'use server';

import { getCurrentUser } from '@/components/auth';
import { getErrorMessage, userError } from '../user-error';
import { AuthenticatedUserData, AuthenticatedUserDataSchema } from './user-schema';
import { ReactNode } from 'react';
import { OrganizationEnvironment } from './environment-schema';
import Link from 'next/link';
import {
  UserHasToDeleteOrganizationsError,
  deleteUser as _deleteUser,
  updateUser as _updateUser,
  getUserById,
} from '@/lib/data/db/iam/users';
import { getEnvironmentById } from './db/iam/environments';

export async function deleteUser() {
  const { userId } = await getCurrentUser();

  try {
    _deleteUser(userId);
  } catch (e) {
    let message: ReactNode = 'Error deleting user';

    if (e instanceof UserHasToDeleteOrganizationsError) {
      const conflictingOrgsNames = e.conflictingOrgs.map(
        async (orgId: string) =>
          ((await getEnvironmentById(orgId)) as OrganizationEnvironment).name,
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
              <li key={idx}>
                {name}:{' '}
                <Link
                  href={`/${(e as UserHasToDeleteOrganizationsError).conflictingOrgs[idx]}/iam/roles`}
                >
                  manage roles here
                </Link>
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
    const user = await getUserById(userId);

    if (user?.isGuest) {
      return userError('Guest users cannot be updated');
    }

    const newUserData = AuthenticatedUserDataSchema.parse(newUserDataInput);

    await _updateUser(userId, { ...newUserData });
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function getUsersFavourites(): Promise<String[]> {
  const { userId } = await getCurrentUser();

  const user = await getUserById(userId);

  if (user?.isGuest) {
    return []; // Guest users have no favourites
  }
  return user?.favourites ?? [];
}

export async function isUserGuest() {
  const { userId } = await getCurrentUser();
  const user = await getUserById(userId);

  return user?.isGuest;
}
