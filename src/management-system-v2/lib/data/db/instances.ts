import db from '@/lib/data/db';
import { InstanceInput, InstanceInputSchema } from '@/lib/deployments-schema';

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
