import { z } from 'zod';

export const UserTaskInputSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  name: z.string().nullish(),
  instanceID: z.string(),
  fileName: z.string(),
  html: z.string().nullish(),
  state: z.string(),
  priority: z.number(),
  progress: z.number(),
  startTime: z.number(),
  owner: z.string().optional(),
  actualOwner: z.string().array(),
  potentialOwners: z
    .object({
      user: z.string().array().optional(),
      roles: z.string().array().optional(),
    })
    .optional()
    .default({}),
  endTime: z.number().nullish(),
  initialVariables: z.record(z.string(), z.any()).optional(),
  variableChanges: z.record(z.string(), z.any()).optional(),
  milestones: z
    .object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      value: z.number(),
    })
    .array()
    .optional(),
  milestonesChanges: z.record(z.string(), z.number()).optional(),
  machineId: z.string(),
  offline: z.boolean().optional(),
});

export type UserTaskInput = z.infer<typeof UserTaskInputSchema>;

export type UserTask = UserTaskInput;

export type ExtendedTaskListEntry = Omit<UserTask, 'actualOwner'> & {
  actualOwner: { id: string; name: string; userName?: string }[];
};
