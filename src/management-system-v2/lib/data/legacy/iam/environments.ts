import { v4 } from 'uuid';
import store from '../store.js';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { addRole, deleteRole, getRoleByName, roleMetaObjects } from './roles';
import { adminPermissions } from '@/lib/authorization/permissionHelpers';
import { addRoleMappings } from './role-mappings';
import { addMember, membershipMetaObject, removeMember } from './memberships';
import {
  Environment,
  EnvironmentInput,
  UserOrganizationEnvironmentInput,
  UserOrganizationEnvironmentInputSchema,
  environmentSchema,
} from '../../environment-schema';
import { getProcessMetaObjects, removeProcess } from '../_process';
import { createFolder } from '../folders';
import { deleteLogo, getLogo, hasLogo, saveLogo } from '../fileHandling.js';
import { toCaslResource } from '@/lib/ability/caslAbility';

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

export function saveOrganizationLogo(organizationId: string, image: Buffer, ability?: Ability) {
  const organization = getEnvironmentById(organizationId, undefined, { throwOnNotFound: true });
  if (!organization.organization)
    throw new Error("You can't save a logo for a personal environment");

  if (ability && ability.can('update', 'Environment', { environmentId: organizationId }))
    throw new UnauthorizedError();

  try {
    saveLogo(organizationId, image);
  } catch (err) {
    throw new Error('Failed to store image');
  }
}

export function getOrganizationLogo(organizationId: string) {
  const organization = getEnvironmentById(organizationId, undefined, { throwOnNotFound: true });
  if (!organization.organization) throw new Error("Personal spaces don' support logos");

  try {
    return getLogo(organizationId);
  } catch (err) {
    return undefined;
  }
}

export function organizationHasLogo(organizationId: string) {
  const organization = getEnvironmentById(organizationId, undefined, { throwOnNotFound: true });
  if (!organization.organization) throw new Error("Personal spaces don' support logos");

  return hasLogo(organizationId);
}

export function deleteOrganizationLogo(organizationId: string) {
  const organization = getEnvironmentById(organizationId, undefined, { throwOnNotFound: true });
  if (!organization.organization) throw new Error("Personal spaces don' support logos");

  if (!hasLogo(organizationId)) throw new Error("Organization doesn't have a logo");

  deleteLogo(organizationId);
}

export function updateOrganization(
  environmentId: string,
  environmentInput: Partial<UserOrganizationEnvironmentInput>,
  ability?: Ability,
) {
  const environment = getEnvironmentById(environmentId, ability, { throwOnNotFound: true });

  if (
    ability &&
    !ability.can('update', toCaslResource('Environment', environment), { environmentId })
  )
    throw new UnauthorizedError();

  if (!environment.organization) throw new Error('Environment is not an organization');

  const update = UserOrganizationEnvironmentInputSchema.partial().parse(environmentInput);
  const newEnvironmentData: Environment = { ...environment, ...update };

  environmentsMetaObject[environmentId] = newEnvironmentData;
  store.update('environments', environmentId, newEnvironmentData);

  return newEnvironmentData;
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
