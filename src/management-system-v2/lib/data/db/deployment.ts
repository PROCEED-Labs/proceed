import db from '@/lib/data/db';
import { DeploymentInput, DeploymentInputSchema } from '@/lib/deployments-schema';
import { UserFacingError } from '@/lib/user-error';
import { InstanceInfo } from '@proceed/user-task-helper';

export async function getDeployment(deploymentId: string) {
  const deployment = await db.processDeployment.findUnique({
    where: { id: deploymentId },
    include: { version: true, instances: true },
  });

  if (!deployment) throw new UserFacingError('Deployment could not be found.');

  // TODO: check if the user can access this deployment

  return {
    ...deployment,
    instances: deployment.instances as ((typeof deployment.instances)[number] & {
      state: InstanceInfo;
    })[],
    processId: deployment.version.processId,
  };
}

export async function getDeployments(environmentId: string, skipAbilityCheck = false) {
  const deployments = await db.processDeployment.findMany({
    where: { version: { process: { environmentId } } },
    include: { version: true, instances: true },
  });

  if (!skipAbilityCheck) {
    // TODO: check on a per deployment level if the user can access that deployment
  }

  return deployments.map((d) => ({
    ...d,
    instances: d.instances as ((typeof d.instances)[number] & { state: InstanceInfo })[],
    processId: d.version.processId,
  }));
}

export type StoredDeployment = Awaited<ReturnType<typeof getDeployments>>[number];

export async function getProcessDeployments(processId: string) {
  const deployments = await db.processDeployment.findMany({
    where: { version: { processId } },
    include: { version: true, instances: true },
  });

  return deployments.map((d) => ({
    ...d,
    instances: d.instances as ((typeof d.instances)[number] & { state: InstanceInfo })[],
    processId: d.version.processId,
  }));
}

export async function addProcessDeployment(input: DeploymentInput) {
  const data = DeploymentInputSchema.parse(input);

  return await db.processDeployment.create({ data });
}

export async function updateProcessDeployment(
  deploymentId: string,
  input: Partial<DeploymentInput>,
) {
  const data = DeploymentInputSchema.partial().strict().parse(input);

  return await db.processDeployment.update({
    where: { id: deploymentId },
    data,
  });
}

export async function setRemovedOnProcessDeployments(processId: string) {
  // TODO: handle setting all deployments of a process that is being deleted with prisma instead
  // (see the second prisma migration for an example that was done for artifacts)
  await db.processDeployment.updateMany({
    where: { version: { processId } },
    data: { deleted: true },
  });
}

export async function removeDeployments(deploymentIds: string[]) {
  await db.processDeployment.deleteMany({
    where: {
      OR: deploymentIds.map((id) => ({ id })),
    },
  });
}
