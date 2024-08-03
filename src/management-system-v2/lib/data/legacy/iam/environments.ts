import { v4 } from 'uuid';
import store from '../store.js';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { addRole, deleteRole, getRoleByName, getRoles, roleMetaObjects } from './roles';
import { adminPermissions } from '@/lib/authorization/permissionHelpers';
import { addRoleMappings } from './role-mappings';
import { addMember, getMemebers, membershipMetaObject, removeMember } from './memberships';
import { Environment, EnvironmentInput, environmentSchema } from '../../environment-schema';
import { getProcessMetaObjects, removeProcess } from '../_process';
import { createFolder } from '../folders';
import { enableUseDB } from 'FeatureFlags';
import db from '@/lib/data';

// @ts-ignore
let firstInit = !global.environmentMetaObject;

export let environmentsMetaObject: { [Id: string]: Environment } =
  // @ts-ignore
  global.environmentsMetaObject || (global.environmentsMetaObject = {});

export function getEnvironments(ability?: Ability) {
  const environments = Object.values(environmentsMetaObject);

  //TODO: filter environments by ability
  return environments;
}

export async function getEnvironmentById(
  id: string,
  ability?: Ability,
  opts?: { throwOnNotFound?: boolean },
) {
  // TODO: check ability
  if (enableUseDB) {
    const environment = await db.space.findUnique({
      where: {
        id: id,
      },
    });

    if (!environment && opts && opts.throwOnNotFound) throw new Error('Environment not found');

    return environment;
  }
  const environment = environmentsMetaObject[id];

  if (!environment && opts && opts.throwOnNotFound) throw new Error('Environment not found');

  return environment;
}

/** Sets an environment to active, and adds the given user as an admin */
export async function activateEnvrionment(environmentId: string, userId: string) {
  const environment = await getEnvironmentById(environmentId);
  if (!environment) throw new Error("Environment doesn't exist");
  if (!environment.isOrganization) throw new Error('Environment is a personal environment');
  if (environment.isActive) throw new Error('Environment is already active');

  const adminRole = await getRoleByName(environmentId, '@admin');
  if (!adminRole) throw new Error(`Consistency error: admin role of ${environmentId} not found`);

  addMember(environmentId, userId);

  addRoleMappings([
    {
      environmentId,
      roleId: adminRole.id,
      userId,
    },
  ]);
}

export async function addEnvironment(environmentInput: EnvironmentInput, ability?: Ability) {
  const newEnvironment = environmentSchema.parse(environmentInput);
  const id = newEnvironment.isOrganization ? v4() : newEnvironment.ownerId;

  if (await getEnvironmentById(id)) throw new Error('Environment id already exists');

  const newEnvironmentWithId = { ...newEnvironment, id };
  if (enableUseDB) {
    await db.space.create({ data: { ...newEnvironmentWithId } });
  } else {
    environmentsMetaObject[id] = newEnvironmentWithId;
    store.add('environments', newEnvironmentWithId);
  }

  if (newEnvironment.isOrganization) {
    const adminRole = await addRole({
      environmentId: id,
      name: '@admin',
      default: true,
      permissions: { All: adminPermissions },
    });
    addRole({
      environmentId: id,
      name: '@guest',
      default: true,
      permissions: {},
    });
    addRole({
      environmentId: id,
      name: '@everyone',
      default: true,
      permissions: {},
    });

    if (newEnvironment.isActive) {
      await addMember(id, newEnvironment.ownerId);

      await addRoleMappings([
        {
          environmentId: id,
          roleId: adminRole.id,
          userId: newEnvironment.ownerId,
        },
      ]);
    }
  }

  // add root folder
  await createFolder({
    environmentId: id,
    name: '',
    parentId: null,
    createdBy: null,
  });

  return newEnvironmentWithId;
}

export async function deleteEnvironment(environmentId: string, ability?: Ability) {
  const environment = await getEnvironmentById(environmentId);
  if (!environment) throw new Error('Environment not found');

  if (ability && !ability.can('delete', 'Environment')) throw new UnauthorizedError();
  if (enableUseDB) {
    await db.space.delete({
      where: { id: environmentId },
    });
  } else {
    const roles = Object.values(roleMetaObjects);
    for (const role of roles) {
      if (role.environmentId === environmentId) {
        deleteRole(role.id); // also deletes role mappings
      }
    }

    const processes = Object.values(getProcessMetaObjects());
    for (const process of processes) {
      if (process.environmentId === environmentId) {
        removeProcess(process.id);
      }
    }

    if (environment.isOrganization) {
      const environmentMemberships = membershipMetaObject[environmentId];
      if (environmentMemberships) {
        for (const { userId } of environmentMemberships) {
          removeMember(environmentId, userId);
        }
        delete membershipMetaObject[environmentId];
      }
    }

    delete environmentsMetaObject[environmentId];
    store.remove('environments', environmentId);
  }
}

let inited = false;
/**
 * initializes the environments meta information objects
 */
export function init() {
  if (!firstInit || inited) return;
  inited = true;

  const storedEnvironemnts = store.get('environments') as any[];

  // set roles store cache for quick access
  storedEnvironemnts.forEach(
    (environments) => (environmentsMetaObject[environments.id] = environments),
  );
}
init();
