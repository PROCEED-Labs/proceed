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
import { UserFacingError } from '@/lib/user-error';
import { env } from '@/lib/ms-config/env-vars';

export async function getUsers(page: number = 1, pageSize: number = 10) {
  // TODO ability check
  const skip = (page - 1) * pageSize;
  const users = (await db.user.findMany({
    skip,
    take: pageSize,
  })) as User[];

  const totalUsers = await db.user.count();
  const totalPages = Math.ceil(totalUsers / pageSize);

  return {
    users,
    pagination: {
      currentPage: page,
      pageSize,
      totalUsers,
      totalPages,
    },
  };
}

export async function getUserById(
  id: string,
  opts?: { throwIfNotFound?: boolean },
  tx?: Prisma.TransactionClient,
) {
  const dbMutator = tx || db;

  const user = await dbMutator.user.findUnique({ where: { id: id } });

  if (!user && opts && opts.throwIfNotFound) throw new Error('User not found');

  return user as User;
}

export async function getUserByEmail(email: string, opts?: { throwIfNotFound?: boolean }) {
  const user = await db.user.findUnique({ where: { email: email } });

  if (!user && opts?.throwIfNotFound) throw new Error('User not found');

  return user as User;
}

export async function getUserByUsername(username: string, opts?: { throwIfNotFound?: boolean }) {
  const user = await db.user.findUnique({ where: { username } });

  if (!user && opts?.throwIfNotFound) throw new Error('User not found');

  return user as User;
}

export async function addUser(
  inputUser: OptionalKeys<User, 'id'>,
  tx?: Prisma.TransactionClient,
): Promise<User> {
  if (!tx) {
    return await db.$transaction(async (trx: Prisma.TransactionClient) => addUser(inputUser, trx));
  }

  const user = UserSchema.parse(inputUser);

  if (!user.isGuest) {
    const checks = [];
    if (user.username) checks.push(getUserByUsername(user.username));
    if (user.email) checks.push(getUserByEmail(user.email));

    const res = await Promise.all(checks);

    if (res.some((user) => !!user))
      throw new Error('User with this email or username already exists');
  }

  if (!user.id) user.id = v4();

  try {
    const userExists = await tx.user.findUnique({ where: { id: user.id } });
    if (userExists) throw new Error('User already exists');

    await tx.user.create({
      data: {
        ...user,
        isGuest: user.isGuest,
      },
    });

    if (env.PROCEED_PUBLIC_IAM_PERSONAL_SPACES_ACTIVE)
      await addEnvironment({ ownerId: user.id!, isOrganization: false }, undefined, tx);

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

  return user as User;
}

export class UserHasToDeleteOrganizationsError extends Error {
  conflictingOrgs: string[];

  constructor(conflictingOrgs: string[], message?: string) {
    super(message ?? 'User has to delete organizations before being deleted');
    this.name = 'UserHasToDeleteOrganizationsError';
    this.conflictingOrgs = conflictingOrgs;
  }
}

export async function deleteUser(userId: string, tx?: Prisma.TransactionClient): Promise<User> {
  // if no tx, start own transaction
  if (!tx) {
    return await db.$transaction(async (trx: Prisma.TransactionClient) => {
      return await deleteUser(userId, trx);
    });
  }

  const dbMutator = tx;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User doesn't exist");

  if (user.username === 'admin') {
    throw new UserFacingError('The user "admin" cannot be deleted');
  }

  const userOrganizations = await getUserOrganizationEnvironments(userId);
  const orgsWithNoNextAdmin: string[] = [];
  for (const environmentId of userOrganizations) {
    const userRoles = await getRoleMappingByUserId(userId, environmentId);

    if (!userRoles.find((role) => role.roleName === '@admin')) continue;

    const adminRole = await db.role.findFirst({
      where: { name: '@admin', environmentId: environmentId },
      include: { members: true },
    });
    if (!adminRole)
      throw new Error(`Consistency error: admin role of environment ${environmentId} not found`);

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
    throw new UserHasToDeleteOrganizationsError(orgsWithNoNextAdmin);

  if (user.isGuest) {
    await dbMutator.guestSignin.delete({ where: { userId: userId } });
  }

  await dbMutator.user.delete({ where: { id: userId } });

  return user as User;
}

export async function updateUser(
  userId: string,
  inputUser: Partial<AuthenticatedUser>,
  tx?: Prisma.TransactionClient,
) {
  const dbMutator = tx || db;
  const user = await getUserById(userId, { throwIfNotFound: true });
  const isGoingToBeGuest = inputUser.isGuest !== undefined ? inputUser.isGuest : user?.isGuest;
  let updatedUser: Prisma.UserUpdateInput;
  if (isGoingToBeGuest) {
    if (inputUser.username || inputUser.lastName || inputUser.firstName || inputUser.email) {
      throw new Error('Guest users cannot update their user data');
    }
    updatedUser = { isGuest: true };
  } else {
    const newUserData = AuthenticatedUserSchema.partial().parse(inputUser);

    if (newUserData.username && newUserData.username === 'admin') {
      throw new UserFacingError('The username is already taken');
    }

    if (!user.isGuest && user.username === 'admin' && 'username' in newUserData) {
      throw new UserFacingError('The username "admin" cannot be changed');
    }

    if (newUserData.email) {
      const existingUser = await db.user.findUnique({ where: { email: newUserData.email } });

      if (existingUser && existingUser.id !== userId)
        throw new UserFacingError('User with this email or username already exists');
    }

    if (newUserData.username) {
      const existingUser = await db.user.findUnique({ where: { username: newUserData.username } });

      if (existingUser && existingUser.id !== userId)
        throw new UserFacingError('The username is already taken');
    }

    updatedUser = { ...user, ...newUserData };
  }

  const updatedUserFromDB = await dbMutator.user.update({
    where: { id: userId },
    data: updatedUser,
  });

  return updatedUserFromDB;
}

export async function addOauthAccount(accountInput: Omit<OauthAccount, 'id'>) {
  const newAccount = OauthAccountSchema.parse(accountInput);

  const user = await getUserById(newAccount.userId);
  if (!user) throw new Error('User not found');
  if (user.isGuest) throw new Error('Guest users cannot have oauth accounts');

  const id = v4();

  const account = { ...newAccount, id };

  await db.oauthAccount.create({ data: account });

  return account;
}

export async function deleteOauthAccount(id: string) {
  await db.oauthAccount.delete({
    where: {
      id: id,
    },
  });
}
export async function getOauthAccountByProviderId(provider: string, providerAccountId: string) {
  return await db.oauthAccount.findUnique({
    where: {
      provider: provider,
      providerAccountId: providerAccountId,
    },
  });
}

export async function updateGuestUserLastSigninTime(
  userId: string,
  date: Date,
  tx?: Prisma.TransactionClient,
) {
  const dbMutator = tx || db;
  const user = await getUserById(userId, { throwIfNotFound: true });
  if (!user.isGuest) throw new Error('User is not a guest user');

  return await dbMutator.guestSignin.update({
    where: { userId: userId },
    data: { lastSigninAt: date },
  });
}

export async function deleteInactiveGuestUsers(
  inactiveTimeInMS: number,
  tx?: Prisma.TransactionClient,
): Promise<{ count: number }> {
  // if no tx, start own transaction
  if (!tx) {
    return await db.$transaction(async (trx: Prisma.TransactionClient) => {
      return await deleteInactiveGuestUsers(inactiveTimeInMS, trx);
    });
  }

  const cutoff = new Date(Date.now() - inactiveTimeInMS);
  const staleSignins = await tx.guestSignin.findMany({
    where: {
      lastSigninAt: { lt: cutoff },
    },
    select: { userId: true },
  });
  if (staleSignins.length === 0) return { count: 0 };

  const userIds = staleSignins.map((s) => s.userId);

  await tx.guestSignin.deleteMany({
    where: {
      lastSigninAt: { lt: cutoff },
    },
  });

  return await tx.user.deleteMany({
    where: {
      id: { in: userIds },
      isGuest: true,
    },
  });
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
  if (!user) throw new Error('User not found');

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
}

export async function getUserPassword(userId: string, tx?: Prisma.TransactionClient) {
  const dbMutator = tx || db;

  return await dbMutator.passwordAccount.findUnique({
    where: { userId },
  });
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

  if (!userAndPassword) return null;
  if (!userAndPassword.passwordAccount) return null;
  return userAndPassword as typeof userAndPassword & { passwordAccount: PasswordAccount };
}
