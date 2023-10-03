import { subject } from '@casl/ability-v6';
import { SHARE_TYPE, sharedWitOrByhUser } from './shares';
import { packRules } from '@casl/ability-v6/extra';
import {
  AbilityRule,
  CaslAbility,
  ResourceActionType,
  ResourceType,
  buildAbility,
  resources,
} from '../../../../../../management-system-v2/lib/ability/caslAbility';
import { getAppliedRolesForUser } from './rolesHelper';
import { adminPermissions, permissionNumberToIdentifiers } from './permissionHelpers';

const needOwnership = new Set<ResourceType>(['Process', 'Project', 'Template']);
const sharedResources = new Set<ResourceType>(['Process', 'Project', 'Template']);

const globalRoles = {
  everybodyRole: '',
  guestRole: '',
};

export function setGlobalRolesForAuthorization(roles: typeof globalRoles) {
  globalRoles.everybodyRole = roles.everybodyRole;
  globalRoles.guestRole = roles.guestRole;
}

export function adminRules() {
  return packRules([{ subject: 'All', action: 'admin' }] as AbilityRule[]);
}

function rulesForAuthenticatedUsers(userId: string): AbilityRule[] {
  return [
    {
      subject: 'Role',
      action: 'view',
    },
    {
      subject: 'User',
      action: 'view',
    },
    {
      subject: 'User',
      action: ['delete'],
      conditions: {
        conditions: {
          id: { $eq: userId },
        },
      },
    },
    {
      subject: 'User',
      action: ['update'],
      conditions: {
        conditions: {
          id: { $eq: userId },
        },
      },
      fields: ['email', 'name', 'picture', 'username', 'lastName', 'firstName', 'password'],
    },
    {
      subject: 'RoleMapping',
      action: 'view',
      conditions: {
        conditions: {
          userId: { $eq: userId },
        },
      },
    },
    {
      inverted: true,
      subject: 'Role',
      action: 'update',
      conditions: {
        conditions: {
          default: { $eq: true },
        },
      },
      fields: ['default', 'name'],
    },
    {
      inverted: true,
      subject: 'RoleMapping',
      action: 'create',
      conditions: {
        conditions: {
          roleId: {
            $in: [globalRoles.everybodyRole, globalRoles.guestRole],
          },
        },
      },
    },
    {
      subject: 'Share',
      action: 'view',
      conditions: {
        conditions: {
          resourceOwner: { $eq: userId },
          expiredAt: { $not_expired_property: null },
        },
        conditionsOperator: 'and',
      },
    },
    {
      inverted: true,
      subject: 'Share',
      action: 'create',
      conditions: {
        conditions: {
          sharedBy: { $property_eq: 'sharedWith' },
        },
      },
    },
  ];
}

function rulesForRoles(ability: CaslAbility) {
  const rules: AbilityRule[] = [];

  if (ability.cannot('admin', 'All')) {
    rules.push({
      inverted: true,
      subject: 'Role',
      action: 'update',
      conditions: {
        conditions: {
          default: { $eq: true },
        },
      },
      fields: ['default', 'name', 'expiration '],
    });

    // can't add admin permissions to a role of a resource of which you're not an admin yourself

    // missing check when updating -> new permission can't be one we don't have
    for (const resource of resources) {
      if (!ability.can('admin', resource)) {
        rules.push({
          inverted: true,
          subject: 'Role',
          action: ['manage'],
          conditions: {
            conditions: {
              [`permissions.${resource}`]: { $gte: adminPermissions },
            },
          },
        });
      }
    }
  }

  return rules;
}

async function rulesForSharedResources(ability: CaslAbility, userId: string) {
  const rules: AbilityRule[] = [];

  // we have to check permissions before allowing access through shares
  // since shares also depend on permissions granted by roles
  for (const share of await sharedWitOrByhUser(userId)) {
    const sharePermissions = permissionNumberToIdentifiers(share.permissions);

    if (sharePermissions.includes('share') && ability.can('share', share.resourceType)) {
      rules.push({
        subject: 'Share',
        action: ['view', 'create', 'update', 'delete'],
        conditions: {
          conditions: {
            resourceId: { $eq: share.resourceId },
            sharedBy: { $eq: userId },
            expiredAt: { $not_expired_property: null },
          },
        },
      });
    }

    rules.push({
      subject: 'Share',
      action: 'view',
      conditions: {
        conditions: {
          resourceId: { $eq: share.resourceId },
          type: { $eq: SHARE_TYPE['USER_TO_USER'] },
          expiredAt: { $not_expired_property: null },
        },
      },
    });

    rules.push({
      subject: 'Share',
      action: 'view',
      conditions: {
        conditions: {
          resourceId: { $eq: share.resourceId },
          type: { $eq: SHARE_TYPE['LINK_SHARING'] },
          sharedBy: { $eq: userId },
          expiredAt: { $not_expired_property: null },
        },
      },
    });

    // address each permission of the share sepparetly
    for (const permission of sharePermissions) {
      if (ability.can(permission, share.resourceType)) {
        rules.push({
          subject: share.resourceType,
          action: sharePermissions,
          conditions: {
            conditions: {
              id: { $eq: share.resourceId },
              $: { $not_expired_value: share.expiredAt },
            },
          },
        });
      }
    }
  }

  return rules;
}

function rulesForShares(resource: ResourceType, userId: string, expiration: string | null) {
  const rules: AbilityRule[] = [];

  // owner of the share
  rules.push({
    subject: 'Share',
    action: ['view', 'update', 'delete', 'create'],
    conditions: {
      conditions: {
        resourceOwner: { $eq: userId },
        resourceType: { $eq_string_case_insensitive: resource },
        $: { $not_expired_value: expiration },
      },
      conditionsOperator: 'and',
    },
  });

  rules.push({
    subject: 'Share',
    action: ['view', 'update', 'delete', 'create'],
    conditions: {
      conditions: {
        sharedBy: { $eq: userId },
        resourceType: { $eq_string_case_insensitive: resource },
        $: { $not_expired_value: expiration },
      },
      conditionsOperator: 'and',
    },
  });

  return rules;
}

function rulesForAlteringShares(ability: CaslAbility) {
  const rules: AbilityRule[] = [];

  for (const resource of sharedResources.values()) {
    if (ability.can('admin', resource)) continue;

    rules.push({
      inverted: true,
      subject: resource,
      action: ['create', 'delete', 'update'],
      conditions: {
        conditions: {
          resourceType: { $eq_string_case_insensitive: resource },
          permissions: { $gte: adminPermissions },
        },
      },
    });
  }

  return rules;
}

type ReturnOfPromise<Fn> = Fn extends (...args: any) => Promise<infer Return> ? Return : never;
export type PackedRulesForUser = ReturnOfPromise<typeof rulesForUser>;

export async function rulesForUser(userId: string) {
  const roles = getAppliedRolesForUser(userId);
  let firstExpiration: undefined | Date;

  const translatedRules: AbilityRule[] = [];

  // basic role mappings
  for (const role of roles) {
    if (
      (!firstExpiration && role.expiration) ||
      (firstExpiration && role.expiration && new Date(role.expiration) < firstExpiration)
    )
      firstExpiration = new Date(role.expiration);

    if (!role.permissions) {
      continue;
    }

    for (const resource of resources) {
      if (!(resource in role.permissions)) continue;
      const permissionsForResource = role.permissions[resource];

      const actionsSet = new Set<ResourceActionType>();

      permissionNumberToIdentifiers(permissionsForResource).forEach((action) =>
        actionsSet.add(action),
      );

      if (resource === 'User' && actionsSet.delete('manage-roles')) {
        translatedRules.push({
          subject: 'RoleMapping',
          action: 'manage-roles',
          conditions: {
            conditions: {
              $: { $not_expired_value: role.expiration },
            },
          },
        });
      }

      if (actionsSet.has('share'))
        translatedRules.push(...rulesForShares(resource, userId, role.expiration));

      if (actionsSet.has('admin'))
        translatedRules.push({
          action: 'admin',
          subject: 'Share',
          conditions: {
            conditions: {
              resourceType: { $eq_string_case_insensitive: resource },
              $: { $not_expired_value: role.expiration },
            },
          },
        });
      const ownershipConditions =
        needOwnership.has(resource) && !actionsSet.has('admin') ? { owner: { $eq: userId } } : {};

      translatedRules.push({
        subject: resource,
        action: [...actionsSet.values()],
        conditions: {
          conditions: {
            ...ownershipConditions,
            $: { $not_expired_value: role.expiration },
          },
        },
      });
    }
  }

  const ability = buildAbility(translatedRules);

  if (userId) {
    translatedRules.push(...rulesForAuthenticatedUsers(userId));

    translatedRules.push(...rulesForRoles(ability));

    translatedRules.push(...(await rulesForSharedResources(ability, userId)));

    translatedRules.push(...rulesForAlteringShares(ability));
  }

  // casl uses the ordering of the rules to decide
  // this way inverted rules allways decide over normal rules
  translatedRules.sort((a, b) => +a.inverted - +b.inverted);

  return { rules: packRules(translatedRules), expiration: firstExpiration };
}

export function toCaslResource(resource: ResourceType, object: any) {
  return subject(resource, object);
}
