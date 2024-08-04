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
import { enableUseDB } from 'FeatureFlags';
import db from '@/lib/data';
import { IoReturnDownBack } from 'react-icons/io5';
// @ts-ignore
let firstInit = !global.systemAdminsMetaObjects;

export let systemAdminsMetaObjects: {
  [adminId: string]: SystemAdmin | undefined;
} =
  // @ts-ignore
  global.systemAdminsMetaObjects || (global.systemAdminsMetaObjects = {});

let inited = false;
/**
 * initializes the system admins meta information objects
 */
export function init() {
  if (!firstInit || inited) return;
  inited = false;

  const storedAdmins = store.get('systemAdmins') as SystemAdmin[];
  storedAdmins.forEach((admin) => (systemAdminsMetaObjects[admin.id] = admin));
}
init();

export async function getSystemAdmins() {
  const sysAdmins = enableUseDB
    ? await db.systemAdmin.findMany({})
    : Object.values(systemAdminsMetaObjects);
  return sysAdmins as SystemAdmin[];
}

export async function getAdminById(id: string) {
  return enableUseDB
    ? await db.systemAdmin.findUnique({ where: { id: id } })
    : systemAdminsMetaObjects[id];
}

export async function getSystemAdminByUserId(userId: string) {
  if (enableUseDB) {
    return (await db.systemAdmin.findUnique({ where: { userId: userId } })) as SystemAdmin;
  } else {
    for (const admin of Object.values(systemAdminsMetaObjects)) {
      if (admin!.userId === userId) return admin;
    }
  }
}

export async function addSystemAdmin(adminInput: SystemAdminCreationInput) {
  // TODO: decide if permissions should be checkded here

  const now = new Date();
  const admin = SystemAdminSchema.parse({
    ...SystemAdminCreationInputSchema.parse(adminInput),
    id: v4(),
    createdOn: now,
    lastEditedOn: now,
  });
  if (enableUseDB) {
    await db.systemAdmin.create({ data: { ...admin } });
  } else {
    if (systemAdminsMetaObjects[admin.id]) throw new Error('System admin id already exists');

    systemAdminsMetaObjects[admin.id] = admin;
    store.add('systemAdmins', admin);
  }

  return admin;
}

export async function updateSystemAdmin(
  adminId: string,
  adminUpdate: Partial<SystemAdminUpdateInput>,
) {
  // TODO: decide if permissions should be checkded here
  const adminData = enableUseDB ? await getAdminById(adminId) : systemAdminsMetaObjects[adminId];
  if (!adminData) throw new Error('System admin not found');

  const newAdminData = {
    ...adminData,
    ...SystemAdminUpdateInputSchema.partial().parse(adminUpdate),
    lastEditedOn: new Date(),
  } as SystemAdmin;
  if (enableUseDB) {
    await db.systemAdmin.update({ where: { id: adminId }, data: { ...newAdminData } });
  } else {
    store.update('systemAdmins', adminId, newAdminData);
    systemAdminsMetaObjects[adminId] = newAdminData;
  }

  return newAdminData;
}

export async function deleteSystemAdmin(adminId: string) {
  // TODO: decide if permissions should be checkded here
  const adminData = enableUseDB ? await getAdminById(adminId) : systemAdminsMetaObjects[adminId];
  if (!adminData) throw new Error('System admin not found');
  if (enableUseDB) {
    await db.systemAdmin.delete({ where: { id: adminId } });
  } else {
    delete systemAdminsMetaObjects[adminId];
    store.remove('systemAdmins', adminId);
  }
}
