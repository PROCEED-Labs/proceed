import { v4 } from 'uuid';
import {
  User,
  UserSchema,
  OauthAccountSchema,
  OauthAccount,
  AuthenticatedUser,
  AuthenticatedUserSchema,
} from '../../user-schema';
import { addEnvironment, deleteEnvironment } from './environments';
import { OptionalKeys } from '@/lib/typescript-utils.js';
import { getUserOrganizationEnvironments, removeMember } from './memberships';
import { getRoleMappingByUserId } from './role-mappings';
import { addSystemAdmin, getSystemAdmins } from './system-admins';
import db from '@/lib/data/db';
import { Prisma } from '@prisma/client';
import { UserFacingError } from '@/lib/user-error';

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

export async function getUserById(id: string, opts?: { throwIfNotFound?: boolean }) {
  const user = await db.user.findUnique({ where: { id: id } });

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

export async function addUser(inputUser: OptionalKeys<User, 'id'>) {
  const user = UserSchema.parse(inputUser);

  if (
    !user.isGuest &&
    ((user.username && (await getUserByUsername(user.username))) ||
      (user.email && (await getUserByEmail(user.email!))))
  )
    throw new Error('User with this email or username already exists');

  if (!user.id) user.id = v4();

  try {
    const userExists = await db.user.findUnique({ where: { id: user.id } });
    if (userExists) throw new Error('User already exists');
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.user.create({
        data: {
          ...user,
          isGuest: user.isGuest,
        },
      });
      await addEnvironment({ ownerId: user.id!, isOrganization: false }, undefined, tx);
      if ((await getSystemAdmins()).length === 0 && !user.isGuest)
        await addSystemAdmin(
          {
            role: 'admin',
            userId: user.id!,
          },
          tx,
        );
    });
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

    if (orgsWithNoNextAdmin.length > 0)
      throw new UserHasToDeleteOrganizationsError(orgsWithNoNextAdmin);
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
