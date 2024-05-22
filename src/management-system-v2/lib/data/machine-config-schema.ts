import { z } from 'zod';

export const MachineConfigInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  folderId: z.string().optional(),
});

export type MachineConfigInput = z.infer<typeof MachineConfigInputSchema>;

// Adapted from Process Schema:

import { Prettify, WithRequired } from '../typescript-utils';

export const MachineConfigServerInputSchema = MachineConfigInputSchema.extend({
  environmentId: z.string(),
  owner: z.string(),
});
export type MachineConfigServerInput = z.infer<typeof MachineConfigServerInputSchema>;

export type MachineConfigMetadata = Prettify<
  WithRequired<MachineConfigServerInput, 'id' | 'name' | 'folderId'> & {
    type: 'machine-config' | 'product-spec';
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

export type MachineConfig = Prettify<MachineConfigMetadata>;
