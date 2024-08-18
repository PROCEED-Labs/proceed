import { z } from 'zod';
import { VersionedObject } from './versioned-object-schema';
import { Prettify, WithRequired } from '../typescript-utils';
import { LocalizationZod } from './locale';

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
});

export const AbstractConfigInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  metadata: z.record(z.string(), ParameterZod),
  folderId: z.string().optional(),
});

export const StoredParameterZod = ParameterZod.extend({
  parameters: z.array(z.string()),
  key: z.string(),
  parentId: z.string(),
  // TODO: change parent-config type to config
  parentType: z.enum(['parameter', 'machine-config', 'target-config', 'parent-config']),
});
const StoredAbstractConfigInputSchema = AbstractConfigInputSchema.extend({
  metadata: z.array(z.string()),
});

export type AbstractConfigInput = z.infer<typeof AbstractConfigInputSchema>;
export type StoredAbstractConfigInput = z.infer<typeof StoredAbstractConfigInputSchema>;

const AbstractConfigServerInputSchema = AbstractConfigInputSchema.extend({
  environmentId: z.string(),
});
export type AbstractConfigServerInput = z.infer<typeof AbstractConfigServerInputSchema>;

const StoredAbstractConfigServerInputSchema = StoredAbstractConfigInputSchema.extend({
  environmentId: z.string(),
});
export type StoredAbstractConfigServerInput = z.infer<typeof StoredAbstractConfigServerInputSchema>;

export type Metadata = {
  createdOn: string;
  createdBy: string;
  lastEditedBy: string;
  lastEditedOn: string;
};

export type ParameterContent = z.infer<typeof ParameterContentZod>;

export type Parameter = z.infer<typeof ParameterZod>;
export type StoredParameter = z.infer<typeof StoredParameterZod>;

export type AbstractConfigMetadata = Prettify<
  WithRequired<AbstractConfigServerInput, 'id' | 'name' | 'folderId'> &
    Metadata &
    VersionedObject<'config' | 'target-config' | 'machine-config'>
>;
export type StoredAbstractConfigMetaData = WithRequired<
  StoredAbstractConfigServerInput,
  'id' | 'name' | 'folderId'
> &
  Metadata &
  VersionedObject<'config' | 'target-config' | 'machine-config'>;

type WithParameters = {
  parameters: {
    [key: string]: Parameter;
  };
};

type WithParameterReferences = {
  parameters: string[];
};

type WithParentReference = {
  parentId: string;
};

export type MachineConfigMetadata = Prettify<
  AbstractConfigMetadata & WithParameters & VersionedObject<'machine-config'>
>;
export type StoredMachineConfigdata = Prettify<
  StoredAbstractConfigMetaData &
    WithParameterReferences &
    WithParentReference &
    VersionedObject<'machine-config'>
>;

export type TargetConfigMetadata = Prettify<
  AbstractConfigMetadata & WithParameters & VersionedObject<'target-config'>
>;
export type StoredTargetConfigMetadata = Prettify<
  StoredAbstractConfigMetaData &
    WithParameterReferences &
    WithParentReference &
    VersionedObject<'target-config'>
>;

export type ParentConfigMetadata = Prettify<
  AbstractConfigMetadata & {
    targetConfig: TargetConfigMetadata | undefined;
    machineConfigs: MachineConfigMetadata[];
  } & VersionedObject<'config'>
>;
export type StoredParentConfigMetadata = Prettify<
  StoredAbstractConfigMetaData & {
    targetConfig: string | undefined;
    machineConfigs: string[];
  } & VersionedObject<'config'>
>;

export type AbstractConfig = Prettify<AbstractConfigMetadata>;
export type MachineConfig = MachineConfigMetadata;
export type TargetConfig = TargetConfigMetadata;
export type ParentConfig = Prettify<ParentConfigMetadata>;

export type StoredAbstractConfig = Prettify<StoredAbstractConfigMetaData>;
export type StoredMachineConfig = Prettify<StoredMachineConfigdata>;
export type StoredTargetConfig = Prettify<StoredTargetConfigMetadata>;
export type StoredParentConfig = Prettify<StoredParentConfigMetadata>;

//Ideal Schema (actual Metadata is missing)
/*
Configuration:
{
  id: string,                 //added
	metaData: {
		<Parameter>,
		<Parameter>,
		...
	},
	targetConfiguration: {
    <Child Configuration>
	},
	machineConfigurations: [
		<Child Configuration>,
    <Child Configuration>,
		...
	]
}

Child Configuration:
{
    id: string,               //added
		metaData: {
			<Parameter>,
			<Parameter>,
			...
		},
		parameters: {
			<Parameter>,
			<Parameter>,
			...
		}
},

Parameter:
<key>: { 			              //unique on this level
	id: string 		            //unique for on all levels -> used for linking
	type: string	            //schema.org - we probably won’t really do anything with this
	content: [
		{
			displayName: string   //default: key
			value: string
			unit: string
			language: enum        //for the dropdown
		},
		...
	],
	linkedParameters: [ids]
	parameters: {
		<Parameter>,
		<Parameter>,
		...
	}
} */
