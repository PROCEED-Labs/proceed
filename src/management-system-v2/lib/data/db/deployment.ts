import db from '@/lib/data/db';
import { DeploymentInput, DeploymentInputSchema } from '@/lib/deployments-schema';
import { AsyncArray } from '@/lib/helpers/javascriptHelpers';
import { cacheLife, cacheTag, updateTag } from 'next/cache';

export async function getDeployedProcesses(environmentId: string) {
  'use cache';
  cacheLife({ stale: 10, revalidate: 10 });
  cacheTag(`deployments/${environmentId}`);
  console.log('Getting deployed processes ', environmentId, '\n\n');

  const deployments = AsyncArray.from(
    db.processDeployment.findMany({
      where: { version: { process: { environmentId } } },
      select: { version: { select: { processId: true } } },
    }),
  );

  return deployments.map((d) => d.version.processId).deduplicate((pId) => pId);
}

export async function getProcessDeployments(spaceId: string, processId: string) {
  'use cache';
  cacheLife({ stale: 5, revalidate: 10, expire: 15 });
  cacheTag(`deployment/process/${processId}`);

  const deployments = await db.processDeployment.findMany({
    where: { version: { processId, process: { environmentId: spaceId } } },
    include: {
      version: { select: { id: true, name: true, processId: true } },
      instances: { select: { id: true } },
    },
  });

  return deployments.map((d) => ({
    ...d,
    instances: d.instances.map((i) => i.id),
    processId: d.version.processId,
  }));
}

export type StoredDeployment = Awaited<ReturnType<typeof getProcessDeployments>>[number];

export async function addProcessDeployment(
  spaceId: string,
  processId: string,
  input: DeploymentInput,
) {
  const data = DeploymentInputSchema.parse(input);

  const result = await db.processDeployment.create({ data });

  updateTag(`deployments/${spaceId}`);
  updateTag(`deployment/process/${processId}`);

  return result;
}

export async function updateProcessDeployment(
  processId: string,
  deploymentId: string,
  input: Partial<DeploymentInput>,
) {
  const data = DeploymentInputSchema.partial().strict().parse(input);

  const result = await db.processDeployment.update({
    where: { id: deploymentId },
    data,
  });

  updateTag(`deployment/process/${processId}`);

  return result;
}

export async function setRemovedOnProcessDeployments(processId: string) {
  // TODO: handle setting all deployments of a process that is being deleted with prisma instead
  // (see the second prisma migration for an example that was done for artifacts)
  await db.processDeployment.updateMany({
    where: { version: { processId } },
    data: { deleted: true, active: false },
  });

  updateTag(`deployment/process/${processId}`);
}
