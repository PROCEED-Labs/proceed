import { ok, err } from 'neverthrow';
import { v4 } from 'uuid';
import {
  User,
  UserSchema,
  OauthAccountSchema,
  OauthAccount,
  AuthenticatedUser,
  AuthenticatedUserSchema,
} from '../../user-schema';
import { addEnvironment } from './environments';
import { OptionalKeys } from '@/lib/typescript-utils.js';
import { getUserOrganizationEnvironments } from './memberships';
import { getRoleMappingByUserId } from './role-mappings';
import db from '@/lib/data/db';
import { Prisma, PasswordAccount } from '@prisma/client';
import { UserFacingError } from '@/lib/server-error-handling/user-error';
import { env } from '@/lib/ms-config/env-vars';
import { NextAuthEmailTakenError, NextAuthUsernameTakenError } from '@/lib/authjs-error-message';
import { ensureTransactionWrapper } from '../util';
import { NotFoundError } from '@/lib/server-error-handling/errors';

export async function getUsers(page: number = 1, pageSize: number = 10) {
  // TODO ability check
  const skip = (page - 1) * pageSize;
  const users = (await db.user.findMany({
    skip,
    take: pageSize,
  })) as User[];

  const totalUsers = await db.user.count();
  const totalPages = Math.ceil(totalUsers / pageSize);

  return ok({
    users,
    pagination: {
      currentPage: page,
      pageSize,
      totalUsers,
      totalPages,
    },
  });
}

export async function getUserById(
  id: string,
  opts?: { throwIfNotFound?: boolean },
  tx?: Prisma.TransactionClient,
) {
  const dbMutator = tx || db;

  const user = await dbMutator.user.findUnique({ where: { id: id } });

  if (!user && opts && opts.throwIfNotFound) return err(new Error('User not found'));

  return ok(user as User | null);
}

export async function getUserByEmail(email: string) {
  const user = await db.user.findUnique({ where: { email: email } });

  if (!user) return err(new NotFoundError(`User could not be found (email: ${email}).`));

  return ok(user as User);
}

export async function getUserByUsername(username: string, opts?: { throwIfNotFound?: boolean }) {
  const user = await db.user.findUnique({ where: { username } });

  if (!user && opts?.throwIfNotFound)
    return err(new NotFoundError(`User could not be found (username: ${username}).`));

  return ok(user as User | null);
}

export const addUser = ensureTransactionWrapper(_addUser, 1);
export async function _addUser(
  inputUser: OptionalKeys<User, 'id'>,
  _tx?: Prisma.TransactionClient,
) {
  const tx = _tx!;

  const parseResult = UserSchema.safeParse(inputUser);
  if (!parseResult.success) {
    return err(parseResult.error);
  }
  const user = parseResult.data;

  if (!user.isGuest) {
    const checks = [];
    checks.push(user.username ? getUserByUsername(user.username) : undefined);
    checks.push(user.email ? getUserByEmail(user.email) : undefined);

    const [usernameRes, emailRes] = await Promise.all(checks);

    if (usernameRes) {
      if (usernameRes.isErr() && !(usernameRes.error instanceof NotFoundError)) return usernameRes;

      if (!usernameRes.isErr() && usernameRes.value) return err(new NextAuthUsernameTakenError());
    }
    if (emailRes) {
      if (emailRes.isErr() && !(emailRes.error instanceof NotFoundError)) return emailRes;

      if (!emailRes.isErr() && emailRes.value) return err(new NextAuthEmailTakenError());
    }
  }

  if (!user.id) user.id = v4();

  try {
    const userExists = await tx.user.findUnique({ where: { id: user.id } });
    if (userExists) return err(new Error('User already exists'));

    await tx.user.create({
      data: {
        ...user,
        isGuest: user.isGuest,
      },
    });

    if (env.PROCEED_PUBLIC_IAM_PERSONAL_SPACES_ACTIVE) {
      const personalSpace = await addEnvironment(
        { ownerId: user.id!, isOrganization: false },
        undefined,
        tx,
      );
      if (personalSpace.isErr()) {
        return personalSpace;
      }
    }

    if (user.isGuest) {
      await tx.guestSignin.create({
        data: {
          userId: user.id!,
        },
      });
    }
  } catch (error) {
    console.error('Error adding new user: ', error);
  }

  return ok(user as User);
}

export class UserHasToDeleteOrganizationsError extends Error {
  conflictingOrgs: string[];

  constructor(conflictingOrgs: string[], message?: string) {
    super(message ?? 'User has to delete organizations before being deleted');
    this.name = 'UserHasToDeleteOrganizationsError';
    this.conflictingOrgs = conflictingOrgs;
  }
}

export const deleteUser = ensureTransactionWrapper(_deleteUser, 1);
export async function _deleteUser(userId: string, tx?: Prisma.TransactionClient) {
  const dbMutator = tx!;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return err(new Error("User doesn't exist"));

  if (user.username === 'admin') {
    return err(new UserFacingError('The user "admin" cannot be deleted'));
  }

  const userOrganizations = await getUserOrganizationEnvironments(userId);
  if (userOrganizations.isErr()) {
    return userOrganizations;
  }

  const orgsWithNoNextAdmin: string[] = [];
  for (const environmentId of userOrganizations.value) {
    const userRoles = await getRoleMappingByUserId(userId, environmentId);
    if (userRoles.isErr()) {
      return userRoles;
    }

    if (!userRoles.value.find((role) => role.roleName === '@admin')) continue;

    const adminRole = await db.role.findFirst({
      where: { name: '@admin', environmentId: environmentId },
      include: { members: true },
    });
    if (!adminRole)
      return err(
        new Error(`Consistency error: admin role of environment ${environmentId} not found`),
      );

    if (adminRole.members.length === 1) {
      orgsWithNoNextAdmin.push(environmentId);
    } else {
      /* make the next available admin the owner of the organization, because once the user is deleted,
      the space that the user owns will be deleted: ON DELETE CASCADE */
      await dbMutator.space.update({
        where: { id: environmentId },
        data: { ownerId: adminRole.members.find((member) => member.userId !== userId)?.userId },
      });
    }
  }

  if (orgsWithNoNextAdmin.length > 0)
    return err(new UserHasToDeleteOrganizationsError(orgsWithNoNextAdmin));

  if (user.isGuest) {
    await dbMutator.guestSignin.delete({ where: { userId: userId } });
  }

  await dbMutator.user.delete({ where: { id: userId } });

  return ok(user as User);
}

export async function updateUser(
  userId: string,
  inputUser: Partial<AuthenticatedUser>,
  tx?: Prisma.TransactionClient,
) {
  const dbMutator = tx || db;

  const user = await getUserById(userId, { throwIfNotFound: true });
  if (user.isErr()) {
    return user;
  }

  const isGoingToBeGuest =
    inputUser.isGuest !== undefined ? inputUser.isGuest : user.value?.isGuest;
  let updatedUser: Prisma.UserUpdateInput;
  if (isGoingToBeGuest) {
    if (inputUser.username || inputUser.lastName || inputUser.firstName || inputUser.email) {
      return err(new Error('Guest users cannot update their user data'));
    }
    updatedUser = { isGuest: true };
  } else {
    const parseResult = AuthenticatedUserSchema.partial().safeParse(inputUser);
    if (!parseResult.success) {
      return err(parseResult.error);
    }
    const newUserData = parseResult.data;

    if (newUserData.username && newUserData.username === 'admin') {
      return err(new UserFacingError('The username is already taken'));
    }

    if (!user.value?.isGuest && user.value?.username === 'admin' && 'username' in newUserData) {
      return err(new UserFacingError('The username "admin" cannot be changed'));
    }

    if (newUserData.email) {
      const existingUser = await db.user.findUnique({ where: { email: newUserData.email } });

      if (existingUser && existingUser.id !== userId)
        return err(new UserFacingError('User with this email or username already exists'));
    }

    if (newUserData.username) {
      const existingUser = await db.user.findUnique({ where: { username: newUserData.username } });

      if (existingUser && existingUser.id !== userId)
        return err(new UserFacingError('The username is already taken'));
    }

    updatedUser = { ...user, ...newUserData };
  }

  const updatedUserFromDB = await dbMutator.user.update({
    where: { id: userId },
    data: updatedUser,
  });

  return ok(updatedUserFromDB);
}

export async function addOauthAccount(accountInput: Omit<OauthAccount, 'id'>) {
  const newAccount = OauthAccountSchema.parse(accountInput);

  const user = await getUserById(newAccount.userId);
  if (user.isErr()) return user;
  if (!user.value) return err(new Error('User not found'));
  if (user.value.isGuest) return err(new Error('Guest users cannot have oauth accounts'));

  const id = v4();

  const account = { ...newAccount, id };

  await db.oauthAccount.create({ data: account });

  return ok(account);
}

export async function deleteOauthAccount(id: string) {
  await db.oauthAccount.delete({
    where: {
      id: id,
    },
  });
}
export async function getOauthAccountByProviderId(provider: string, providerAccountId: string) {
  return ok(
    await db.oauthAccount.findUnique({
      where: {
        provider: provider,
        providerAccountId: providerAccountId,
      },
    }),
  );
}

export async function updateGuestUserLastSigninTime(
  userId: string,
  date: Date,
  tx?: Prisma.TransactionClient,
) {
  const dbMutator = tx || db;
  const user = await dbMutator.user.findUnique({
    where: { id: userId },
    select: { isGuest: true },
  });

  if (!user) return err(new Error('User does not exist'));
  if (!user.isGuest) return err(new Error('User is not a guest user'));

  return ok(
    await dbMutator.guestSignin.update({
      where: { userId: userId },
      data: { lastSigninAt: date },
    }),
  );
}

export const deleteInactiveGuestUsers = ensureTransactionWrapper(_deleteInactiveGuestUsers, 1);
export async function _deleteInactiveGuestUsers(
  inactiveTimeInMS: number,
  _tx?: Prisma.TransactionClient,
) {
  const tx = _tx!;

  const cutoff = new Date(Date.now() - inactiveTimeInMS);
  const staleSignins = await tx.guestSignin.findMany({
    where: {
      lastSigninAt: { lt: cutoff },
    },
    select: { userId: true },
  });
  if (staleSignins.length === 0) return ok({ count: 0 });

  const userIds = staleSignins.map((s) => s.userId);

  await tx.guestSignin.deleteMany({
    where: {
      lastSigninAt: { lt: cutoff },
    },
  });

  return ok(
    await tx.user.deleteMany({
      where: {
        id: { in: userIds },
        isGuest: true,
      },
    }),
  );
}

/** Note: make sure to save a salted hash of the password */
export async function setUserPassword(
  userId: string,
  passwordHash: string,
  tx?: Prisma.TransactionClient,
  isTemporaryPassword: boolean = false,
) {
  const dbMutator = tx || db;

  const user = await dbMutator.user.findUnique({
    where: { id: userId },
    include: { passwordAccount: true },
  });
  if (!user) return err(new Error('User not found'));

  if (user.passwordAccount) {
    await dbMutator.passwordAccount.update({
      where: { userId },
      data: { password: passwordHash, isTemporaryPassword },
    });
  } else {
    await dbMutator.passwordAccount.create({
      data: { userId, password: passwordHash, isTemporaryPassword },
    });
  }
  return ok();
}

export async function getUserPassword(userId: string, tx?: Prisma.TransactionClient) {
  const dbMutator = tx || db;

  return ok(
    await dbMutator.passwordAccount.findUnique({
      where: { userId },
    }),
  );
}

/** returns null if the user exists but has no password */
export async function getUserAndPasswordByUsername(
  username: string,
  tx?: Prisma.TransactionClient,
) {
  const dbMutator = tx || db;

  const userAndPassword = await dbMutator.user.findUnique({
    where: { username },
    include: { passwordAccount: true },
  });

  if (!userAndPassword) return ok(null);
  if (!userAndPassword.passwordAccount) return ok(null);
  return ok(userAndPassword as typeof userAndPassword & { passwordAccount: PasswordAccount });
}
