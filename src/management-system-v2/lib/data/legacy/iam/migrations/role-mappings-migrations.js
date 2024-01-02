// first seed of role-mappings db

export const developmentRoleMappingsMigrations = [
  {
    roleName: '@process_admin',
    userId: 'credentials:development-id|johndoe',
  },
  {
    roleName: '@admin',
    userId: 'credentials:development-id|admin',
  },
];
