'use server';

import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { UserErrorType, getErrorMessage, userError } from '../server-error-handling/user-error';
import { AuthenticatedUserData, AuthenticatedUserDataSchema } from './user-schema';
import { ReactNode } from 'react';
import { OrganizationEnvironment } from './environment-schema';
import Link from 'next/link';
import {
  UserHasToDeleteOrganizationsError,
  deleteUser as _deleteUser,
  updateUser as _updateUser,
  setUserPassword as _setUserPassword,
  getUserById,
} from '@/lib/data/db/iam/users';
import { getEnvironmentById } from './db/iam/environments';
import { hashPassword } from '../password-hashes';
import { getAppliedRolesForUser } from '../authorization/organizationEnvironmentRolesHelper';
import db from '@/lib/data/db/index';
import { env } from '../ms-config/env-vars';

export async function deleteUser() {
  const { userId } = await getCurrentUser();

  try {
    await _deleteUser(userId);
  } catch (e) {
    let message: ReactNode;

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
    } else {
      message = getErrorMessage(e, 'Error deleting user');
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

export async function setUserPassword(newPassword: string) {
  try {
    const { userId } = await getCurrentUser();
    const user = await getUserById(userId);

    if (!user) {
      return userError('Invalid session, please sign in again');
    }

    if (user?.isGuest) {
      return userError('Guest users cannot change their password');
    }

    const passwordHash = await hashPassword(newPassword);
    await _setUserPassword(userId, passwordHash);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

// To avoid this endpoint from being abused there's not much we can do, but we do the following:
// - Encoforce the user to be an admin of an org
// - Search query has to be at least 4 characters long
// - We only return 10 users
export async function queryUsers(organizationId: string, searchQuery: string) {
  if (searchQuery.length < 4) {
    return userError('Unauthorized', UserErrorType.PermissionError);
  }

  const { userId } = await getCurrentUser();
  const { activeEnvironment } = await getCurrentEnvironment(organizationId);

  if (!activeEnvironment.isOrganization) {
    return userError('Unauthorized', UserErrorType.PermissionError);
  }

  const userRoles = await getAppliedRolesForUser(userId, organizationId);
  const isAdmin = userRoles.some((role) => role.name === '@admin');
  if (!isAdmin) {
    return userError('Unauthorized', UserErrorType.PermissionError);
  }

  let mailQuery = [{ email: { contains: searchQuery, mode: 'insensitive' } } as const];
  if (!env.PROCEED_PUBLIC_MAILSERVER_ACTIVE) {
    mailQuery = [];
  }

  try {
    const users = await db.user.findMany({
      where: {
        AND: [
          { isGuest: false },
          {
            OR: [{ username: { contains: searchQuery, mode: 'insensitive' } }, ...mailQuery],
          },
        ],
      },
      take: 10,
    });

    return users.map((user) => ({
      id: user.id,
      profileImage: user.profileImage,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    }));
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function setUserTemporaryPassword(
  affectedUserId: string,
  temporaryPassword: string,
  spaceId?: string,
) {
  try {
    const { user, systemAdmin } = await getCurrentUser();

    let allowed = false;
    if (systemAdmin) {
      allowed = true;
    }
    if (!allowed && spaceId && user) {
      const role = await db.role.findFirst({
        where: {
          name: '@admin',
          environmentId: spaceId,
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

      if (role?.members.some((member) => member.id === user.id)) {
        allowed = true;
      }
    }

    if (!allowed) {
      return userError('Not authorized', UserErrorType.PermissionError);
    }

    const passwordHash = await hashPassword(temporaryPassword);
    await _setUserPassword(affectedUserId, passwordHash, undefined, true);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}
