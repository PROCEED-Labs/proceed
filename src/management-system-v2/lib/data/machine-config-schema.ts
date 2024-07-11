import { string, z } from 'zod';
import { VersionedObject } from './versioned-object-schema';
import { Prettify, WithRequired } from '../typescript-utils';
import { Prop } from 'vue/types/v3-component-props';

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
  displayName: string; //default: key
  value: any;
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
