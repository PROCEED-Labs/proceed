import { z } from 'zod';
import { VersionedObject } from './versioned-object-schema';
import { Prettify, WithRequired } from '../typescript-utils';
import { LocalizationZod } from './locale';

export const configNameLUT = {
  config: 'Tech Data Set',
  'target-config': 'Target Data Set',
  'machine-config': 'Machine Data Set',
  'reference-config': 'Reference Data Set',
};

// ================= AAS schemas and types ======================

const AasTextZod = z.object({
  language: LocalizationZod,
  text: z.string(),
});

const AasSemanticIdKeyZod = z.object({
  type: z.string(),
  value: z.string(),
});

const AasQualifierZod = z.object({
  type: z.string(),
  valueType: z.string(),
  value: z.string(),
  // value: z.union([z.string(), z.boolean()]),
});

const AasSemanticIdZod = z.object({
  type: z.string(),
  keys: z.array(AasSemanticIdKeyZod),
});

const AasReferenceZod = z.object({
  type: z.string(),
  referredSemanticId: AasSemanticIdZod.optional(),
  keys: z.array(AasSemanticIdKeyZod),
});

const AasReferenceElementZod = z.object({
  idShort: z.string(),
  semanticId: AasSemanticIdZod.optional(),
  value: AasReferenceZod,
  modelType: z.string(),
});

const AasPropertyZod = z.object({
  idShort: z.string(),
  displayName: z.array(AasTextZod).optional(),
  description: z.array(AasTextZod).optional(),
  semanticId: AasSemanticIdZod.optional(),
  valueType: z.string(),
  value: z.string(),
  modelType: z.string(),
  qualifiers: z.array(AasQualifierZod),
});

const AasOperationZod = z.object({
  idShort: z.string(),
  displayName: z.array(AasTextZod).optional(),
  description: z.array(AasTextZod).optional(),
  qualifiers: z.array(AasQualifierZod),
  inputVariables: z.array(AasReferenceElementZod),
  modelType: z.string(),
});

const AasSubmodelElementCollectionZod: z.ZodType = z.lazy(() =>
  z.array(z.union([AasSubmodelElementZod, AasPropertyZod, AasOperationZod])),
);

export const AasSubmodelElementZod = z.object({
  category: z.string().optional(),
  idShort: z.string(),
  displayName: z.array(AasTextZod).optional(),
  description: z.array(AasTextZod).optional(),
  value: AasSubmodelElementCollectionZod.optional(),
  modelType: z.string(),
  qualifiers: z.array(AasQualifierZod),
});

export const AasSubmodelZod = z.object({
  idShort: z.string(),
  id: z.string(),
  kind: z.string(),
  submodelElements: AasSubmodelElementCollectionZod,
  modelType: z.string(),
});

// --------- additional AAS types -----------

export const AasSubmodelCollectionZod = z.object({
  submodels: z.array(AasSubmodelZod),
});

export const StoredAasSubmodelZod = z.object({
  id: z.string(),
  submodel: AasSubmodelZod,
  name: z.string(),
  description: z.string(),
  folderId: z.string(),
  environmentId: z.string(),
  createdOn: z.date(),
  createdBy: z.string(),
  lastEditedBy: z.string(),
  lastEditedOn: z.date(),
});

const AasDataSpecificationZod = z.object({
  type: z.string(),
  keys: AasSemanticIdKeyZod.array(),
});

const AasDataSpecificationContentZod = z.object({
  preferredName: z.array(AasTextZod).optional(),
  unit: z.string(),
  modelType: z.string(),
});

const AasAssetInformation = z.object({
  assetKind: z.string(),
  globalAssetId: z.string(),
});

const AasAssetAdministrationShellsZod = z.object({
  id: z.string(),
  idShort: z.string(),
  displayName: z.array(AasTextZod).nonempty(),
  description: z.array(AasTextZod).nonempty(),
  assetInformation: AasAssetInformation,
  submodels: z.array(AasReferenceZod),
  modelType: z.string(),
});

const AasConceptDescriptionZod = z.object({
  idshort: z.string(),
  displayName: z.array(AasTextZod).optional(),
  id: z.string(),
  embeddedDataSpecifications: z.array(
    z.object({
      dataSpecification: AasDataSpecificationZod,
      dataSpecificationContent: AasDataSpecificationContentZod,
    }),
  ),
  modelType: z.string(),
});

export const AasJsonZod = z.object({
  assetAdministrationShells: z.array(AasAssetAdministrationShellsZod).nonempty(),
  submodels: z.array(AasSubmodelZod).nonempty(),
  conceptDescriptions: z.array(AasConceptDescriptionZod),
});

export type StoredAasSubmodel = z.infer<typeof StoredAasSubmodelZod>;
export type AasJson = z.infer<typeof AasJsonZod>;
export type AasSubmodel = z.infer<typeof AasSubmodelZod>;
export type AasSubmodelElement = z.infer<typeof AasSubmodelElementZod>;
export type AasProperty = z.infer<typeof AasPropertyZod>;
export type AasOperation = z.infer<typeof AasOperationZod>;

export type AasReferenceElement = z.infer<typeof AasReferenceElementZod>;
export type AasReference = z.infer<typeof AasReferenceZod>;

export type AasDataSpecificationContent = z.infer<typeof AasDataSpecificationContentZod>;
export type AasConceptDescription = z.infer<typeof AasConceptDescriptionZod>;

// ===================================================
// ================= PROCEED schemas =================
// ===================================================

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

const ParameterArrayZod: z.ZodType = z.lazy(() =>
  z.array(z.union([ParameterZod, VirtualParameterZod])),
);

export const ConfigMetadataZod = z.object({
  shortName: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
});

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
  hasChanges: z.boolean(),
});

const BaseVirtualParameterZod = z.object({
  id: z.string(),
  name: z.string(),
  parameterType: z.enum(['meta', 'content', 'none']),
  structureVisible: z.boolean(),
  displayName: z.array(LocalizedTextZod),
  description: z.array(LocalizedTextZod).optional(),
  valueType: z.string().optional(),
  valueTemplateSource: z.enum(['shortName', 'name', 'description', 'category']),
  unitRef: z.string().optional(),
  usedAsInputParameterIn: z.array(LinkedParameterZod),
  changeableByUser: z.boolean(),
  hasChanges: z.boolean(),
});

export const ParameterZod: z.ZodType<Parameter> = BaseParameterZod.extend({
  subParameters: z.lazy(() => z.array(z.union([ParameterZod, VirtualParameterZod]))),
});

export const VirtualParameterZod: z.ZodType<Parameter> = BaseParameterZod.extend({
  subParameters: z.lazy(() => z.array(z.union([ParameterZod, VirtualParameterZod]))),
});

export const ConfigZod = z.object({
  id: z.string(),
  versionId: z.union([z.string(), z.literal('latest')]), // maybe rather undefined as latest?
  versionPreviousConfigSetId: z.string().optional(),
  templateId: z.string().optional(),
  shortName: MetaAttributeZod,
  name: MetaAttributeZod,
  description: MetaAttributeZod,
  category: MetaAttributeZod,
  content: z.array(z.union([ParameterZod, VirtualParameterZod])),
  folderId: z.string().optional(),
  latestVersionNumber: z.number().int().optional(),
  hasChanges: z.boolean(),
  configType: z.enum(['default', 'dummy', 'tds', 'organization']),
});

export const StoredParameterZod = BaseParameterZod.extend({
  subParameters: z.array(z.string()),
  parentId: z.string(),
  parentType: z.enum(['config', 'parameter']),
});

export const StoredVirtualParameterZod = BaseVirtualParameterZod.extend({
  subParameters: z.array(z.string()),
  parentId: z.string(),
  parentType: z.enum(['config', 'parameter']),
});

export const StoredConfigZod = ConfigZod.extend({
  content: z.array(z.string()),
  environmentId: z.string(),
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

type Metadata = {
  createdOn: Date;
  createdBy: string;
  lastEditedBy: string;
  lastEditedOn: Date;
};

type NamelessVersionedObject = Omit<VersionedObject<'config'>, 'name'>;

type WithSubParameterReferences = {
  subParameters: string[];
};

export type LocalizedText = z.infer<typeof LocalizedTextZod>;
export type ParameterTranformation = z.infer<typeof TranformationZod>;
export type MetaAttribute = z.infer<typeof MetaAttributeZod>;
// export type AasUnit = z.infer<typeof AasUnitZod>;
export type LinkedParameter = z.infer<typeof LinkedParameterZod>;
export type ConfigMetadata = z.infer<typeof ConfigMetadataZod>;

export type Parameter = z.infer<typeof BaseParameterZod> & {
  subParameters: (Parameter | VirtualParameter)[];
};

export type VirtualParameter = z.infer<typeof BaseVirtualParameterZod> & {
  subParameters: (Parameter | VirtualParameter)[];
};
export type Config = Prettify<z.infer<typeof ConfigZod> & Metadata & NamelessVersionedObject>;

export type StoredParameter = z.infer<typeof StoredParameterZod>;
export type StoredVirtualParameter = z.infer<typeof StoredVirtualParameterZod>;
export type StoredConfig = Prettify<z.infer<typeof StoredConfigZod> & NamelessVersionedObject>;

export type MachineVersionReference = z.infer<typeof MachineVersionReferenceZod>;
export type ConfigVersion = z.infer<typeof ConfigVersionZod>;
