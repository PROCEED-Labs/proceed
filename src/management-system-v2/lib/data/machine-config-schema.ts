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

export type MachineConfigParameter = {
  key: string;
  value: string;
  unit: string;
  language: string;
  children: MachineConfigParameter[];
};

export type MachineConfigMetadata = Prettify<
  WithRequired<MachineConfigServerInput, 'id' | 'name' | 'folderId'> & {
    targetConfigs: MachineConfigMetadata[];
    machineConfigs: MachineConfigMetadata[];
    parameters: MachineConfigParameter[];
  } & VersionedObject<'machine-config' | 'config' | 'target-config' | 'product-spec'>
>;

export type MachineConfig = Prettify<MachineConfigMetadata>;
