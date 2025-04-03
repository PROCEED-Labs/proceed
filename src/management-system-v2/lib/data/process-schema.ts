import { z } from 'zod';
import { Prettify, WithRequired } from '../typescript-utils';
import { VersionedObject } from './versioned-object-schema';

export const ProcessInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  originalId: z.string().optional(),
  basedOnTemplateId: z.string().optional(),
  basedOnTemplateVersion: z.string().optional(),
  folderId: z.string().optional(),
  isTemplate: z.boolean().optional(),
});

export type ProcessInput = z.infer<typeof ProcessInputSchema>;

export const ProcessServerInputSchema = ProcessInputSchema.extend({
  environmentId: z.string(),
  creatorId: z.string(),
});
export type ProcessServerInput = z.infer<typeof ProcessServerInputSchema>;

export type ProcessMetadata = Prettify<
  WithRequired<ProcessServerInput, 'id' | 'name' | 'description' | 'folderId'> & {
    processIds: string[];
  } & VersionedObject<'process' | 'project' | 'process-instance' | 'template'>
>;

export type Process = Prettify<ProcessMetadata & { bpmn: string }>;
