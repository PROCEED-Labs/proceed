import { SHARE_TYPE, sharedWitOrByhUser } from './shares';
import { packRules } from '@casl/ability/extra';
import {
  AbilityRule,
  CaslAbility,
  FolderScopedResources,
  ResourceType,
  buildAbility,
  resourceAction,
  resources,
} from '@/lib/ability/caslAbility';
import { adminPermissions, permissionNumberToIdentifiers } from './permissionHelpers';
import { globalOrganizationRules, globalUserRules } from './globalRules';
import { Role } from '../data/role-schema';
import { Environment } from '../data/environment-schema';

const sharedResources = new Set<ResourceType>(['Process', 'Project', 'Template']);

const globalRoles = {
  everybodyRole: '',
  guestRole: '',
};

function rulesForAuthenticatedUsers(userId: string): AbilityRule[] {
  return [
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
      reason: 'Users can leave organizations',
    },
  ];
}

function rulesForRoles(ability: CaslAbility, userId: string) {
  const rules: AbilityRule[] = [];

  rules.push({
    subject: 'Role',
    action: 'view',
  });

  rules.push({
    inverted: true,
    subject: 'Role',
    action: 'delete',
    conditions: {
      conditions: {
        default: { $eq: true },
      },
    },
  });

  rules.push({
    subject: 'RoleMapping',
    action: 'view',
    conditions: {
      conditions: {
        userId: { $eq: userId },
      },
    },
    reason: 'Users can view their own role mappings',
  });

  rules.push({
    inverted: true,
    subject: 'Role',
    action: 'update',
    conditions: {
      conditions: {
        default: { $eq: true },
      },
    },
    fields: ['default', 'name', 'expiration'],
  });
  rules.push({
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
  });

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
              $: { $not_expired_value: share.expiredAt ?? null },
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
        $: { $not_expired_value: expiration ?? null },
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
        $: { $not_expired_value: expiration ?? null },
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

const disallowOutsideOfEnvRule = (environmentId: string) =>
  ({
    inverted: true,
    subject: 'All',
    action: [...resourceAction],
    conditions: {
      conditions: {
        environmentId: { $neq: environmentId },
      },
    },
  }) as AbilityRule;

export type PackedRulesForUser = ReturnType<typeof computeRulesForUser>;

/** If possible don't use this function directly, use rulesForUser which caches the rules */
export function computeRulesForUser({
  userId,
  space,
  roles,
}: {
  userId: string;
  space: Environment;
  roles: Role[];
}) {
  if (!space.organization) {
    if (userId !== space.id) throw new Error("Personal environment doesn't belong to user");

    const personalEnvironmentRules = [
      {
        subject: 'All',
        action: 'admin',
      },
      disallowOutsideOfEnvRule(space.id),
    ] as AbilityRule[];

    return { rules: packRules(personalEnvironmentRules.concat(globalUserRules)) };
  }

  let firstExpiration: null | Date = null;

  const translatedRules: AbilityRule[] = [];

  // basic role mappings
  for (const role of roles) {
    if (!role.permissions) {
      continue;
    }

    if (
      (!firstExpiration && role.expiration) ||
      (firstExpiration && role.expiration && new Date(role.expiration) < firstExpiration)
    )
      firstExpiration = new Date(role.expiration);

    let viewActionOnFolderScopedResource = false;
    for (const resource of resources) {
      if (!(resource in role.permissions)) continue;

      const actionsNumber = role.permissions[resource]!;
      const actions = permissionNumberToIdentifiers(actionsNumber);

      if (!viewActionOnFolderScopedResource && FolderScopedResources.includes(resource as any)) {
        const actionSet = new Set(actions);
        if (['view', 'manage', 'admin'].some((action) => actionSet.has(action as any)))
          viewActionOnFolderScopedResource = true;
      }

      translatedRules.push({
        subject: resource,
        action: actions,
        conditions: {
          conditions: {
            $: { $not_expired_value: role.expiration?.toISOString() ?? null },
            ...(role.parentId && FolderScopedResources.includes(resource as any)
              ? { $1: { $property_has_to_be_child_of: role.parentId } }
              : {}),
          },
        },
      });
    }

    if (viewActionOnFolderScopedResource) {
      translatedRules.push({
        subject: 'Folder',
        action: 'view',
        conditions: {
          conditions: {
            $: { $property_has_to_be_parent_of: role.parentId },
          },
        },
      });
    }
  }

  const ability = buildAbility(translatedRules);

  translatedRules.push(...rulesForAuthenticatedUsers(userId));

  translatedRules.push(...rulesForRoles(ability, userId));

  // Disallow every action on other environments
  translatedRules.push(disallowOutsideOfEnvRule(space.id));

  // casl uses the ordering of the rules to decide
  // this way inverted rules always decide over normal rules
  translatedRules.sort((a, b) => Number(a.inverted) - Number(b.inverted));

  return {
    rules: packRules(translatedRules.concat(globalOrganizationRules)),
    expiration: firstExpiration,
  };
}
