import { v4 } from 'uuid';
import store from '../store.js';
import Ability from '@/lib/ability/abilityHelper';
import { addRole, deleteRole, roleMetaObjects } from './roles';
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

export function getEnvironments(ability: Ability) {
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

export function addEnvironment(environmentInput: EnvironmentInput, ability?: Ability) {
  const newEnvironment = environmentSchema.parse(environmentInput);

  const id = newEnvironment.organization ? v4() : newEnvironment.ownerId;

  if (environmentsMetaObject[id]) throw new Error('Environment id already exists');

  const newEnvironmentWithId = { ...newEnvironment, id };
  environmentsMetaObject[id] = newEnvironmentWithId;
  store.add('environments', newEnvironmentWithId);

  if (newEnvironment.organization) {
    addMember(id, newEnvironment.ownerId);

    const adminRole = addRole({
      environmentId: id,
      name: '@admin',
      default: true,
      permissions: { All: adminPermissions },
    });
    addRoleMappings([
      {
        environmentId: id,
        roleId: adminRole.id,
        userId: newEnvironment.ownerId,
      },
    ]);
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
  }

  // add root folder
  createFolder({
    environmentId: id,
    name: '',
    parentId: null,
    createdBy: newEnvironment.ownerId,
  });

  return newEnvironmentWithId;
}

export function deleteEnvironment(environmentId: string, ability?: Ability) {
  const environment = environmentsMetaObject[environmentId];
  if (!environment) throw new Error('Environment not found');

  // TODO check ability, maybe people other than the owner can delete the environment

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
