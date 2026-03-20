import db from '@/lib/data/db';
import { v4 } from 'uuid';
import { OrganigramInput } from '@/lib/data/organigram-schema';

export async function upsertUserOrganigram(input: OrganigramInput) {
  const existing = await db.userOrganigram.findUnique({
    where: { memberId: input.memberId },
  });

  if (existing) {
    return db.userOrganigram.update({
      where: { memberId: input.memberId },
      data: {
        directManagerId: input.directManagerId ?? null,
        teamRoleId: input.teamRoleId ?? null,
        backOfficeRoleId: input.backOfficeRoleId ?? null,
      },
    });
  }

  return db.userOrganigram.create({
    data: {
      id: v4(),
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
