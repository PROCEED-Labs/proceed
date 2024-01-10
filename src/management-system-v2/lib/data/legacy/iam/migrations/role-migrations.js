// first seed of roles db
import { PERMISSION_ADMIN } from '../../iam-constants';

//TODO update environmentId
export const roleMigrations = [
  {
    environmentId: '1',
    name: '@everyone',
    default: true,
    description: 'Default role for all authenticated PROCEED users.',
    note: 'This role cannot be removed!',
    permissions: {},
    exipiration: null,
  },
  {
    environmentId: '1',
    name: '@guest',
    default: true,
    description: 'Default role for all unauthenticated PROCEED users.',
    note: 'This role cannot be removed!',
    permissions: {},
    exipiration: null,
  },
  {
    environmentId: '1',

    name: '@admin',
    default: true,
    description: 'Admin role',
    note: 'This role cannot be removed!',
    permissions: {
      All: PERMISSION_ADMIN,
    },
    exipiration: null,
  },
  {
    environmentId: '1',
    name: '@process_admin',
    default: true,
    description: 'Admin role for managing processes',
    note: 'This role cannot be removed!',
    permissions: {
      Process: PERMISSION_ADMIN,
      Project: PERMISSION_ADMIN,
      Template: PERMISSION_ADMIN,
    },
    exipiration: null,
  },
  {
    environmentId: '1',
    name: '@environment_admin',
    default: true,
    description: 'Admin role for managing environment configurations',
    note: 'This role cannot be removed!',
    permissions: {
      Setting: PERMISSION_ADMIN,
      EnvConfig: PERMISSION_ADMIN,
    },
    exipiration: null,
  },
];
