import Ability from '@/lib/ability/abilityHelper';
import { ResourceActionType } from '@/lib/ability/caslAbility';
import { ResourceActionsMapping } from '@/lib/authorization/permissionHelpers';
import { Role } from '@/lib/data/role-schema';

// permission mapping to verbs
export function togglePermission(
  permissions: Role['permissions'],
  resources: keyof Role['permissions'] | (keyof Role['permissions'])[],
  permission: keyof typeof ResourceActionsMapping,
) {
  for (const resource of typeof resources === 'string' ? [resources] : resources) {
    const currentValue = permissions[resource] ?? 0;

    if (permission !== 'admin') {
      const permissionBit = ResourceActionsMapping[permission];
      permissions[resource] = currentValue ^ permissionBit;
    } else {
      permissions[resource] =
        currentValue === ResourceActionsMapping.admin ? 0 : ResourceActionsMapping.admin;
    }
  }

  // New pointer for role object to trigger a rerender
  return { ...permissions };
}

export function switchChecked(
  permissions: Role['permissions'] | undefined,
  resources: keyof Role['permissions'] | (keyof Role['permissions'])[],
  action: ResourceActionType,
) {
  if (!permissions) return false;

  const resourceInPermissions =
    typeof resources === 'string'
      ? resources in permissions
      : resources.every((res) => res in permissions);
  if (!resourceInPermissions) return false;

  for (const resource of typeof resources === 'string' ? [resources] : resources) {
    const permissionNumber = permissions[resource]!;

    if (action === 'admin' && permissionNumber !== ResourceActionsMapping.admin) return false;
    // disable all other actions if admin is checked
    else if (permissionNumber === ResourceActionsMapping.admin) return false;

    // bit check
    if (!(ResourceActionsMapping[action] & permissionNumber)) return false;
  }

  return true;
}

export function switchDisabled(
  permissions: Role['permissions'] | undefined,
  resources: keyof Role['permissions'] | (keyof Role['permissions'])[],
  action: ResourceActionType,
  ability: Ability,
) {
  if (action === 'admin' && !ability.can('admin', resources)) return true;

  if (!permissions) return false;

  const resourceInPermissions =
    typeof resources === 'string'
      ? resources in permissions
      : resources.every((res) => res in permissions);
  if (!resourceInPermissions) return false;

  for (const resource of typeof resources === 'string' ? [resources] : resources) {
    const permissionNumber = permissions[resource]!;
    if (permissionNumber === ResourceActionsMapping.admin && action !== 'admin') return true;
  }

  return false;
}
