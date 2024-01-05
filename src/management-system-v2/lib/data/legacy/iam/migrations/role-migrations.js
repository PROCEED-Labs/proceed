// first seed of roles db
import { PERMISSION_ADMIN } from '../../iam-constants';

export const roleMigrations = [
  {
    name: '@everyone',
    default: true,
    description: 'Default role for all authenticated PROCEED users.',
    note: 'This role cannot be removed!',
    permissions: {},
    exipiration: null,
  },
  {
    name: '@guest',
    default: true,
    description: 'Default role for all unauthenticated PROCEED users.',
    note: 'This role cannot be removed!',
    permissions: {},
    exipiration: null,
  },
  {
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
