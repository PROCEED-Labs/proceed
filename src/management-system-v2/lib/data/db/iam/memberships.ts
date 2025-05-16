import { z } from 'zod';
import Ability from '@/lib/ability/abilityHelper';
import { getEnvironmentById } from './environments';
import { v4 } from 'uuid';
import { Environment } from '../../environment-schema.js';
import db from '@/lib/data/db';
import { Prisma } from '@prisma/client';

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

export async function removeMember(environmentId: string, userId: string, ability?: Ability) {
  const environment = await db.space.findUnique({
    where: { id: environmentId },
    select: { isOrganization: true },
  });

  if (!environment) {
    throw new Error('Environment not found');
  }

  // TODO: ability check
  if (ability) ability;

  const memberExists = await isMember(environmentId, userId);
  if (!memberExists) {
    throw new Error('User is not a member of this environment');
  }

  await db.membership.deleteMany({
    where: {
      environmentId: environmentId,
      userId: userId,
    },
  });
}
