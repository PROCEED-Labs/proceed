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
import {
  AllowedResourcesForAdmins,
  globalOrganizationRules,
  globalPersonalSpaceRules,
} from './globalRules';
import { Environment } from '../data/environment-schema';
import { Role } from '../data/role-schema';

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

  if (AllowedResourcesForAdmins.some((resource) => !ability.can('admin', resource))) {
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

const disallowOutsideOfEnvRule = (environmentId: string) =>
  ({
    inverted: true,
    subject: [...resources],
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
  purchasedResources,
}: {
  userId: string;
  space: Environment;
  roles?: Role[];
  purchasedResources?: ResourceType[];
}) {
  if (!space.isOrganization) {
    if (userId !== space.id) throw new Error("Personal environment doesn't belong to user");

    const personalEnvironmentRules = [
      {
        // NOTE: using AllowedResourcesForAdmins makes it so that personal spaces will not be able
        // to have any of the buyable resources
        subject: AllowedResourcesForAdmins,
        action: 'admin',
      },
      disallowOutsideOfEnvRule(space.id),
    ] as AbilityRule[];

    return { rules: packRules(personalEnvironmentRules.concat(globalPersonalSpaceRules)) };
  }

  const AllowedResourcesForOrganization = AllowedResourcesForAdmins.concat(
    purchasedResources ?? [],
  );

  let firstExpiration: null | Date = null;

  const translatedRules: AbilityRule[] = [];

  // basic role mappings
  for (const role of roles ?? []) {
    if (!role.permissions) {
      continue;
    }

    if (
      (!firstExpiration && role.expiration) ||
      (firstExpiration && role.expiration && new Date(role.expiration) < firstExpiration)
    )
      firstExpiration = new Date(role.expiration);

    let viewActionOnFolderScopedResource = false;
    for (const [resource, actionsNumber] of Object.entries(role.permissions)) {
      const actions = permissionNumberToIdentifiers(actionsNumber);

      if (!viewActionOnFolderScopedResource && FolderScopedResources.includes(resource as any)) {
        const actionSet = new Set(actions);
        if (['view', 'manage', 'admin'].some((action) => actionSet.has(action as any)))
          viewActionOnFolderScopedResource = true;
      }

      translatedRules.push({
        subject:
          resource === 'All' ? [...AllowedResourcesForOrganization] : (resource as ResourceType),
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
