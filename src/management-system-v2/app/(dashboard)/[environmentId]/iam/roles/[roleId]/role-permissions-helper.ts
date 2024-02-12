import Ability from '@/lib/ability/abilityHelper';
import { ResourceActionType } from '@/lib/ability/caslAbility';
import { ResourceActionsMapping } from '@/lib/authorization/permissionHelpers';
import { Role } from '@/lib/data/role-schema';

// permission mapping to verbs
export function togglePermission(
  permissions: Role['permissions'],
  resource: keyof Role['permissions'],
  permission: keyof typeof ResourceActionsMapping,
) {
  const currentValue = permissions[resource] ?? 0;

  if (permission !== 'admin') {
    const permissionBit = ResourceActionsMapping[permission];
    permissions[resource] = currentValue ^ permissionBit;
  } else {
    permissions[resource] =
      currentValue === ResourceActionsMapping.admin ? 0 : ResourceActionsMapping.admin;
  }

  // New pointer for role object to trigger a rerender
  return { ...permissions };
}

export function switchChecked(
  permissions: Role['permissions'] | undefined,
  resource: keyof Role['permissions'],
  action: ResourceActionType,
) {
  if (!(permissions !== undefined && typeof permissions === 'object' && resource in permissions))
    return false;

  const permissionNumber = permissions[resource]!;

  if (action === 'admin') return permissionNumber === ResourceActionsMapping.admin;
  else if (permissionNumber === ResourceActionsMapping.admin) return false;

  return !!(ResourceActionsMapping[action] & permissionNumber);
}

export function switchDisabled(
  permissions: Role['permissions'] | undefined,
  resource: keyof Role['permissions'],
  action: ResourceActionType,
  ability: Ability,
) {
  if (action === 'admin' && !ability.can('admin', resource)) return true;

  if (!(permissions !== undefined && typeof permissions === 'object' && resource in permissions))
    return false;

  const permissionNumber = permissions[resource]!;
  if (permissionNumber === ResourceActionsMapping.admin && action !== 'admin') return true;

  return false;
}
