// Folder module types
export type GetFolderContents =
  | typeof import('./db/folders').getFolderContents
  | typeof import('./legacy/folders').getFolderContents;
export type GetRootFolder =
  | typeof import('./db/folders').getRootFolder
  | typeof import('./legacy/folders').getRootFolder;
export type GetFolderById =
  | typeof import('./db/folders').getFolderById
  | typeof import('./legacy/folders').getFolderById;

// Process module types
export type GetProcess =
  | typeof import('./db/process').getProcess
  | typeof import('./legacy/_process').getProcess;
export type GetProcesses =
  | typeof import('./db/process').getProcesses
  | typeof import('./legacy/_process').getProcesses;

// Environment module types
export type DeleteEnvironment =
  | typeof import('./db/iam/environments').deleteEnvironment
  | typeof import('./legacy/iam/environments').deleteEnvironment;
export type GetEnvironmentById =
  | typeof import('./db/iam/environments').getEnvironmentById
  | typeof import('./legacy/iam/environments').getEnvironmentById;
export type GetEnvironments =
  | typeof import('./db/iam/environments').getEnvironments
  | typeof import('./legacy/iam/environments').getEnvironments;

export type OrganizationHasLogo =
  | typeof import('./db/iam/environments').organizationHasLogo
  | typeof import('./legacy/iam/environments').organizationHasLogo;

// Users module types

export type GetUserByUsername =
  | typeof import('./db/iam/users').getUserByUsername
  | typeof import('./legacy/iam/users').getUserByUsername;

export type AddUser =
  | typeof import('./db/iam/users').addUser
  | typeof import('./legacy/iam/users').addUser;

export type GetUserByEmail =
  | typeof import('./db/iam/users').getUserByEmail
  | typeof import('./legacy/iam/users').getUserByEmail;

export type UpdateUser =
  | typeof import('./db/iam/users').updateUser
  | typeof import('./legacy/iam/users').updateUser;

export type AddOauthAccount =
  | typeof import('./db/iam/users').addOauthAccount
  | typeof import('./legacy/iam/users').addOauthAccount;

export type GetOauthAccountByProviderId =
  | typeof import('./db/iam/users').getOauthAccountByProviderId
  | typeof import('./legacy/iam/users').getOauthAccountByProviderId;

export type GetUsers =
  | typeof import('./db/iam/users').getUsers
  | typeof import('./legacy/iam/users').getUsers;
export type GetUserById =
  | typeof import('./db/iam/users').getUserById
  | typeof import('./legacy/iam/users').getUserById;
export type DeleteUser =
  | typeof import('./db/iam/users').deleteUser
  | typeof import('./legacy/iam/users').deleteUser;

// Memberships module types
export type GetMembers =
  | typeof import('./db/iam/memberships').getMembers
  | typeof import('./legacy/iam/memberships').getMembers;
export type GetUserOrganizationEnvironments =
  | typeof import('./db/iam/memberships').getUserOrganizationEnvironments
  | typeof import('./legacy/iam/memberships').getUserOrganizationEnvironments;
export type IsMember =
  | typeof import('./db/iam/memberships').isMember
  | typeof import('./legacy/iam/memberships').isMember;
// Roles module types
export type GetRoleById =
  | typeof import('./db/iam/roles').getRoleById
  | typeof import('./legacy/iam/roles').getRoleById;
export type GetRoles =
  | typeof import('./db/iam/roles').getRoles
  | typeof import('./legacy/iam/roles').getRoles;

// System Admins module types
export type GetSystemAdminByUserId =
  | typeof import('./db/iam/system-admins').getSystemAdminByUserId
  | typeof import('./legacy/iam/system-admins').getSystemAdminByUserId;
export type AddSystemAdmin =
  | typeof import('./db/iam/system-admins').addSystemAdmin
  | typeof import('./legacy/iam/system-admins').addSystemAdmin;
export type DeleteSystemAdmin =
  | typeof import('./db/iam/system-admins').deleteSystemAdmin
  | typeof import('./legacy/iam/system-admins').deleteSystemAdmin;
export type GetSystemAdmins =
  | typeof import('./db/iam/system-admins').getSystemAdmins
  | typeof import('./legacy/iam/system-admins').getSystemAdmins;
