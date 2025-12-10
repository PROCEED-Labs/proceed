import { z } from 'zod';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { getEnvironmentById } from './environments';
import { v4 } from 'uuid';
import { ActiveOrganizationEnvironment, Environment } from '../../environment-schema.js';
import db from '@/lib/data/db';
import { Prisma } from '@prisma/client';
import { UserHasToDeleteOrganizationsError } from './users';

const MembershipInputSchema = z.object({
  userId: z.string(),
  environmentId: z.string(),
});

type MembershipInput = z.infer<typeof MembershipInputSchema>;

export type Membership = MembershipInput & {
  id: string;
  createdOn: string;
};

function isOrganization(environment: Environment, opts: { throwIfNotFound?: boolean } = {}) {
  if (!environment)
    if (opts.throwIfNotFound) throw new Error('Environment not found');
    else return false;

  if (!environment.isOrganization)
    if (opts.throwIfNotFound)
      throw new Error("Environment isn't  an organization, it can't have members");
    else return false;

  return true;
}

export async function getUserOrganizationEnvironments(userId: string) {
  return (
    await db.space.findMany({
      where: {
        isOrganization: true,
        //ownerId: userId,
        members: {
          some: {
            userId: userId,
          },
        },
      },
      select: {
        id: true,
      },
    })
  ).map((workspace) => workspace.id);
}

export async function getMembers(environmentId: string, ability?: Ability) {
  //TODO: ability check
  if (ability) ability;

  const workspace = await db.space.findUnique({
    where: {
      id: environmentId,
      isOrganization: true,
    },
    include: {
      members: true,
    },
  });
  if (!workspace) throw new Error('Environment not found');
  return workspace.members;
}

export async function getFullMembersWithRoles(environmentId: string, ability?: Ability) {
  if (ability && !ability.can('admin', 'User')) throw new UnauthorizedError();

  const usersWithRoles = await db.user.findMany({
    where: {
      memberIn: {
        some: {
          environmentId: environmentId,
        },
      },
    },
    include: {
      roleMembers: {
        where: {
          role: {
            environmentId: environmentId,
          },
        },
        include: {
          role: true,
        },
      },
    },
  });

  for (const _user of usersWithRoles) {
    const user = _user as any;
    user.roles = _user.roleMembers.map((roleMember) => roleMember.role);
    delete user.roleMembers;
  }

  type User = (typeof usersWithRoles)[number];
  type TransformedUserType = Omit<User, 'roleMembers' | 'isGuest'> & {
    roles: User['roleMembers'][number]['role'][];
    isGuest: false;
  };
  return usersWithRoles as unknown as TransformedUserType[];
}

/**
 * Returns the users that exist in a specific space
 */
export async function getUsersInSpace(spaceId: string, ability?: Ability) {
  //TODO: ability check
  if (ability) ability;

  const users = await db.user.findMany({
    where: {
      memberIn: {
        some: {
          space: {
            id: spaceId,
          },
        },
      },
    },
  });

  return users;
}

export async function isMember(
  environmentId: string,
  userId: string,
  tx?: Prisma.TransactionClient,
) {
  const dbMutator = tx || db;

  const environment = await getEnvironmentById(environmentId, undefined, undefined, tx);
  if (!environment?.isOrganization) {
    return userId === environmentId;
  }
  const membership = await dbMutator.membership.findFirst({
    where: {
      environmentId: environmentId,
      userId: userId,
    },
  });
  return membership ? true : false;
}

export async function addMember(
  environmentId: string,
  userId: string,
  ability?: Ability,
  tx?: Prisma.TransactionClient,
) {
  const dbMutator = tx ? tx : db;
  // const environment = await db.space.findUnique({
  //   where: { id: environmentId },
  //   select: { isOrganization: true },
  // });

  // if (!environment) {
  //   throw new Error('Environment not found');
  // }

  // TODO: ability check
  if (ability) ability;

  const user = await dbMutator.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new Error('User not found');
  if (user.isGuest) throw new Error('Guest users cannot be added to environments');

  await dbMutator.membership.create({
    data: {
      id: v4(),
      userId: userId,
      environmentId: environmentId,
      createdOn: new Date().toISOString(),
    },
  });
}

export async function removeMember(
  environmentId: string,
  userId: string,
  ability?: Ability,
  _tx?: Prisma.TransactionClient,
): Promise<void> {
  if (!_tx) {
    return db.$transaction(async (tx) => {
      await removeMember(environmentId, userId, ability, tx);
    });
  }

  const tx = _tx!;

  const environment = await tx.space.findUnique({
    where: { id: environmentId },
    select: { isOrganization: true, isActive: true },
  });

  if (!environment) {
    throw new Error('Environment not found');
  }
  const organization = environment as ActiveOrganizationEnvironment;

  // TODO: ability check
  if (ability) ability;

  const memberExists = await isMember(environmentId, userId, tx);
  if (!memberExists) {
    throw new Error('User is not a member of this environment');
  }

  const adminRole = await tx.role.findFirst({
    where: {
      environmentId,
      name: '@admin',
    },
    include: {
      members: {
        select: {
          userId: true,
        },
      },
    },
  });
  if (!adminRole)
    throw new Error(`Consistency error: admin role of environment ${environmentId} not found`);

  if (adminRole.members.find((role) => role.userId === userId)) {
    if (adminRole.members.length === 1) {
      throw new UserHasToDeleteOrganizationsError([environmentId]);
    }

    if (organization.ownerId === userId) {
      // make the next admin the owner of the organization
      await tx.space.update({
        where: { id: environmentId },
        data: { ownerId: adminRole.members.find((member) => member.userId !== userId)!.userId },
      });
    }
  }

  await tx.membership.deleteMany({
    where: {
      environmentId: environmentId,
      userId: userId,
    },
  });
}
