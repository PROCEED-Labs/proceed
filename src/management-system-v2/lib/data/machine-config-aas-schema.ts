import { z } from 'zod';
import { LocalizationZod } from './locale';

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
