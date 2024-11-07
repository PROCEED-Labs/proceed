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

let inited = false;

/**
 * Initializes the system admins meta information objects
 */
export function init() {
  if (!firstInit || inited) return;
  inited = true;

  const storedAdmins = store.get('systemAdmins') as SystemAdmin[];
  storedAdmins.forEach((admin) => (systemAdminsMetaObjects[admin.id] = admin));
}
init();

/**
 * Returns all system admins in form of an array
 */
export async function getSystemAdmins() {
  const sysAdmins = Object.values(systemAdminsMetaObjects);
  return sysAdmins as SystemAdmin[];
}

/**
 * Returns a system admin based on the admin ID
 */
export async function getAdminById(id: string) {
  return systemAdminsMetaObjects[id];
}

/**
 * Returns a system admin based on the user ID
 */
export async function getSystemAdminByUserId(userId: string) {
  for (const admin of Object.values(systemAdminsMetaObjects)) {
    if (admin!.userId === userId) return admin;
  }
}

/**
 * Adds a new system admin
 *
 * @throws {Error}
 */
export async function addSystemAdmin(adminInput: SystemAdminCreationInput) {
  // TODO: decide if permissions should be checked here

  const now = new Date();
  const admin = SystemAdminSchema.parse({
    ...SystemAdminCreationInputSchema.parse(adminInput),
    id: v4(),
    createdOn: now,
    lastEditedOn: now,
  });

  if (systemAdminsMetaObjects[admin.id]) throw new Error('System admin id already exists');

  systemAdminsMetaObjects[admin.id] = admin;
  store.add('systemAdmins', admin);

  return admin;
}

/**
 * Updates a system admin by ID
 *
 * @throws {Error}
 */
export async function updateSystemAdmin(
  adminId: string,
  adminUpdate: Partial<SystemAdminUpdateInput>,
) {
  // TODO: decide if permissions should be checked here
  const adminData = systemAdminsMetaObjects[adminId];
  if (!adminData) throw new Error('System admin not found');

  const newAdminData = {
    ...adminData,
    ...SystemAdminUpdateInputSchema.partial().parse(adminUpdate),
    lastEditedOn: new Date(),
  } as SystemAdmin;

  store.update('systemAdmins', adminId, newAdminData);
  systemAdminsMetaObjects[adminId] = newAdminData;

  return newAdminData;
}

/**
 * Deletes a system admin by ID
 *
 * @throws {Error}
 */
export async function deleteSystemAdmin(adminId: string) {
  // TODO: decide if permissions should be checked here
  const adminData = systemAdminsMetaObjects[adminId];
  if (!adminData) throw new Error('System admin not found');

  delete systemAdminsMetaObjects[adminId];
  store.remove('systemAdmins', adminId);
}
