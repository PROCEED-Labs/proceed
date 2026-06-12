import { z } from 'zod';
import { InstanceInfo } from './engines/deployment';

export const InstanceInputSchema = z.object({
  id: z.string(),
  deploymentId: z.string(),
  initiatorId: z.string().nullish().default(null),
  engines: z.string().array(),
  state: z.object({}).passthrough(),
  logs: z.any().array().default([]),
});

export type InstanceInput = Omit<z.input<typeof InstanceInputSchema>, 'state'> & {
  state: InstanceInfo;
};
