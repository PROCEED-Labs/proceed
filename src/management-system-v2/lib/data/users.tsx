'use server';

import { getCurrentUser } from '@/components/auth';
import { userError } from '../user-error';
import { AuthenticatedUserData, AuthenticatedUserDataSchema } from './user-schema';
import { ReactNode } from 'react';
import { OrganizationEnvironment } from './environment-schema';
import Link from 'next/link';
import { enableUseDB } from 'FeatureFlags';
import { UserHasToDeleteOrganizationsError } from './legacy/iam/users';

type UserModule = {
  deleteUser: Function;
  updateUser: Function;
  usersMetaObject?: any;
  getUserById: Function;
};

type EnvironmentModule = {
  getEnvironmentById: Function;
};

let userModule: UserModule;
let environmentModule: EnvironmentModule;

let _deleteUser: Function;
let _updateUser: Function;
let usersMetaObject: any;
let getUserById: Function;

let getEnvironmentById: Function;

const loadModules = async () => {
  [userModule, environmentModule] = await Promise.all([
    enableUseDB ? import('./db/iam/users') : import('./legacy/iam/users'),
    enableUseDB ? import('./db/iam/environments') : import('./legacy/iam/environments'),
  ]);

  ({ deleteUser: _deleteUser, updateUser: _updateUser, usersMetaObject, getUserById } = userModule);

  ({ getEnvironmentById } = environmentModule);
};

loadModules().catch(console.error);

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

  const user = enableUseDB ? await getUserById(userId) : usersMetaObject[userId];

  if (user?.isGuest) {
    return []; // Guest users have no favourites
  }
  return user?.favourites ?? [];
}

export async function isUserGuest() {
  const { userId } = await getCurrentUser();
  const user = enableUseDB ? await getUserById(userId) : usersMetaObject[userId];

  return user?.isGuest;
}
