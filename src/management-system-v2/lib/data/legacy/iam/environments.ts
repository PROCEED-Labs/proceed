import { v4 } from 'uuid';
import store from '../store.js';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { addRole, deleteRole, getRoleByName, roleMetaObjects } from './roles';
import { adminPermissions } from '@/lib/authorization/permissionHelpers';
import { addRoleMappings } from './role-mappings';
import { addMember, membershipMetaObject, removeMember } from './memberships';
import { Environment, EnvironmentInput, environmentSchema } from '../../environment-schema';
import { getProcessMetaObjects, removeProcess } from '../_process';
import { createFolder } from '../folders';

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

export function getEnvironmentById(
  id: string,
  ability?: Ability,
  opts?: { throwOnNotFound?: boolean },
) {
  // TODO: check ability
  const environment = environmentsMetaObject[id];

  if (!environment && opts && opts.throwOnNotFound) throw new Error('Environment not found');

  return environment;
}

/** Sets an environment to active, and adds the given user as an admin */
export function activateEnvrionment(environmentId: string, userId: string) {
  const environment = environmentsMetaObject[environmentId];
  if (!environment) throw new Error("Environment doesn't exist");
  if (!environment.organization) throw new Error('Environment is a personal environment');
  if (environment.active) throw new Error('Environment is already active');

  const adminRole = getRoleByName(environmentId, '@admin');
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

export function addEnvironment(environmentInput: EnvironmentInput, ability?: Ability) {
  const newEnvironment = environmentSchema.parse(environmentInput);

  const id = newEnvironment.organization ? v4() : newEnvironment.ownerId;

  if (environmentsMetaObject[id]) throw new Error('Environment id already exists');

  const newEnvironmentWithId = { ...newEnvironment, id };
  environmentsMetaObject[id] = newEnvironmentWithId;
  store.add('environments', newEnvironmentWithId);

  if (newEnvironment.organization) {
    const adminRole = addRole({
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

    if (newEnvironment.active) {
      addMember(id, newEnvironment.ownerId);

      addRoleMappings([
        {
          environmentId: id,
          roleId: adminRole.id,
          userId: newEnvironment.ownerId,
        },
      ]);
    }
  }

  // add root folder
  createFolder({
    environmentId: id,
    name: '',
    parentId: null,
    createdBy: null,
  });

  return newEnvironmentWithId;
}

export function deleteEnvironment(environmentId: string, ability?: Ability) {
  const environment = environmentsMetaObject[environmentId];
  if (!environment) throw new Error('Environment not found');

  if (ability && !ability.can('delete', 'Environment')) throw new UnauthorizedError();

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

  if (environment.organization) {
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

/**
 * initializes the environments meta information objects
 */
export function init() {
  if (!firstInit) return;

  const storedEnvironemnts = store.get('environments') as any[];

  // set roles store cache for quick access
  storedEnvironemnts.forEach(
    (environments) => (environmentsMetaObject[environments.id] = environments),
  );
}
init();
