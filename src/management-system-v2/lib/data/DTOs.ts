'use server';

import { enableUseDB } from 'FeatureFlags';
import Ability from '../ability/abilityHelper';

import {
  AddSystemAdmin,
  DeleteEnvironment,
  DeleteSystemAdmin,
  DeleteUser,
  GetEnvironmentById,
  GetEnvironments,
  GetFolderById,
  GetFolderContents,
  GetMembers,
  GetProcess,
  GetUsers,
  GetProcesses,
  GetRoleById,
  GetRoles,
  GetRootFolder,
  GetSystemAdminByUserId,
  GetSystemAdmins,
  GetUserById,
  GetUserOrganizationEnvironments,
  OrganizationHasLogo,
} from './dtos-import-types';
import { SystemAdminCreationInput } from './system-admin-schema';
import { Environment } from './environment-schema';

let _getProcess: GetProcess;
let _getProcesses: GetProcesses;
let _getFolderContents: GetFolderContents;
let _getRootFolder: GetRootFolder;
let _getFolderById: GetFolderById;
let _getEnvironments: GetEnvironments;
let _deleteEnvironment: DeleteEnvironment;
let _getEnvironmentById: GetEnvironmentById;
let _getUserOrganizationEnvironments: GetUserOrganizationEnvironments;
let _getUserById: GetUserById;
let _getMembers: GetMembers;
let _getRoleById: GetRoleById;
let _getRoles: GetRoles;
let _getUsers: GetUsers;
let _organizationHasLogo: OrganizationHasLogo;
let _getSystemAdminByUserId: GetSystemAdminByUserId;
let _addSystemAdmin: AddSystemAdmin;
let _deleteSystemAdmin: DeleteSystemAdmin;
let _getSystemAdmins: GetSystemAdmins;
let _deleteUser: DeleteUser;

const loadModules = async () => {
  const [
    folderModule,
    processModule,
    environmentModule,
    rolesModule,
    membershipsModule,
    usersModule,
    sysAdminsModule,
  ] = await Promise.all([
    enableUseDB ? import('./db/folders') : import('./legacy/folders'),
    enableUseDB ? import('./db/process') : import('./legacy/_process'),

    enableUseDB ? import('./db/iam/environments') : import('./legacy/iam/environments'),
    enableUseDB ? import('./db/iam/roles') : import('./legacy/iam/roles'),
    enableUseDB ? import('./db/iam/memberships') : import('./legacy/iam/memberships'),
    enableUseDB ? import('./db/iam/users') : import('./legacy/iam/users'),
    enableUseDB ? import('./db/iam/system-admins') : import('./legacy/iam/system-admins'),
  ]);

  _getProcess = processModule.getProcess;
  _getProcesses = processModule.getProcesses;
  _getFolderContents = folderModule.getFolderContents;
  _getRootFolder = folderModule.getRootFolder;
  _getFolderById = folderModule.getFolderById;
  _deleteEnvironment = environmentModule.deleteEnvironment;
  _getEnvironments = environmentModule.getEnvironments;
  _getEnvironmentById = environmentModule.getEnvironmentById;
  _getUserOrganizationEnvironments = membershipsModule.getUserOrganizationEnvironments;
  _getUserById = usersModule.getUserById;
  _getMembers = membershipsModule.getMembers;
  _getRoleById = rolesModule.getRoleById;
  _getRoles = rolesModule.getRoles;
  _organizationHasLogo = environmentModule.organizationHasLogo;
  _getSystemAdminByUserId = sysAdminsModule.getSystemAdminByUserId;
  _addSystemAdmin = sysAdminsModule.addSystemAdmin;
  _deleteSystemAdmin = sysAdminsModule.deleteSystemAdmin;
  _getSystemAdmins = sysAdminsModule.getSystemAdmins;
  _deleteUser = usersModule.deleteUser;
  _getUsers = usersModule.getUsers;
};

loadModules().catch(console.error);

export async function getProcess(processDefinitionsId: string, includeBPMN = false) {
  await loadModules();

  return await _getProcess(processDefinitionsId, includeBPMN);
}

export async function getProcesses(userId: string, ability: Ability, includeBPMN = false) {
  await loadModules();

  return await _getProcesses(userId, ability, includeBPMN);
}

export async function getFolderContents(folderId: string, ability?: Ability) {
  await loadModules();

  return await _getFolderContents(folderId, ability);
}

export async function getRootFolder(environmentId: string, ability?: Ability) {
  await loadModules();

  return await _getRootFolder(environmentId, ability);
}

export async function getFolderById(folderId: string, ability?: Ability) {
  await loadModules();

  return await _getFolderById(folderId, ability);
}

export async function deleteEnvironment(environmentId: string, ability?: Ability) {
  await loadModules();
  return await _deleteEnvironment(environmentId, ability);
}

export async function getEnvironmentById(environmentId: string, ability?: Ability) {
  await loadModules();
  return await _getEnvironmentById(environmentId, ability);
}

export async function getUserOrganizationEnvironments(userId: string) {
  await loadModules();
  return await _getUserOrganizationEnvironments(userId);
}

export async function getUserById(
  userId: string,
  opts?: { throwIfNotFound?: boolean | undefined } | undefined,
) {
  await loadModules();
  return await _getUserById(userId, opts);
}

export async function getMembers(environmentId: string, ability?: Ability) {
  await loadModules();
  return await _getMembers(environmentId, ability);
}

export async function getRoleById(roleId: string, ability?: Ability) {
  await loadModules();
  return await _getRoleById(roleId, ability);
}

export async function getRoles(environmentId: string, ability?: Ability) {
  await loadModules();
  return await _getRoles(environmentId, ability);
}

export async function organizationHasLogo(organisationId: string) {
  await loadModules();
  return await _organizationHasLogo(organisationId);
}

export async function getSystemAdminByUserId(userId: string) {
  await loadModules();
  return await _getSystemAdminByUserId(userId);
}

export async function addSystemAdmin(adminInput: SystemAdminCreationInput) {
  await loadModules();
  return await _addSystemAdmin(adminInput);
}

export async function deleteSystemAdmin(adminId: string) {
  await loadModules();
  return await _deleteSystemAdmin(adminId);
}

export async function getSystemAdmins() {
  await loadModules();
  return await _getSystemAdmins();
}

export async function getEnvironments() {
  await loadModules();
  return (await _getEnvironments()) as Environment[];
}

export async function deleteUser(userId: string) {
  await loadModules();
  return await _deleteUser(userId);
}

export async function getUsers() {
  await loadModules();
  return await _getUsers();
}
