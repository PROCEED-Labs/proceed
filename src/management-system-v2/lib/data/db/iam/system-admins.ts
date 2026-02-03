import { ok, err } from 'neverthrow';
import { v4 } from 'uuid';
import {
  SystemAdmin,
  SystemAdminCreationInput,
  SystemAdminCreationInputSchema,
  SystemAdminSchema,
  SystemAdminUpdateInput,
  SystemAdminUpdateInputSchema,
} from '../../system-admin-schema';
import db from '@/lib/data/db';
import { Prisma } from '@prisma/client';

export async function getSystemAdmins() {
  const sysAdmins = await db.systemAdmin.findMany({});
  return ok(sysAdmins as SystemAdmin[]);
}

export async function getAdminById(id: string) {
  return ok(await db.systemAdmin.findUnique({ where: { id: id } }));
}

export async function getSystemAdminByUserId(userId: string) {
  return ok((await db.systemAdmin.findUnique({ where: { userId: userId } })) as SystemAdmin);
}

export async function addSystemAdmin(
  adminInput: SystemAdminCreationInput,
  tx?: Prisma.TransactionClient,
) {
  // TODO: decide if permissions should be checkded here

  const dbMutator = tx ? tx : db;

  const now = new Date();
  const admin = SystemAdminSchema.parse({
    ...SystemAdminCreationInputSchema.parse(adminInput),
    id: v4(),
    createdOn: now,
    lastEditedOn: now,
  });

  await dbMutator.systemAdmin.create({ data: { ...admin } });

  return ok(admin);
}

export async function updateSystemAdmin(
  adminId: string,
  adminUpdate: Partial<SystemAdminUpdateInput>,
) {
  // TODO: decide if permissions should be checkded here
  const adminData = await getAdminById(adminId);
  if (adminData.isErr()) {
    return adminData;
  }
  if (!adminData.value) return err(new Error('System admin not found'));

  const parseResult = SystemAdminUpdateInputSchema.partial().safeParse(adminUpdate);
  if (!parseResult.success) {
    return err(parseResult.error);
  }
  const newAdminData = {
    ...adminData.value,
    ...parseResult.data,
    lastEditedOn: new Date(),
  } as SystemAdmin;

  await db.systemAdmin.update({ where: { id: adminId }, data: { ...newAdminData } });

  return ok(newAdminData);
}

export async function deleteSystemAdmin(adminId: string) {
  // TODO: decide if permissions should be checkded here
  const adminData = await getAdminById(adminId);
  if (adminData.isErr()) return adminData;
  if (!adminData.value) return err(new Error('System admin not found'));

  await db.systemAdmin.delete({ where: { id: adminId } });

  return ok();
}
