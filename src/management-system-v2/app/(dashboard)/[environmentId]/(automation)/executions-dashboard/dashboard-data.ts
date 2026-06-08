'use server';

import { getCurrentEnvironment } from '@/components/auth';
import { getRootFolder, getFolderContents } from '@/lib/data/db/folders';
import type { ProcessMetadata } from '@/lib/data/process-schema';
import type { Folder } from '@/lib/data/folder-schema';

type ListItem = ProcessMetadata | (Folder & { type: 'folder' });

async function getAllProcessesRecursive(
  folderId: string,
  ability: any,
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
