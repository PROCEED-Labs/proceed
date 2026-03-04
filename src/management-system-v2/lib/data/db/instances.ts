import db from '@/lib/data/db';
import { z } from 'zod';

export async function getInstances(spaceId: string) {
  const instances = await db.processInstance.findMany({
    where: { initiatorSpaceId: spaceId },
  });

  return instances;
}

export async function getInstanceById(instanceId: string) {
  const instance = await db.processInstance.findUnique({
    where: {
      id: instanceId,
    },
  });

  return instance;
}

const InstanceSchema = z.object({
  id: z.string(),
  definitionId: z.string(),
  initiatorId: z.string(),
  initiatorSpaceId: z.string(),
});
export type Instance = z.infer<typeof InstanceSchema>;

export async function addInstance(instanceInput: Instance) {
  const newInstance = InstanceSchema.parse(instanceInput);

  return await db.processInstance.createMany({
    data: [newInstance],
  });
}

export async function deleteInstance(instanceId: string) {
  return await db.processInstance.delete({
    where: {
      id: instanceId,
    },
  });
}

export async function deleteInstances(definitionId: string) {
  return await db.processInstance.deleteMany({
    where: {
      definitionId,
    },
  });
}
