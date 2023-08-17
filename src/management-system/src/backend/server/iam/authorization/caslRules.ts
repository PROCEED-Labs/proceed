import { subject } from '@casl/ability-v6';
import {
  PermissionNumber,
  ResourceActionType,
  ResourceType,
  adminPermissions,
  permissionNumberToIdentifiers,
  resources,
} from './permissionHelpers';
import { SHARE_TYPE, sharedWitOrByhUser } from './shares';
import { packRules } from '@casl/ability-v6/extra';
import { AbilityRule, CaslAbility, buildAbility } from './caslAbility';
import { buildPermissions } from '../utils/permissions';

type PerissionsObject = Partial<Record<ResourceType, PermissionNumber[]>>;

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
    for (const resource of resources) {
      if (!ability.can('admin', resource)) {
        rules.push({
          inverted: true,
          subject: 'Role',
          action: 'update',
          conditions: {
            conditions: {
              permissions: { $gte: adminPermissions },
            },
          },
          fields: [`permissions.${resource}`],
        });

        rules.push({
          inverted: true,
          subject: 'Role',
          action: ['delete', 'manage'],
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

function rulesForShares(resource: ResourceType, userId: string) {
  const rules: AbilityRule[] = [];

  // owner of the share
  rules.push({
    subject: 'Share',
    action: ['view', 'update', 'delete', 'create'],
    conditions: {
      conditions: {
        resourceOwner: { $eq: userId },
        resourceType: { $eq: resource },
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
        resourceType: { $eq: resource },
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
          resourceType: { $eq: resource },
          permissions: { $gte: adminPermissions },
        },
      },
    });
  }

  return rules;
}

export async function rulesForUser(userId: string) {
  const permissions = (await buildPermissions(userId, true)) as PerissionsObject;

  const translatedRules: AbilityRule[] = []; // order matters

  // basic role mappings
  for (const resource of resources) {
    if (permissions[resource] === undefined) continue;

    const actionsSet = new Set<ResourceActionType>();

    for (const permission of permissions[resource])
      permissionNumberToIdentifiers(permission).forEach((action) => actionsSet.add(action));

    if (resource === 'User' && actionsSet.delete('manage-roles')) {
      translatedRules.push({
        subject: 'RoleMapping',
        action: 'manage-roles',
      });
    }

    if (actionsSet.has('share')) translatedRules.push(...rulesForShares(resource, userId));

    if (actionsSet.has('admin'))
      translatedRules.push({
        action: 'admin',
        subject: 'Share',
        conditions: {
          conditions: {
            resourceType: { $eq: resource },
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
        },
      },
    });
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

  return packRules(translatedRules);
}

export function toCaslResource(resource: ResourceType, object: any) {
  return subject(resource, object);
}
