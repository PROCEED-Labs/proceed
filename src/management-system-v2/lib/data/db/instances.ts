import db from '@/lib/data/db';
import { InstanceInput, InstanceInputSchema } from '@/lib/deployments-schema';
import { InstanceInfo } from '@proceed/user-task-helper';

export async function getProcessInstance(instanceId: string) {
  const instanceInfo = await db.processInstance.findUnique({ where: { id: instanceId } });

  return instanceInfo as typeof instanceInfo & { state: InstanceInfo };
}

export async function addProcessInstance(input: InstanceInput) {
  const data = InstanceInputSchema.parse(input);

  return await db.processInstance.create({ data });
}

export async function updateProcessInstance(instanceId: string, input: Partial<InstanceInput>) {
  const data = InstanceInputSchema.partial().strict().parse(input);

  return await db.processInstance.update({
    where: { id: instanceId },
    data,
  });
}

export async function removeProcessInstance(instanceId: string) {
  return await db.processInstance.delete({
    where: { id: instanceId },
  });
}
