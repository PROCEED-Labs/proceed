import { z } from 'zod';
import { VersionedObject } from './versioned-object-schema';
import { Prettify, WithRequired } from '../typescript-utils';
import { LocalizationZod } from './locale';

export const CategoriesZod = z.enum([
  'Robotics',
  'Logistics',
  'Category1',
  'Category2',
  'Category3',
  'Category4',
  'Category5',
  'Category6',
  'Category7',
  'Category8',
]);
export type ConfigCategories = z.infer<typeof CategoriesZod>;

// =============== schemas ===============
const ParameterContentZod = z.object({
  value: z.string(),
  displayName: z.string(),
  language: LocalizationZod,
  unit: z.string().optional(),
});

const ParameterZod = z.object({
  id: z.string().optional(),
  type: z.string().optional(),
  content: z.array(ParameterContentZod),
  linkedParameters: z.array(z.string()),
  parameters: z.record(z.string(), z.any()),
  key: z.string(),
});

export const AbstractConfigInputSchema = z.object({
  id: z.string().optional(),
  shortname: z.string().optional(),
  name: z.string().optional(),
  categories: z.array(CategoriesZod),
  metadata: z.record(z.string(), ParameterZod),
  folderId: z.string().optional(),
});

type Metadata = {
  createdOn: Date;
  createdBy: string;
  lastEditedBy: string;
  lastEditedOn: Date;
};

// =============== types ===============
export type AbstractConfigInput = z.infer<typeof AbstractConfigInputSchema>;
export type ParameterContent = z.infer<typeof ParameterContentZod>;
export type Parameter = z.infer<typeof ParameterZod>;

const AbstractConfigServerInputSchema = AbstractConfigInputSchema.extend({
  environmentId: z.string(),
});
type AbstractConfigServerInput = z.infer<typeof AbstractConfigServerInputSchema>;
export type AbstractConfig = Prettify<
  WithRequired<AbstractConfigServerInput, 'id' | 'name' | 'folderId'> &
    Metadata &
    VersionedObject<'config' | 'target-config' | 'machine-config'>
>;

type WithParameters = {
  parameters: {
    [key: string]: Parameter;
  };
};

export type MachineConfig = Prettify<
  AbstractConfig & WithParameters & VersionedObject<'machine-config'>
>;

export type TargetConfig = Prettify<
  AbstractConfig & WithParameters & VersionedObject<'target-config'>
>;

export type ParentConfig = Prettify<
  AbstractConfig & {
    targetConfig: TargetConfig | undefined;
    machineConfigs: MachineConfig[];
  } & VersionedObject<'config'>
>;

// =============== schemas and types for storage ===============

export const StoredParameterZod = ParameterZod.extend({
  parameters: z.array(z.string()),
  parentId: z.string(),
  // TODO: change parent-config type to config
  parentType: z.enum(['parameter', 'machine-config', 'target-config', 'parent-config']),
});

type WithParameterReferences = {
  parameters: string[];
};

type WithParentReference = {
  parentId: string;
};

export type StoredParameter = z.infer<typeof StoredParameterZod>;

const StoredAbstractConfigServerInputSchema = AbstractConfigInputSchema.extend({
  metadata: z.array(z.string()),
  environmentId: z.string(),
});
type StoredAbstractConfigServerInput = z.infer<typeof StoredAbstractConfigServerInputSchema>;
type StoredAbstractConfigMetaData = WithRequired<
  StoredAbstractConfigServerInput,
  'id' | 'name' | 'folderId'
> &
  Metadata &
  VersionedObject<'config' | 'target-config' | 'machine-config'>;

export type StoredMachineConfig = Prettify<
  StoredAbstractConfigMetaData &
    WithParameterReferences &
    WithParentReference &
    VersionedObject<'machine-config'>
>;
export type StoredTargetConfig = Prettify<
  StoredAbstractConfigMetaData &
    WithParameterReferences &
    WithParentReference &
    VersionedObject<'target-config'>
>;

export type StoredParentConfig = Prettify<
  StoredAbstractConfigMetaData & {
    targetConfig: string | undefined;
    machineConfigs: string[];
  } & VersionedObject<'config'>
>;
