import { z } from 'zod';
import { Prettify, WithRequired } from '../typescript-utils';
import { VersionedObject } from './versioned-object-schema';

export const ProcessInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  originalId: z.string().optional(),
  folderId: z.string().optional(),
});

export type ProcessInput = z.infer<typeof ProcessInputSchema>;

export const ProcessServerInputSchema = ProcessInputSchema.extend({
  environmentId: z.string(),
  owner: z.string(),
});
export type ProcessServerInput = z.infer<typeof ProcessServerInputSchema>;

export type ProcessMetadata = Prettify<
  WithRequired<ProcessServerInput, 'id' | 'name' | 'description' | 'folderId'> & {
    processIds: string[];
  } & VersionedObject<'process' | 'project' | 'process-instance'>
>;

export type Process = Prettify<ProcessMetadata & { bpmn: string }>;
