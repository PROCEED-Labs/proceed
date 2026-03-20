import { z } from 'zod';
import { Prettify } from '../typescript-utils';
import { LocalizationZod } from './locale';
import { User } from './user-schema';
import { getUser } from './db/machine-config';

export const configNameLUT = {
  config: 'Tech Data Set',
  'target-config': 'Target Data Set',
  'machine-config': 'Machine Data Set',
  'reference-config': 'Reference Data Set',
};

const LocalizedTextZod = z.object({
  language: LocalizationZod,
  text: z.string(),
});

// const AasUnitZod = z.object({
//   key: z.string(),
//   displayName: z.array(AasLocalizedTextZod),
//   unitSymbol: z.string(),
// });

const LinkedParameterZod = z.object({
  id: z.string(),
  path: z.array(z.string()),
});

const TranformationZod = z.object({
  transformationType: z.enum(['none', 'manual', 'linked', 'algorithm', 'external']),
  linkedInputParameters: z.record(z.string(), LinkedParameterZod),
  action: z.string(),
});

const MetaAttributeZod = z.object({
  value: z.string(),
  linkValueToParameterValue: LinkedParameterZod,
});

export const ConfigMetadataZod = z.object({
  shortName: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
});

// ------------- parameter schemas ------------

export const BaseParameterZod = z.object({
  id: z.string(),
  name: z.string(),
  parameterType: z.enum(['meta', 'content', 'none']),
  structureVisible: z.boolean(),
  displayName: z.array(LocalizedTextZod),
  description: z.array(LocalizedTextZod).optional(),
  value: z.string().optional(),
  valueType: z.string().optional(),
  unitRef: z.string().optional(),
  usedAsInputParameterIn: z.array(LinkedParameterZod),
  transformation: TranformationZod.optional(),
  changeableByUser: z.boolean(),
  origin: z.enum(['common-user-data']).nullable(),
  hasChanges: z.boolean(),
  parentId: z.string().optional(),
  parentType: z.enum(['config', 'parameter']).optional(),
});

const BaseMetaParameterZod = BaseParameterZod.extend({
  valueTemplateSource: z.enum(['shortName', 'name', 'description', 'category']),
}).omit({ value: true, transformation: true });

const BaseVirtualParameterZod = BaseParameterZod.omit({
  transformation: true,
});

export const ParameterZod: z.ZodType<Parameter> = BaseParameterZod.extend({
  subParameters: z.lazy(() =>
    z.array(z.union([VirtualUserDataParameterZod, ParameterZod, MetaParameterZod])),
  ),
}).strict();

export const MetaParameterZod: z.ZodType<Parameter> = BaseMetaParameterZod.extend({
  subParameters: z.lazy(() =>
    z.array(z.union([VirtualUserDataParameterZod, ParameterZod, MetaParameterZod])),
  ),
});

export const VirtualUserDataParameterZod: z.ZodType<Parameter> = BaseVirtualParameterZod.extend({
  userId: z.string(),
  subParameters: z.lazy(() =>
    z.array(z.union([VirtualUserDataParameterZod, ParameterZod, MetaParameterZod])),
  ),
}).transform(async (userParameter) => {
  const userInfo = await getUser(userParameter.userId);
  let subParameters: typeof userParameter.subParameters = [];
  if (!userInfo.isGuest) {
    subParameters = userParameter.subParameters.map((param) => {
      const infoValue = userInfo[param.name as keyof User];
      return { ...param, ...(infoValue && { value: infoValue }) };
    });
  }
  const parameter = { ...userParameter, subParameters, userId: undefined };
  delete parameter.userId;
  return parameter;
});

// ------------- config schema -------------

const DBMetaData = z.object({
  createdOn: z.date(),
  createdBy: z.string(),
  lastEditedBy: z.string(),
  lastEditedOn: z.date(),
});

// following './versioned-object-schema'
const ConfigVersioningData = z.object({
  id: z.string(),
  folderId: z.string(),
  type: z.literal('config'),
  inEditingBy: z
    .array(
      z.object({
        userId: z.string(),
        timestamp: z.number(),
      }),
    )
    .optional(),
  createdOn: z.date(),
  lastEditedOn: z.date(),
  sharedAs: z.enum(['public', 'protected']),
  shareTimestamp: z.number(),
  allowIframeTimestamp: z.number(),
  versions: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      versionBasedOn: z.string().optional(),
      createdOn: z.date(),
    }),
  ),
});

const ConfigBaseZod = z.object({
  id: z.string(),
  versionId: z.union([z.string(), z.literal('latest')]), // maybe rather undefined as latest?
  versionPreviousConfigSetId: z.string().optional(),
  templateId: z.string().optional(),
  shortName: MetaAttributeZod,
  name: MetaAttributeZod,
  description: MetaAttributeZod,
  category: MetaAttributeZod,
  content: z.array(z.union([VirtualUserDataParameterZod, ParameterZod, MetaParameterZod])),
  folderId: z.string().optional(),
  latestVersionNumber: z.number().int().optional(),
  hasChanges: z.boolean(),
  configType: z.enum(['default', 'dummy', 'tds', 'organization']),
});

export const ConfigZod = z.object({
  ...ConfigBaseZod.shape,
  ...ConfigVersioningData.shape,
  ...DBMetaData.shape,
});

// ------------- stored variants -------------

export const StoredParameterZod = BaseParameterZod.extend({
  subParameters: z.array(z.string()),
  parentId: z.string(),
  parentType: z.enum(['config', 'parameter']),
});

export const StoredMetaParameterZod = BaseMetaParameterZod.extend({
  subParameters: z.array(z.string()),
  parentId: z.string(),
  parentType: z.enum(['config', 'parameter']),
});

export const StoredConfigZod = ConfigZod.extend({
  content: z.array(z.string()),
  environmentId: z.string(),
  createdOn: z.string(),
  lastEditedOn: z.string(),
});

// ------------- versioning schemas ------------

export const MachineVersionReferenceZod = z.object({
  machineDatasetId: z.string(),
  machineDatasetName: z.string(),
  latestVersionedNo: z.string(),
  latestVersionedAcknowledgedNo: z.string(),
  versions: z.array(z.string()),
});

export const ConfigVersionZod = z.object({
  configId: z.string(),
  versionNo: z.number().int(),
  versionData: ConfigZod,
  machineDatasets: z.array(MachineVersionReferenceZod),
});

// =============== PROCEED types ===============

export type LocalizedText = z.infer<typeof LocalizedTextZod>;
export type ParameterTranformation = z.infer<typeof TranformationZod>;
export type MetaAttribute = z.infer<typeof MetaAttributeZod>;
// export type AasUnit = z.infer<typeof AasUnitZod>;
export type LinkedParameter = z.infer<typeof LinkedParameterZod>;
export type ConfigMetadata = z.infer<typeof ConfigMetadataZod>;

export type Parameter = z.infer<typeof BaseParameterZod> & {
  subParameters: (Parameter | MetaParameter | VirtualUserParameter)[];
};

export type MetaParameter = z.infer<typeof BaseMetaParameterZod> & {
  subParameters: (Parameter | MetaParameter | VirtualUserParameter)[];
};

// export type VirtualUserParameter = z.infer<typeof VirtualUserDataParameterZod>;
export type VirtualUserParameter = z.infer<typeof BaseVirtualParameterZod> & {
  userId: string;
  subParameters: (Parameter | MetaParameter | VirtualUserParameter)[];
};

// export type Config = Prettify<z.infer<typeof ConfigZod> & Metadata & NamelessVersionedObject>;
export type Config = z.infer<typeof ConfigZod>;

export type StoredParameter = z.infer<typeof StoredParameterZod>;
export type StoredMetaParameter = z.infer<typeof StoredMetaParameterZod>;
export type StoredConfig = Prettify<z.infer<typeof StoredConfigZod>>;

export type MachineVersionReference = z.infer<typeof MachineVersionReferenceZod>;
export type ConfigVersion = z.infer<typeof ConfigVersionZod>;
