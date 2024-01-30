import Ability from '@/lib/ability/abilityHelper';
import { ResourceActionType } from '@/lib/ability/caslAbility';
import { ApiData } from '@/lib/fetch-data';

type Role = ApiData<'/roles', 'get'>[number];

// permission mapping to verbs
const PERMISSION_MAPPING = {
  none: 0,
  view: 1,
  update: 2,
  create: 4,
  delete: 8,
  manage: 16,
  share: 32,
  'manage-roles': 64,
  'manage-groups': 128,
  'manage-password': 256,
  admin: 9007199254740991,
} as const;

export function togglePermission(
  permissions: Role['permissions'],
  resource: keyof Role['permissions'],
  permission: keyof typeof PERMISSION_MAPPING,
) {
  const currentValue = permissions[resource] ?? 0;

  if (permission !== 'admin') {
    const permissionBit = PERMISSION_MAPPING[permission];
    permissions[resource] = currentValue ^ permissionBit;
  } else {
    permissions[resource] =
      currentValue === PERMISSION_MAPPING.admin ? 0 : PERMISSION_MAPPING.admin;
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

  if (action === 'admin') return permissionNumber === PERMISSION_MAPPING.admin;
  else if (permissionNumber === PERMISSION_MAPPING.admin) return false;

  return !!(PERMISSION_MAPPING[action] & permissionNumber);
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
  if (permissionNumber === PERMISSION_MAPPING.admin && action !== 'admin') return true;

  return false;
}
