'use server';

import { getCurrentEnvironment } from '@/components/auth';
import { getRootFolder, getFolderContents } from '@/lib/data/db/folders';
import type { ProcessMetadata } from '@/lib/data/process-schema';
import type { Folder } from '@/lib/data/folder-schema';
import Ability from '@/lib/ability/abilityHelper';
import db from '@/lib/data/db';
import { getFullMembersWithRoles } from '@/lib/data/db/iam/memberships';

type ListItem = ProcessMetadata | (Folder & { type: 'folder' });

// Returns the user's membership id and whether they have direct reports to determine is user a manager
export async function getMembershipAndManagerStatus(spaceId: string, userId: string) {
  const myMembership = await db.membership.findUnique({
    where: { userId_environmentId: { userId, environmentId: spaceId } },
  });

  if (!myMembership) return { membershipId: null, isManager: false };

  const directReportsCount = await db.userOrganigram.count({
    where: { directManagerId: myMembership.id },
  });

  return { membershipId: myMembership.id, isManager: directReportsCount > 0 };
}

export async function getTeamMemberIds(
  spaceId: string,
  userRole: 'user' | 'manager' | 'admin',
  ability: Ability,
  membershipId?: string | null,
): Promise<string[]> {
  let teamMemberIds: string[] = [];

  // admin sees everyone
  if (userRole === 'admin') {
    const allMembers = await getFullMembersWithRoles(spaceId, ability);
    return allMembers.map((m) => m.id);
  }

  // manager sees only their direct reports
  if (userRole === 'manager' && membershipId) {
    const directReports = await db.userOrganigram.findMany({
      where: { directManagerId: membershipId },
      include: { member: { select: { userId: true } } },
    });
    teamMemberIds = directReports.map((r) => r.member.userId);
  }

  return teamMemberIds;
}

async function getAllProcessesRecursive(
  folderId: string,
  ability: Ability,
  collected: ListItem[] = [],
): Promise<ListItem[]> {
  const contents = await getFolderContents(folderId, ability);
  for (const item of contents) {
    if (item.type === 'process') {
      collected.push(item);
    } else if (item.type === 'folder') {
      collected.push(item);
      await getAllProcessesRecursive(item.id, ability, collected);
    }
  }
  return collected;
}

async function buildFolderTree(
  folderId: string,
  folderName: string,
  ability: Ability,
): Promise<any> {
  const contents = await getFolderContents(folderId, ability);
  const subFolders = contents.filter((item) => item.type === 'folder') as (Folder & {
    type: 'folder';
  })[];
  const processes = contents.filter((item) => item.type === 'process') as ProcessMetadata[];

  return {
    title: folderName,
    value: folderId,
    processIds: processes.map((p) => p.id),
    children: await Promise.all(subFolders.map((f) => buildFolderTree(f.id, f.name, ability))),
  };
}

export async function getFolderTree(spaceId: string) {
  const { ability } = await getCurrentEnvironment(spaceId);
  const rootFolder = await getRootFolder(spaceId, ability);
  return buildFolderTree(rootFolder.id, 'Root', ability);
}

export async function getDashboardProcessStats(spaceId: string) {
  const { ability } = await getCurrentEnvironment(spaceId);
  const rootFolder = await getRootFolder(spaceId, ability);
  const allItems = await getAllProcessesRecursive(rootFolder.id, ability);

  const allProcesses = allItems.filter((item) => item.type === 'process') as ProcessMetadata[];

  const accessibleProcesses = allProcesses.filter(
    (p) => p.versions && p.versions.length > 0,
  ).length;

  const executableProcesses = allProcesses.filter((p) => p.executable).length;

  return {
    accessibleProcesses,
    executableProcesses,
    totalProcesses: allProcesses.length,
  };
}
