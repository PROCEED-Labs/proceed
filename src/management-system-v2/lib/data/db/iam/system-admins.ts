import { v4 } from 'uuid';
import {
  SystemAdmin,
  SystemAdminCreationInput,
  SystemAdminCreationInputSchema,
  SystemAdminSchema,
  SystemAdminUpdateInput,
  SystemAdminUpdateInputSchema,
} from '../../system-admin-schema';
import { enableUseDB } from 'FeatureFlags';
import db from '@/lib/data/db';

export async function getSystemAdmins() {
  const sysAdmins = await db.systemAdmin.findMany({});
  return sysAdmins as SystemAdmin[];
}

export async function getAdminById(id: string) {
  return await db.systemAdmin.findUnique({ where: { id: id } });
}

export async function getSystemAdminByUserId(userId: string) {
  return (await db.systemAdmin.findUnique({ where: { userId: userId } })) as SystemAdmin;
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

  await db.systemAdmin.create({ data: { ...admin } });

  return admin;
}

export async function updateSystemAdmin(
  adminId: string,
  adminUpdate: Partial<SystemAdminUpdateInput>,
) {
  // TODO: decide if permissions should be checkded here
  const adminData = await getAdminById(adminId);
  if (!adminData) throw new Error('System admin not found');

  const newAdminData = {
    ...adminData,
    ...SystemAdminUpdateInputSchema.partial().parse(adminUpdate),
    lastEditedOn: new Date(),
  } as SystemAdmin;

  await db.systemAdmin.update({ where: { id: adminId }, data: { ...newAdminData } });

  return newAdminData;
}

export async function deleteSystemAdmin(adminId: string) {
  // TODO: decide if permissions should be checkded here
  const adminData = await getAdminById(adminId);
  if (!adminData) throw new Error('System admin not found');

  await db.systemAdmin.delete({ where: { id: adminId } });
}
