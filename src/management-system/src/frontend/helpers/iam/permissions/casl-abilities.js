import { translatePermissionToList } from '@/frontend/helpers/iam/permissions/permissions-handler.js';

/**
 * translates userinfo permissions object into casl rules
 *
 * @param {Object} permissions - permissions object from userinfo response
 */
export const defineRules = async (permissions, userId, useAuthorization) => {
  const rules = [];
  if (useAuthorization) {
    for (const resource of Object.keys(permissions)) {
      let permissionsList = [];
      if (Array.isArray(permissions[resource].actions)) {
        for (const permission of permissions[resource].actions) {
          const permissions = await translatePermissionToList(permission);
          permissionsList.push(...permissions);
        }
      } else {
        permissionsList = await translatePermissionToList(permissions[resource].actions);
      }
      const globalRule = {
        action: [...new Set(permissionsList)],
        subject: resource,
      };
      if (['Process', 'Project', 'Template'].includes(resource)) {
        globalRule.conditions = userId ? { owner: { $eq: userId } } : { owner: { $eq: null } };
      }
      if (permissions[resource].conditions) {
        const uniquePermissions = [...new Set(Object.values(permissions[resource].conditions))];
        uniquePermissions.forEach(async (permission) => {
          const ids = Object.keys(permissions[resource].conditions).filter(
            (key) => permissions[resource].conditions[key] === permission
          );
          const permissionsList = [
            ...new Set(['view', ...(await translatePermissionToList(permission))]),
          ];
          const newRule = {
            action: permissionsList,
            subject: resource,
            conditions: { id: { $in: ids } },
          };
          rules.push(newRule);
        });
      }
      rules.push(globalRule);
    }
    return rules;
  } else {
    // all permissions if authorization is disabled
    return [{ action: 'admin', subject: 'All' }];
  }
};
