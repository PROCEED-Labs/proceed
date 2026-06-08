import { z } from 'zod';

export const DeploymentInputSchema = z.object({
  versionId: z.string(),
  deployerId: z.string(),
  deployTime: z.date(),
  removeTime: z.date().nullable().default(null),
  toRemove: z.boolean().default(false),
  active: z.boolean().default(false),
  engineIds: z.string().array(),
});

export type DeploymentInput = z.input<typeof DeploymentInputSchema>;
export type Deployment = z.output<typeof DeploymentInputSchema> & {
  id: string;
};
