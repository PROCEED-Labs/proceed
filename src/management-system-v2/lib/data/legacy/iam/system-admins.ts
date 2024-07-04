import { v4 } from 'uuid';
import store from '../store.js';
import {
  SystemAdmin,
  SystemAdminCreationInput,
  SystemAdminCreationInputSchema,
  SystemAdminSchema,
  SystemAdminUpdateInput,
  SystemAdminUpdateInputSchema,
} from '../../system-admin-schema';

// @ts-ignore
let firstInit = !global.systemAdminsMetaObjects;

export let systemAdminsMetaObjects: {
  [adminId: string]: SystemAdmin | undefined;
} =
  // @ts-ignore
  global.systemAdminsMetaObjects || (global.systemAdminsMetaObjects = {});

/**
 * initializes the system admins meta information objects
 */
export function init() {
  if (!firstInit) return;

  const storedAdmins = store.get('systemAdmins') as SystemAdmin[];
  storedAdmins.forEach((admin) => (systemAdminsMetaObjects[admin.id] = admin));
}
init();

export function getSystemAdmins() {
  return Object.values(systemAdminsMetaObjects) as SystemAdmin[];
}

export function getAdminById(id: string) {
  return systemAdminsMetaObjects[id];
}

export function getSystemAdminByUserId(userId: string) {
  for (const admin of Object.values(systemAdminsMetaObjects)) {
    if (admin!.userId === userId) return admin;
  }
}

export function addSystemAdmin(adminInput: SystemAdminCreationInput) {
  // TODO: decide if permissions should be checkded here

  const now = new Date().toISOString();

  const admin = SystemAdminSchema.parse({
    ...SystemAdminCreationInputSchema.parse(adminInput),
    id: v4(),
    createdOn: now,
    lastEdited: now,
  });

  if (systemAdminsMetaObjects[admin.id]) throw new Error('System admin id already exists');

  systemAdminsMetaObjects[admin.id] = admin;
  store.add('systemAdmins', admin);

  return admin;
}

export function updateSystemAdmin(adminId: string, adminUpdate: Partial<SystemAdminUpdateInput>) {
  // TODO: decide if permissions should be checkded here
  const adminData = systemAdminsMetaObjects[adminId];
  if (!adminData) throw new Error('System admin not found');

  const newAdminData = {
    ...adminData,
    ...SystemAdminUpdateInputSchema.partial().parse(adminUpdate),
    lastEdited: new Date().toUTCString(),
  };

  store.update('systemAdmins', adminId, newAdminData);
  systemAdminsMetaObjects[adminId] = newAdminData;

  return newAdminData;
}

export function deleteSystemAdmin(adminId: string) {
  // TODO: decide if permissions should be checkded here
  const adminData = systemAdminsMetaObjects[adminId];
  if (!adminData) throw new Error('System admin not found');

  delete systemAdminsMetaObjects[adminId];
  store.remove('systemAdmins', adminId);
}
