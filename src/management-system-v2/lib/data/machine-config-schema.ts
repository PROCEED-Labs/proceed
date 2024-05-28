import { z } from 'zod';
import { VersionedObject } from './versioned-object-schema';

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
  WithRequired<MachineConfigServerInput, 'id' | 'name' | 'folderId'> & {} & VersionedObject<
      'machine-config' | 'product-spec'
    >
>;

export type MachineConfig = Prettify<MachineConfigMetadata>;
