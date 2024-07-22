// first seed of resources db
export const resources = [
  {
    name: 'Processes',
    title: 'Processes',
    description: 'Processes',
    path: '/api/process',
    type: 'Process',
    actions: [
      {
        name: 'view',
        title: 'View processes',
        description: 'Allows a user to view her or his processes. (Enables the Processes view.)',
      },
      {
        name: 'manage',
        title: 'Manage processes',
        description: 'Allows a user to create, modify and delete processes in the Processes view.',
      },
      {
        name: 'share',
        title: 'Share processes',
        description: 'Allows a user to share processes with different users and groups.',
      },
      {
        name: 'admin',
        title: 'Administrate processes',
        description: 'Allows a user to create, modify, delete and share all PROCEED processes.',
      },
    ],
  },
  {
    name: 'Projects',
    title: 'Projects',
    description: 'Projects',
    path: '/api/process',
    type: 'Project',
    actions: [
      {
        name: 'view',
        title: 'View projects',
        description: 'Allows a user to view her or his projects. (Enables the Projects view.)',
      },
      {
        name: 'manage',
        title: 'Manage projects',
        description: 'Allows a user to create, modify and delete projects in the Projects view.',
      },
      {
        name: 'share',
        title: 'Share projects',
        description: 'Allows a user to share projects with different users and groups.',
      },
      {
        name: 'admin',
        title: 'Administrate projects',
        description: 'Allows a user to create, modify, delete and share all PROCEED projects.',
      },
    ],
  },
  // {
  //   name: 'Templates',
  //   title: 'Templates',
  //   description: 'Templates',
  //   path: '/api/process',
  //   type: 'Template',
  //   actions: [
  //     {
  //       name: 'view',
  //       title: 'View templates',
  //       description: 'Allows a user to view her or his templates. (Enables the Templates view.)',
  //     },
  //     {
  //       name: 'manage',
  //       title: 'Manage templates',
  //       description: 'Allows a user to create, modify and delete templates in the Templates view.',
  //     },
  //     {
  //       name: 'share',
  //       title: 'Share templates',
  //       description: 'Allows a user to share templates with different users and groups.',
  //     },
  //     {
  //       name: 'admin',
  //       title: 'Administrate templates',
  //       description: 'Allows a user to create, modify, delete and share all PROCEED templates.',
  //     },
  //   ],
  // },
  {
    name: 'Tasks',
    title: 'Tasks',
    description: 'Tasks',
    type: 'Task',
    actions: [
      {
        name: 'view',
        title: 'View tasks',
        description: 'Allows a user to view her or his tasks. (Enables the Tasklist view.)',
      },
    ],
  },
  {
    name: 'Machines',
    title: 'Machines',
    path: '/api/machines',
    description: 'Machines',
    type: 'Machine',
    actions: [
      {
        name: 'view',
        title: 'View machines',
        description: 'Allows a user to view all machines. (Enables the Machines view.)',
      },
      {
        name: 'manage',
        title: 'Manage machines',
        description: 'Allows a user to create, modify and delete machines in the Machines view.',
      },
    ],
  },
  {
    name: 'Executions',
    title: 'Executions',
    path: '/api/executions',
    description: 'Executions',
    type: 'Execution',
    actions: [
      {
        name: 'view',
        title: 'View executions',
        description: 'Allows a user to view all executions. (Enables the Executions view.)',
      },
    ],
  },
  {
    name: 'Roles',
    title: 'Identity & Access Management',
    path: '/api/roles',
    description: 'Roles',
    type: 'Role',
    actions: [
      {
        name: 'manage',
        title: 'Manage roles',
        description: 'Allows a user to create, modify and delete roles. (Enables the IAM view.)',
      },
    ],
  },
  {
    name: 'Users',
    title: 'Identity & Access Management',
    path: '/api/users',
    description: 'Users',
    type: 'User',
    actions: [
      {
        name: 'manage',
        title: 'Manage users',
        description:
          'Allows a user to create, delete and enable/disable users. (Enables the IAM view.)',
      },
      {
        name: 'manage-roles',
        title: 'Manage roles of users',
        description:
          'Allows a user to assign roles to a user and to remove roles from a user. (Enables the IAM view.)',
      },
    ],
  },
  {
    name: 'Settings',
    title: 'Settings',
    description: 'Settings',
    type: 'Setting',
    actions: [
      {
        name: 'admin',
        title: 'Administrate settings',
        description:
          'Allows a user to administrate the settings of the Management System and the Engine. (Enables the Settings view.)',
      },
    ],
  },
  {
    name: 'Environment Configurations',
    title: 'Environment Configurations',
    description: 'Environment Configurations',
    type: 'EnvConfig',
    actions: [
      {
        name: 'admin',
        title: 'Administrate environment configuration',
        description:
          'Allows a user to administrate the environment configuration of the Management System. (Enables the Environment Configuration view.)',
      },
    ],
  },
  {
    name: 'Administrator',
    title: 'All',
    description: 'Administrator',
    type: 'All',
    actions: [
      {
        name: 'admin',
        title: 'Administrator Permissions',
        description:
          'Grants a user full administrator permissions for the PROCEED Management System.',
      },
    ],
  },
];
