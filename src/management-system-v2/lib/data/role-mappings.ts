'use server';

import { getCurrentEnvironment } from '@/components/auth';
import { enableUseDB } from 'FeatureFlags';
import { RoleMappingInput } from './legacy/iam/role-mappings';
import Ability from '../ability/abilityHelper';
import { TRoleMappingsModule } from './module-import-types-temp';

let _deleteRoleMapping: TRoleMappingsModule['deleteRoleMapping'];

let _addRoleMappings: TRoleMappingsModule['addRoleMappings'];

const loadModules = async () => {
  const roleMappingModule = await (enableUseDB
    ? import('./db/iam/role-mappings')
    : import('./legacy/iam/role-mappings'));

  ({ deleteRoleMapping: _deleteRoleMapping, addRoleMappings: _addRoleMappings } =
    roleMappingModule);
};
//load modules
loadModules().catch(console.error);

export async function addRoleMappings(
  environmentId: string,
  roleMappings: Omit<RoleMappingInput, 'environmentId'>[],
) {
  await loadModules();

  const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);

  _addRoleMappings(
    roleMappings.map((roleMapping) => ({
      ...roleMapping,
      environmentId: activeEnvironment.spaceId,
    })),
    ability,
  );
}

export async function deleteRoleMappings(
  environmentId: string,
  roleMappings: { userId: string; roleId: string }[],
) {
  await loadModules();

  const errors: { roleId: string; error: Error }[] = [];

  const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);

  for (const { userId, roleId } of roleMappings) {
    try {
      _deleteRoleMapping(userId, roleId, activeEnvironment.spaceId, ability);
    } catch (error) {
      errors.push({ roleId, error: error as Error });
    }
  }

  return errors;
}
