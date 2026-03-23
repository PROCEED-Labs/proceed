import db from '@/lib/data/db';
import { OrganigramInput } from '@/lib/data/organigram-schema';
import { Prisma } from '@prisma/client';

export async function upsertUserOrganigram(input: OrganigramInput, tx?: Prisma.TransactionClient) {
  const dbMutator = tx || db;
  const existing = await dbMutator.userOrganigram.findUnique({
    where: { memberId: input.memberId },
  });

  if (existing) {
    return dbMutator.userOrganigram.update({
      where: { memberId: input.memberId },
      data: {
        directManagerId: input.directManagerId ?? null,
        teamRoleId: input.teamRoleId ?? null,
        backOfficeRoleId: input.backOfficeRoleId ?? null,
      },
    });
  }

  return dbMutator.userOrganigram.create({
    data: {
      memberId: input.memberId,
      directManagerId: input.directManagerId ?? null,
      teamRoleId: input.teamRoleId ?? null,
      backOfficeRoleId: input.backOfficeRoleId ?? null,
    },
  });
}

export async function getUserOrganigram(userId: string, environmentId: string) {
  const membership = await db.membership.findFirst({
    where: { userId, environmentId },
  });
  if (!membership) return null;

  return db.userOrganigram.findUnique({
    where: { memberId: membership.id },
  });
}
