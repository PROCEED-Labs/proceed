import { z } from 'zod';

export const UserTaskInputSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  name: z.string().nullish(),
  instanceID: z.string(),
  fileName: z.string(),
  html: z.string().nullish(),
  priority: z.number(),
  progress: z.number(),
  startTime: z.number(),
  endTime: z.number().nullish(),
  initialVariables: z.record(z.string(), z.any()).optional(),
  variableChanges: z.record(z.string(), z.any()).optional(),
  milestones: z
    .object({ id: z.string(), name: z.string(), description: z.string().optional() })
    .array()
    .optional(),
  milestonesData: z.record(z.string(), z.number()).optional(),
  milestonesChanges: z.record(z.string(), z.number()).optional(),
  machineId: z.string(),
});

export type UserTaskInput = z.infer<typeof UserTaskInputSchema>;

export type UserTask = UserTaskInput & { state: string };
