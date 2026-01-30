import { ok, err } from 'neverthrow';
import { v4 } from 'uuid';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { addRole, getRoleByName } from './roles';
import { adminPermissions } from '@/lib/authorization/permissionHelpers';
import { addRoleMappings } from './role-mappings';
import { addMember } from './memberships';
import {
  Environment,
  EnvironmentInput,
  UserOrganizationEnvironmentInput,
  UserOrganizationEnvironmentInputSchema,
  environmentSchema,
} from '../../environment-schema';
import { createFolder } from '../folders';
import { toCaslResource } from '@/lib/ability/caslAbility';
import db from '@/lib/data/db';
import { Prisma } from '@prisma/client';
import { env } from '@/lib/ms-config/env-vars';
import { ensureTransactionWrapper } from '../util';

export async function getEnvironments() {
  //TODO : Ability check

  const environments = await db.space.findMany({});
  return ok(environments);
}
export async function getEnvironmentById(
  id: string,
  ability?: Ability,
  opts?: { throwOnNotFound?: boolean },
  tx?: Prisma.TransactionClient,
) {
  const dbMutator = tx || db;

  // TODO: check ability
  let environment = await dbMutator.space.findUnique({
    where: {
      id: id,
    },
  });

  if (!env.PROCEED_PUBLIC_IAM_PERSONAL_SPACES_ACTIVE && !environment?.isOrganization)
    environment = null;

  if (!environment && opts && opts.throwOnNotFound) return err(new Error('Environment not found'));

  return ok(environment as Environment);
}

/** Sets an environment to active, and adds the given user as an admin */
export async function activateEnvrionment(environmentId: string, userId: string) {
  const environmentResult = await getEnvironmentById(environmentId);
  if (environmentResult.isErr()) {
    return environmentResult;
  }
  const environment = environmentResult.value;

  if (!environment) return err(new Error("Environment doesn't exist"));
  if (!environment.isOrganization) return err(new Error('Environment is a personal environment'));
  if (environment.isActive) return err(new Error('Environment is already active'));

  const adminRole = await getRoleByName(environmentId, '@admin');
  if (adminRole.isErr()) {
    return adminRole;
  }
  if (!adminRole.value) {
    return err(new Error(`Consistency error: admin role of ${environmentId} not found`));
  }

  await db.$transaction(async (tx) => {
    await tx.space.update({
      where: { id: environmentId },
      data: { isActive: true },
    });

    await addMember(environmentId, userId, undefined, tx);

    await addRoleMappings(
      [
        {
          environmentId,
          roleId: adminRole.value.id,
          userId,
        },
      ],
      undefined,
      tx,
    );
  });
}

export const addEnvironment = ensureTransactionWrapper(_addEnvironment, 2);
async function _addEnvironment(
  environmentInput: EnvironmentInput,
  ability?: Ability,
  _tx?: Prisma.TransactionClient,
) {
  const tx = _tx!;

  const parseResult = environmentSchema.safeParse(environmentInput);
  if (!parseResult.success) {
    return err(parseResult.error);
  }
  const newEnvironment = parseResult.data;

  const id = newEnvironment.isOrganization ? newEnvironment.id ?? v4() : newEnvironment.ownerId;

  const existingEnvironment = await getEnvironmentById(id);
  if (existingEnvironment.isErr()) {
    return existingEnvironment;
  }
  if (existingEnvironment.value) {
    return err(new Error('Environment id already exists'));
  }

  const newEnvironmentWithId = { ...newEnvironment, id };
  await tx.space.create({ data: { ...newEnvironmentWithId } });

  if (newEnvironment.isOrganization) {
    const adminRole = await addRole(
      {
        environmentId: id,
        name: '@admin',
        default: true,
        permissions: { All: adminPermissions },
      },
      undefined,
      tx,
    );
    if (adminRole.isErr()) return adminRole;

    const guestRole = await addRole(
      {
        environmentId: id,
        name: '@guest',
        default: true,
        permissions: {},
      },
      undefined,
      tx,
    );
    if (guestRole.isErr()) return guestRole;

    const everyoneRole = await addRole(
      {
        environmentId: id,
        name: '@everyone',
        default: true,
        permissions: {},
      },
      undefined,
      tx,
    );
    if (everyoneRole.isErr()) return everyoneRole;

    if (newEnvironment.isActive) {
      const ownerAdded = await addMember(id, newEnvironment.ownerId, undefined, tx);
      if (ownerAdded?.isErr()) return ownerAdded;

      const adminRoleMapping = await addRoleMappings(
        [
          {
            environmentId: id,
            roleId: adminRole.value.id,
            userId: newEnvironment.ownerId,
          },
        ],
        undefined,
        tx,
      );
      if (adminRoleMapping?.isErr()) return adminRoleMapping;
    }
  }

  // add root folder
  const rootFolder = await createFolder(
    {
      environmentId: id,
      name: '',
      parentId: null,
      createdBy: null,
    },
    undefined,
    tx,
  );
  if (rootFolder.isErr()) return rootFolder;

  return ok(newEnvironmentWithId);
}

export async function deleteEnvironment(environmentId: string, ability?: Ability) {
  const environment = await getEnvironmentById(environmentId);
  if (environment.isErr() || !environment.value) return err(new Error('Environment not found'));

  if (env.PROCEED_PUBLIC_IAM_ONLY_ONE_ORGANIZATIONAL_SPACE && environment.value.isOrganization) {
    return err(
      new Error(
        'Organizations cannot be deleted when PROCEED_PUBLIC_IAM_ONLY_ONE_ORGANIZATIONAL_SPACE is true',
      ),
    );
  }

  if (ability && !ability.can('delete', 'Environment')) return err(new UnauthorizedError());

  await db.space.delete({
    where: { id: environmentId },
  });

  return ok();
}

//TODO organisation logo in db logic

export async function updateOrganization(
  environmentId: string,
  environmentInput: Partial<UserOrganizationEnvironmentInput>,
  ability?: Ability,
) {
  const environment = await getEnvironmentById(environmentId, ability, { throwOnNotFound: true });
  if (environment.isErr()) {
    return environment;
  }
  if (!environment.value) {
    return err(new Error('Environment not found'));
  }

  if (
    ability &&
    !ability.can('update', toCaslResource('Environment', environment), { environmentId })
  )
    return err(new UnauthorizedError());

  if (!environment.value.isOrganization)
    return err(new Error('Environment is not an organization'));

  const updateParseResult =
    UserOrganizationEnvironmentInputSchema.partial().safeParse(environmentInput);
  if (!updateParseResult.success) {
    return err(updateParseResult.error);
  }

  const newEnvironmentData: Environment = {
    ...environment.value,
    ...updateParseResult.data,
  } as Environment;

  await db.space.update({ where: { id: environment.value.id }, data: { ...newEnvironmentData } });

  return ok(newEnvironmentData);
}

// TODO below: implement db logic

export async function saveSpaceLogo(organizationId: string, image: Buffer, ability?: Ability) {
  const organization = await getEnvironmentById(organizationId, undefined, {
    throwOnNotFound: true,
  });
  if (organization.isErr()) {
    return organization;
  }
  if (!organization.value?.isOrganization)
    return err(new Error("You can't save a logo for a personal environment"));

  if (ability && ability.can('update', 'Environment', { environmentId: organizationId }))
    return err(new UnauthorizedError());

  try {
    //saveLogo(organizationId, image);
  } catch (error) {
    return err(new Error('Failed to store image'));
  }
}

export async function getSpaceLogo(organizationId: string) {
  try {
    return ok(
      await db.space.findUnique({
        where: { id: organizationId },
        select: { spaceLogo: true },
      }),
    );
  } catch (error) {
    return err(error);
  }
}

export async function spaceHasLogo(organizationId: string) {
  const res = await db.space.findUnique({
    where: { id: organizationId },
    select: { spaceLogo: true },
  });
  if (res?.spaceLogo) {
    return ok(true);
  }

  return ok(false);
}

export async function deleteSpaceLogo(organizationId: string) {
  await getEnvironmentById(organizationId, undefined, {
    throwOnNotFound: true,
  });

  //if (!hasLogo(organizationId)) throw new Error("Organization doesn't have a logo");

  //deleteLogo(organizationId);
}
