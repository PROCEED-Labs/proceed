export type TUsersModule = typeof import('./db/iam/users') | typeof import('./legacy/iam/users');
export type TMembershipsModule =
  | typeof import('./db/iam/memberships')
  | typeof import('./legacy/iam/memberships');
export type TEnvironmentsModule =
  | typeof import('./db/iam/environments')
  | typeof import('./legacy/iam/environments');
export type TRolesModule = typeof import('./db/iam/roles') | typeof import('./legacy/iam/roles');

export type TProcessModule = typeof import('./db/process') | typeof import('./legacy/_process');

export type TFoldersModule = typeof import('./db/folders') | typeof import('./legacy/folders');

export type TRoleMappingsModule =
  | typeof import('./db/iam/role-mappings')
  | typeof import('./legacy/iam/role-mappings');

export type TSysAdminsModule =
  | typeof import('./db/iam/system-admins')
  | typeof import('./legacy/iam/system-admins');
