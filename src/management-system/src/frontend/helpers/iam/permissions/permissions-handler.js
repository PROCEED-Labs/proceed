import { PERMISSION_MAPPING } from '@/shared-frontend-backend/constants/index.js';

/**
 * translates a permissions number into a list of permissions
 *
 * @param {Number} permission - permissions as a number
 * @returns {Array} - array of permissions such as ['view', 'edit']
 */
export const translatePermissionToList = async (permission) => {
  const permissionsList = [];
  const permissions = Object.keys(PERMISSION_MAPPING).reverse();
  permissions.forEach((perm) => {
    if (PERMISSION_MAPPING[perm] <= permission && permission > 0) {
      permissionsList.push(perm);
      permission -= PERMISSION_MAPPING[perm];
    }
  });
  return permissionsList;
};

/**
 * translates a permission list into a permissions number
 *
 * @param {Array} list - array of permissions such as ['view', 'edit']
 * @returns {Number} - permission as a number
 */
export const translateListToPermission = async (list) => {
  let permission = 0;
  list.forEach((permissionName) => {
    permission += PERMISSION_MAPPING[permissionName];
  });
  return permission;
};

/**
 * initializes permissions for each individual resource that is loaded in stores on initial page load
 *
 * @param {Array} resource - an array of resources
 * @returns {Object} - permissions object
 */
export const initResourcePermissions = async (resources) => {
  const permissions = {};
  resources.forEach((process) => {
    if (process.owner) {
      const type = process.type[0].toUpperCase() + process.type.slice(1);
      if (!permissions[type]) {
        permissions[type] = {
          conditions: {
            [process.id]: process.permissions,
          },
        };
      } else {
        permissions[type].conditions = {
          ...permissions[type].conditions,
          [process.id]: process.permissions,
        };
      }
    }
  });
  return permissions;
};

/**
 * adds a new permission depending on role permissions for a newly created resource
 *
 * @param {Object} resource - resource object
 * @param {Object} userPermissions - user permissions object from auth store
 * @returns {Object} - permission object
 */
export const addResourcePermission = async (resource, userPermissions) => {
  const type = resource.type[0].toUpperCase() + resource.type.slice(1);

  if (userPermissions[type] && userPermissions[type].actions) {
    const permission = {
      [type]: {
        conditions: {
          [resource.id]: userPermissions[type].actions,
        },
      },
    };
    return permission;
  }

  throw new Error('No resource permissions available!');
};
