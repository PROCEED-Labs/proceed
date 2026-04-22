import { z } from 'zod';
import { InstanceInfo } from './engines/deployment';

export const DeploymentInputSchema = z.object({
  versionId: z.string(),
  machineIds: z.string().array(),
  deployerId: z.string(),
  deployTime: z.date(),
  deleted: z.boolean().default(false),
  active: z.boolean().default(false),
});

export type DeploymentInput = z.input<typeof DeploymentInputSchema>;
export type Deployment = z.output<typeof DeploymentInputSchema> & {
  id: string;
  deleted: boolean;
};

export const InstanceInputSchema = z.object({
  id: z.string(),
  deploymentId: z.string(),
  versionId: z.string(),
  initiatorId: z.string().nullish().default(null),
  machineIds: z.string().array(),
  state: z.object({}).passthrough(),
});

export type InstanceInput = Omit<z.input<typeof InstanceInputSchema>, 'state'> & {
  state: InstanceInfo;
};
