import { z } from 'zod';
import { VersionedObject } from './versioned-object-schema';
import { Prettify, WithRequired } from '../typescript-utils';
import { Localization, LocalizationZod } from './locale';

const ParameterZod = z.object({
  id: z.string().optional(),
  type: z.string().optional(),
  content: z.array(
    z.object({
      value: z.string(),
      displayName: z.string(),
      language: LocalizationZod,
      unit: z.string().optional(),
    }),
  ),
  linkedParameters: z.array(z.string()),
  parameters: z.record(z.string(), z.any()),
});

export const AbstractConfigInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  metadata: z.record(z.string(), ParameterZod),
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

export type ParameterContent = z.infer<typeof ParameterZod.shape.content>;

export type Parameter = z.infer<typeof ParameterZod>;

export type AbstractConfigMetadata = Prettify<
  WithRequired<AbstractConfigServerInput, 'id' | 'name' | 'folderId'> &
    Metadata &
    VersionedObject<'config' | 'target-config' | 'machine-config'>
>;

export type MachineConfigMetadata = Prettify<
  WithRequired<AbstractConfigServerInput, 'id' | 'name' | 'folderId'> &
    AbstractConfigMetadata & {
      parameters: {
        [key: string]: Parameter;
      };
    } & VersionedObject<'machine-config'>
>;

export type TargetConfigMetadata = Prettify<
  WithRequired<AbstractConfigServerInput, 'id' | 'name' | 'folderId'> &
    AbstractConfigMetadata & {
      parameters: {
        [key: string]: Parameter;
      };
    } & VersionedObject<'target-config'>
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
