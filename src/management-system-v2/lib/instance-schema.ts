import { z } from 'zod';
import { InstanceInfo } from './engines/deployment';

export const InstanceInputSchema = z.object({
  id: z.string(),
  deploymentId: z.string(),
  initiatorId: z.string().nullish().default(null),
  engineIds: z.string().array(),
  state: z.object({}).passthrough(),
});

export type InstanceInput = Omit<z.input<typeof InstanceInputSchema>, 'state'> & {
  state: InstanceInfo;
};
