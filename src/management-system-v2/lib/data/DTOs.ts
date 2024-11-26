'use server';

import { enableUseDB } from 'FeatureFlags';
import Ability from '../ability/abilityHelper';
import * as folderModuleDB from '@/lib/data/db/folders';
import * as folderModuleLegacy from '@/lib/data/legacy/folders';
import * as processModuleDB from '@/lib/data/db/process';
import * as processModuleLegacy from '@/lib/data/legacy/_process';
import * as environmentModuleDB from '@/lib/data/db/iam/environments';
import * as environmentModuleLegacy from '@/lib/data/legacy/iam/environments';
import * as rolesModuleDB from '@/lib/data/db/iam/roles';
import * as rolesModuleLegacy from '@/lib/data/legacy/iam/roles';
import * as membershipsModuleDB from '@/lib/data/db/iam/memberships';
import * as membershipsModuleLegacy from '@/lib/data/legacy/iam/memberships';
import * as usersModuleDB from '@/lib/data/db/iam/users';
import * as usersModuleLegacy from '@/lib/data/legacy/iam/users';
import * as sysAdminsModuleDB from '@/lib/data/db/iam/system-admins';
import * as sysAdminsModuleLegacy from '@/lib/data/legacy/iam/system-admins';

import { SystemAdminCreationInput } from './system-admin-schema';
import { Environment } from './environment-schema';
import { AuthenticatedUser, OauthAccount, User } from './user-schema';
import { OptionalKeys } from '../typescript-utils';

export async function getProcess(processDefinitionsId: string, includeBPMN = false) {
  return enableUseDB
    ? await processModuleDB.getProcess(processDefinitionsId, includeBPMN)
    : await processModuleLegacy.getProcess(processDefinitionsId, includeBPMN);
}

export async function getProcesses(environmentId: string, ability?: Ability, includeBPMN = false) {
  return enableUseDB
    ? await processModuleDB.getProcesses(environmentId, ability, includeBPMN)
    : await processModuleLegacy.getProcesses(environmentId, ability, includeBPMN);
}

export async function getProcessBpmn(processDefinitionsId: string) {
  return enableUseDB
    ? await processModuleDB.getProcessBpmn(processDefinitionsId)
    : await processModuleLegacy.getProcessBpmn(processDefinitionsId);
}
export async function getProcessVersionBpmn(processDefinitionsId: string, version: number) {
  return enableUseDB
    ? await processModuleDB.getProcessVersionBpmn(processDefinitionsId, version)
    : await processModuleLegacy.getProcessVersionBpmn(processDefinitionsId, version);
}

export async function updateProcess(...args: Parameters<typeof processModuleDB.updateProcess>) {
  return enableUseDB
    ? await processModuleDB.updateProcess(...args)
    : await processModuleLegacy.updateProcess(...args);
}

export async function getFolderContents(folderId: string, ability?: Ability) {
  return enableUseDB
    ? await folderModuleDB.getFolderContents(folderId, ability)
    : await folderModuleLegacy.getFolderContents(folderId, ability);
}

export async function getRootFolder(environmentId: string, ability?: Ability) {
  return enableUseDB
    ? await folderModuleDB.getRootFolder(environmentId, ability)
    : await folderModuleLegacy.getRootFolder(environmentId, ability);
}

export async function getFolderById(folderId: string, ability?: Ability) {
  return enableUseDB
    ? await folderModuleDB.getFolderById(folderId, ability)
    : await folderModuleLegacy.getFolderById(folderId, ability);
}

export async function moveFolder(folderId: string, newParentId: string, ability?: Ability) {
  return enableUseDB
    ? await folderModuleDB.moveFolder(folderId, newParentId, ability)
    : await folderModuleLegacy.moveFolder(folderId, newParentId, ability);
}

export async function updateFolderMetaData(
  ...args: Parameters<typeof folderModuleDB.updateFolderMetaData>
) {
  return enableUseDB
    ? await folderModuleDB.updateFolderMetaData(...args)
    : await folderModuleLegacy.updateFolderMetaData(...args);
}

export async function deleteEnvironment(environmentId: string, ability?: Ability) {
  return enableUseDB
    ? await environmentModuleDB.deleteEnvironment(environmentId, ability)
    : await environmentModuleLegacy.deleteEnvironment(environmentId, ability);
}

export async function getEnvironmentById(environmentId: string, ability?: Ability) {
  return enableUseDB
    ? ((await environmentModuleDB.getEnvironmentById(environmentId, ability)) as Environment)
    : ((await environmentModuleLegacy.getEnvironmentById(environmentId, ability)) as Environment);
}

export async function getUserOrganizationEnvironments(userId: string) {
  return enableUseDB
    ? await membershipsModuleDB.getUserOrganizationEnvironments(userId)
    : await membershipsModuleLegacy.getUserOrganizationEnvironments(userId);
}

export async function getUserById(
  userId: string,
  opts?: { throwIfNotFound?: boolean | undefined } | undefined,
) {
  return enableUseDB
    ? ((await usersModuleDB.getUserById(userId, opts)) as User)
    : ((await usersModuleLegacy.getUserById(userId, opts)) as User);
}

export async function getMembers(environmentId: string, ability?: Ability) {
  return enableUseDB
    ? await membershipsModuleDB.getMembers(environmentId, ability)
    : await membershipsModuleLegacy.getMembers(environmentId, ability);
}

export async function getRoleById(roleId: string, ability?: Ability) {
  return enableUseDB
    ? await rolesModuleDB.getRoleById(roleId, ability)
    : await rolesModuleLegacy.getRoleById(roleId, ability);
}

export async function getRoles(environmentId: string, ability?: Ability) {
  return enableUseDB
    ? await rolesModuleDB.getRoles(environmentId, ability)
    : await rolesModuleLegacy.getRoles(environmentId, ability);
}

export async function organizationHasLogo(organisationId: string) {
  return enableUseDB
    ? await environmentModuleDB.organizationHasLogo(organisationId)
    : await environmentModuleLegacy.organizationHasLogo(organisationId);
}

export async function getSystemAdminByUserId(userId: string) {
  return enableUseDB
    ? await sysAdminsModuleDB.getSystemAdminByUserId(userId)
    : await sysAdminsModuleLegacy.getSystemAdminByUserId(userId);
}

export async function addSystemAdmin(adminInput: SystemAdminCreationInput) {
  return enableUseDB
    ? await sysAdminsModuleDB.addSystemAdmin(adminInput)
    : await sysAdminsModuleLegacy.addSystemAdmin(adminInput);
}

export async function deleteSystemAdmin(adminId: string) {
  return enableUseDB
    ? await sysAdminsModuleDB.deleteSystemAdmin(adminId)
    : await sysAdminsModuleLegacy.deleteSystemAdmin(adminId);
}

export async function getSystemAdmins() {
  return enableUseDB
    ? await sysAdminsModuleDB.getSystemAdmins()
    : await sysAdminsModuleLegacy.getSystemAdmins();
}

export async function getEnvironments() {
  return enableUseDB
    ? ((await environmentModuleDB.getEnvironments()) as Environment[])
    : ((await environmentModuleLegacy.getEnvironments()) as Environment[]);
}

export async function deleteUser(userId: string) {
  return enableUseDB
    ? await usersModuleDB.deleteUser(userId)
    : await usersModuleLegacy.deleteUser(userId);
}

export async function getUsers(page: number = 1, pageSize: number = 10) {
  return enableUseDB
    ? await usersModuleDB.getUsers(page, pageSize)
    : await usersModuleLegacy.getUsers();
}

export async function isMember(environmentId: string, userId: string) {
  return enableUseDB
    ? await membershipsModuleDB.isMember(environmentId, userId)
    : await membershipsModuleLegacy.isMember(environmentId, userId);
}

export async function addUser(inputUser: OptionalKeys<User, 'id'>) {
  return enableUseDB
    ? await usersModuleDB.addUser(inputUser)
    : await usersModuleLegacy.addUser(inputUser);
}

export async function getUserByEmail(
  email: string,
  opts?: {
    throwIfNotFound?: boolean | undefined;
  },
) {
  return enableUseDB
    ? await usersModuleDB.getUserByEmail(email, opts)
    : await usersModuleLegacy.getUserByEmail(email, opts);
}

export async function updateUser(userId: string, inputUser: Partial<AuthenticatedUser>) {
  return enableUseDB
    ? await usersModuleDB.updateUser(userId, inputUser)
    : await usersModuleLegacy.updateUser(userId, inputUser);
}

export async function addOauthAccount(accountInput: Omit<OauthAccount, 'id'>) {
  return enableUseDB
    ? await usersModuleDB.addOauthAccount(accountInput)
    : await usersModuleLegacy.addOauthAccount(accountInput);
}

export async function getOauthAccountByProviderId(provider: string, providerId: string) {
  return enableUseDB
    ? await usersModuleDB.getOauthAccountByProviderId(provider, providerId)
    : await usersModuleLegacy.getOauthAccountByProviderId(provider, providerId);
}

export async function getUserByUsername(
  username: string,
  opts?: { throwIfNotFound?: boolean | undefined } | undefined,
) {
  return enableUseDB
    ? await usersModuleDB.getUserByUsername(username, opts)
    : await usersModuleLegacy.getUserByUsername(username, opts);
}

export async function getFolders(spaceId: string) {
  return enableUseDB
    ? await folderModuleDB.getFolders(spaceId)
    : await folderModuleLegacy.getFolders(spaceId);
}
