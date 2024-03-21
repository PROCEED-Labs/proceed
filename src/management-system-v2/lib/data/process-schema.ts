import { z } from 'zod';
import { Prettify, WithRequired } from '../typescript-utils';

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
    type: 'process' | 'project' | 'process-instance';
    processIds: string[];
    variables: {
      name: string;
      type: string;
    }[];
    departments: string[];
    inEditingBy?: {
      id: string;
      task?: string;
    }[];
    createdOn: string;
    lastEdited: string;
    sharedAs: 'public' | 'protected';
    shareTimestamp: number;
    allowIframeTimestamp: number;
    versions: {
      version: number;
      name: string;
      description: string;
      versionBasedOn?: number;
    }[];
  }
>;

export type Process = Prettify<ProcessMetadata & { bpmn: string }>;
