'use server';

import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { UserErrorType, getErrorMessage, userError } from '@/lib/server-error-handling/user-error';
import { AuthenticatedUserData, AuthenticatedUserDataSchema } from './user-schema';
import { ReactNode } from 'react';
import Link from 'next/link';
import {
  UserHasToDeleteOrganizationsError,
  deleteUser as _deleteUser,
  updateUser as _updateUser,
  setUserPassword as _setUserPassword,
  getUserById,
} from '@/lib/data/db/iam/users';
import { hashPassword } from '../password-hashes';
import { getAppliedRolesForUser } from '../authorization/organizationEnvironmentRolesHelper';
import db from '@/lib/data/db/index';
import { env } from '../ms-config/env-vars';

export async function deleteUser() {
  const currentUser = await getCurrentUser();
  if (currentUser.isErr()) {
    return userError(getErrorMessage(currentUser.error));
  }
  const { userId } = currentUser.value;

  const deleteResult = await _deleteUser(userId);
  if (deleteResult.isOk()) return;

  try {
    const e = deleteResult.error;
    let message: ReactNode;

    if (e instanceof UserHasToDeleteOrganizationsError) {
      const conflictingOrgs = await db.space.findMany({
        where: {
          id: { in: e.conflictingOrgs },
        },
        select: {
          name: true,
          id: true,
        },
      });

      message = (
        <>
          <p>
            You're part of organizations where you are the only admin, in order to delete your
            accounts you first have to either add another admin or delete these organizations.
          </p>
          <p>The affected organizations are:</p>
          <ul>
            {conflictingOrgs.map(({ name, id }) => (
              <li key={id}>
                {name}: <Link href={`/${id}/iam/roles`}>manage roles here</Link>
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
  } catch (_) {
    return userError('Something weng wrong');
  }
}

export async function updateUser(newUserDataInput: AuthenticatedUserData) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser.isErr()) {
      return userError(getErrorMessage(currentUser.error));
    }
    const { userId } = currentUser.value;

    const user = await getUserById(userId);
    if (user.isErr()) {
      return userError(getErrorMessage(user.error));
    }

    if (user.value?.isGuest) {
      return userError('Guest users cannot be updated');
    }

    const parseResult = AuthenticatedUserDataSchema.safeParse(newUserDataInput);
    if (!parseResult.success) return userError('Malformed data');
    const newUserData = parseResult.data;

    await _updateUser(userId, { ...newUserData });
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function getUsersFavourites() {
  const currentUser = await getCurrentUser();
  if (currentUser.isErr()) {
    return userError(getErrorMessage(currentUser.error));
  }
  const { userId } = currentUser.value;

  const user = await getUserById(userId);
  if (user.isErr()) {
    return userError(getErrorMessage(user.error));
  }

  if (user.value?.isGuest) {
    return []; // Guest users have no favourites
  }
  return user.value?.favourites ?? [];
}

export async function setUserPassword(newPassword: string) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser.isErr()) {
      return userError(getErrorMessage(currentUser.error));
    }
    const { userId } = currentUser.value;

    const user = await getUserById(userId);
    if (user.isErr()) {
      return userError(getErrorMessage(user.error));
    }

    if (!user.value) {
      return userError('Invalid session, please sign in again');
    }

    if (user.value?.isGuest) {
      return userError('Guest users cannot change their password');
    }

    const passwordHash = await hashPassword(newPassword);
    const result = await _setUserPassword(userId, passwordHash);
    if (result.isErr()) {
      return userError(getErrorMessage(result.error));
    }
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

// To avoid this endpoint from being abused there's not much we can do, but we do the following:
// - Enforce the user to be an admin of an org
// - Search query has to be at least 4 characters long
// - We only return 10 users
export async function queryUsers(organizationId: string, searchQuery: string) {
  if (searchQuery.length < 4) {
    return userError('Unauthorized', UserErrorType.PermissionError);
  }

  const currentUser = await getCurrentUser();
  if (currentUser.isErr()) {
    return userError(getErrorMessage(currentUser.error));
  }
  const { userId } = currentUser.value;

  const currentEnvironment = await getCurrentEnvironment(organizationId);
  if (currentEnvironment.isErr()) {
    return userError(getErrorMessage(currentEnvironment.error));
  }
  const { activeEnvironment } = currentEnvironment.value;

  if (!activeEnvironment.isOrganization) {
    return userError('Unauthorized', UserErrorType.PermissionError);
  }

  const userRoles = await getAppliedRolesForUser(userId, organizationId);
  if (userRoles.isErr()) return userError(getErrorMessage(userRoles.error));

  const isAdmin = userRoles.value.some((role) => role.name === '@admin');
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
    const currentUser = await getCurrentUser();
    if (currentUser.isErr()) {
      return userError(getErrorMessage(currentUser.error));
    }
    const { user, systemAdmin } = currentUser.value;

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
