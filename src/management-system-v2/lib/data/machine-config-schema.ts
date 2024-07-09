import { string, z } from 'zod';
import { VersionedObject } from './versioned-object-schema';
import { Prettify, WithRequired } from '../typescript-utils';

export const ConfigPredefinedLiterals = [
  'description',
  'owner',
  'userId',
  'machine',
  'picture',
] as const;
export type ConfigPredefinedFields = (typeof ConfigPredefinedLiterals)[number];

const ConfigFieldZod = z.object({
  id: z.string(),
  key: z.string(),
  hiding: z.boolean().default(true),
  content: z.array(
    z.object({
      value: z.any(),
      type: z.string(),
      displayName: z.string(),
      language: z.string().optional(),
      unit: z.string().optional(),
    }),
  ),
});

export const AbstractConfigInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  description: ConfigFieldZod.optional(),
  owner: ConfigFieldZod.optional(),
  userId: ConfigFieldZod.optional(),
  machine: ConfigFieldZod.optional(),
  picture: ConfigFieldZod.optional(),
  folderId: z.string().optional(),
});

export type AbstractConfigInput = z.infer<typeof AbstractConfigInputSchema>;

export const AbstractConfigServerInputSchema = AbstractConfigInputSchema.extend({
  environmentId: z.string(),
});

export type AbstractConfigServerInput = z.infer<typeof AbstractConfigServerInputSchema>;

export type Metadata = {
  createdOn: string;
  createdBy: string;
  lastEditedBy: string;
  lastEditedOn: string;
};

//New Schema:
export type PropertyContent = {
  value: any;
  type: string;
  displayName: string; //with default values for the different keys
  language: string | undefined;
  unit: string | undefined;
};

export type Property<T> = {
  id: string | undefined;
  key: T; //'custom' | 'param'
  content: PropertyContent[];
};

export type ConfigParameter = Property<'param'> & //change name to ConfigParameter later
  Metadata & {
    linkedParameters: string[];
    nestedParameters: ConfigParameter[];
  };

export type ConfigField = Property<'custom'>;
//New Schema End

export type AbstractConfigMetadata = Prettify<
  WithRequired<AbstractConfigServerInput, 'id' | 'name' | 'folderId'> &
    Metadata & {
      parameters: ConfigParameter[];
      customFields: ConfigField[];
    } & VersionedObject<'config' | 'target-config' | 'machine-config'>
>;

export type MachineConfigMetadata = Prettify<
  WithRequired<AbstractConfigServerInput, 'id' | 'name' | 'folderId'> &
    AbstractConfigMetadata &
    VersionedObject<'machine-config'>
>;

export type TargetConfigMetadata = Prettify<
  WithRequired<AbstractConfigServerInput, 'id' | 'name' | 'folderId'> &
    AbstractConfigMetadata &
    VersionedObject<'target-config'>
>;

export type ParentConfigMetadata = Prettify<
  WithRequired<AbstractConfigServerInput, 'id' | 'name' | 'folderId'> &
    AbstractConfigMetadata & {
      targetConfig: TargetConfigMetadata | undefined;
      machineConfigs: MachineConfigMetadata[];
    } & VersionedObject<'config'>
>;

export type ParentConfig = Prettify<ParentConfigMetadata>;
export type AbstractConfig = Prettify<AbstractConfigMetadata>;
export type TargetConfig = Prettify<TargetConfigMetadata>;
export type MachineConfig = Prettify<MachineConfigMetadata>;
