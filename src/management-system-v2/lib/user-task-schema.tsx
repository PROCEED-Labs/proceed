import { z } from 'zod';

export const UserTaskInputSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  environmentId: z.string(),
  instanceID: z.string().nullable(),
  name: z.string().nullish(),
  fileName: z.string(),
  html: z.string(),
  state: z.string(),
  priority: z.number(),
  progress: z.number(),
  startTime: z.union([z.number().transform((val) => new Date(val)), z.date()]),
  owner: z.string().optional(),
  actualOwner: z.string().array(),
  potentialOwners: z
    .object({
      user: z.string().array().optional(),
      roles: z.string().array().optional(),
    })
    .optional()
    .default({}),
  endTime: z.union([z.number().transform((val) => new Date(val)), z.date()]).nullish(),
  initialVariables: z.record(z.string(), z.any()),
  variableChanges: z.record(z.string(), z.any()),
  milestones: z
    .object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      value: z.number(),
    })
    .array(),
  milestonesChanges: z.record(z.string(), z.number()),
  machineId: z.string(),
  offline: z.boolean().optional(),
});

export type UserTaskInput = z.input<typeof UserTaskInputSchema>;

export type UserTask = z.output<typeof UserTaskInputSchema>;

export type ExtendedTaskListEntry = Omit<UserTask, 'actualOwner'> & {
  actualOwner: { id: string; name: string; userName?: string }[];
};
