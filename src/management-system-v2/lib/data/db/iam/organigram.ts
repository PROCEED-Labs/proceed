import db from '@/lib/data/db';
import { v4 } from 'uuid';
import { OrganigramInput } from '@/lib/data/organigram-schema';

export async function upsertUserOrganigram(input: OrganigramInput) {
  const existing = await db.userOrganigram.findUnique({
    where: { userId_environmentId: { userId: input.userId, environmentId: input.environmentId } },
  });

  if (existing) {
    return db.userOrganigram.update({
      where: { userId_environmentId: { userId: input.userId, environmentId: input.environmentId } },
      data: {
        teamRoleId: input.teamRoleId ?? null,
        directManagerId: input.directManagerId ?? null,
        backOfficeRoleId: input.backOfficeRoleId ?? null,
      },
    });
  }

  return db.userOrganigram.create({
    data: {
      id: v4(),
      userId: input.userId,
      environmentId: input.environmentId,
      teamRoleId: input.teamRoleId ?? null,
      directManagerId: input.directManagerId ?? null,
      backOfficeRoleId: input.backOfficeRoleId ?? null,
    },
  });
}

export async function getUserOrganigram(userId: string, environmentId: string) {
  return db.userOrganigram.findUnique({
    where: { userId_environmentId: { userId, environmentId } },
  });
}
