import {
  Config,
  LinkedParameter,
  LocalizedText,
  MetaAttribute,
  Parameter,
  ParameterTranformation,
  MetaParameter,
  VirtualUserParameter,
} from '@/lib/data/machine-config-schema';
import {
  AasProperty,
  AasSubmodelElement,
  AasOperation,
  AasReferenceElement,
} from '@/lib/data/machine-config-aas-schema';
import { v4 } from 'uuid';

/**
 * Creates a parameter of type Parameter.
 * @param name Name and key for the parameter.
 * @param displayName Display name(s) for the parameter. : AasLocalizedText[]
 * @param description Description(s) for the parameter. : AasLocalizedText[]
 * @param parameterType (optional) 'meta' | 'content' | 'none'
 * @param value (optional) Value of the parameter.
 * @param valueType (optional) Type of the parameters value.
 * @param unitRef (optional) Reference to the unit for the parameters value.
 */
export function defaultParameter(
  name: string,
  displayName: LocalizedText[],
  description: LocalizedText[],
  parameterType: Parameter['parameterType'] = 'none',
  value?: string,
  valueType?: string,
  unitRef?: string,
): Parameter {
  // let newUnit = unit
  //   ? {
  //       displayName: [{ text: unit, language: '' }],
  //       key: unit,
  //       unitSymbol: unit,
  //     }
  //   : undefined;

  return {
    id: v4(),
    // type: 'https://schema.org/' + (displayName?.[0]?.text ?? ''),
    name,
    parameterType,
    structureVisible: true,
    displayName,
    description,
    value,
    valueType,
    unitRef,
    subParameters: [],
    usedAsInputParameterIn: [],
    changeableByUser: true,
    origin: null,
    // unit: newUnit as AasUnit,
    hasChanges: false,
  };
}
/**
 * Creates a parameter of type MetaParameter.
 * @param name Name and key for the parameter.
 * @param displayName Display name(s) for the parameter. : AasLocalizedText[]
 * @param description Description(s) for the parameter. : AasLocalizedText[]
 * @param parameterType (optional) 'meta' | 'content' | 'none'
 * @param valueTemplateSource Template source for the parameters value.
 * @param valueType (optional) Type of the parameters value.
 * @param unitRef (optional) Reference to the unit for the parameters value.
 */
export function defaultMetaParameter(
  name: string,
  displayName: LocalizedText[],
  description: LocalizedText[],
  parameterType: MetaParameter['parameterType'] = 'none',
  valueTemplateSource: MetaParameter['valueTemplateSource'],
  valueType?: string,
  unitRef?: string,
): MetaParameter {
  return {
    id: v4(),
    // type: 'https://schema.org/' + (displayName?.[0]?.text ?? ''),
    name,
    parameterType,
    structureVisible: true,
    displayName,
    description,
    valueTemplateSource,
    valueType,
    unitRef,
    subParameters: [],
    usedAsInputParameterIn: [],
    changeableByUser: true,
    origin: null,
    hasChanges: false,
  };
}

export function defaultConfiguration(
  environmentId: string,
  name?: string,
  shortname?: string,
  description?: string,
  category?: string[],
): Config {
  const date = new Date();
  let newShortname: MetaAttribute = {
    value: shortname ?? 'TDS (new)',
    linkValueToParameterValue: { id: '', path: ['Header', 'TDSIdentifier'] },
  };
  let newName: MetaAttribute = {
    value: name ?? 'Tech Data Set (new)',
    linkValueToParameterValue: { id: '', path: ['Header', 'Name'] },
  };
  let newDescription: MetaAttribute = {
    value: description ?? ' ',
    linkValueToParameterValue: { id: '', path: ['Header', 'Description'] },
  };
  let newCategory: MetaAttribute = {
    value: category ? category.join(';') : '',
    linkValueToParameterValue: { id: '', path: ['Header', 'Categories'] },
  };

  const config = {
    id: v4(),
    versionId: v4(),
    versionPreviousConfigSetId: undefined,
    templateId: undefined,
    shortName: newShortname,
    name: newName,
    description: newDescription,
    category: newCategory,
    content: [],
    versions: [],
    folderId: '',
    environmentId,
    createdBy: '',
    createdOn: date,
    lastEditedBy: '',
    lastEditedOn: date,
    type: 'config',
    sharedAs: 'protected',
    shareTimestamp: 0,
    allowIframeTimestamp: 0,
    hasChanges: false,
    configType: 'default',
  } as Config;

  return config;
}

export const defaultParentConfiguration = (
  folderId: string,
  environmentId: string,
  name?: string,
  shortname?: string,
  description?: string,
  category?: string[],
): Config => {
  return {
    ...defaultConfiguration(environmentId, name, shortname, description, category),
    folderId,
  } as Config;
};

export type TreeSearchedParameter =
  | {
      selection: Parameter | Parameter;
      parent: Config | Parameter;
      type: Parameter['parameterType'];
    }
  | undefined;

export function findParameter(
  id: string,
  _parent: Config | Parameter,
  type: 'config' | 'parameter',
): TreeSearchedParameter {
  let found = undefined;
  if (type === 'config') {
    let parent = _parent as Config;
    for (let parameter of parent.content) {
      if (parameter.id === id) {
        return { selection: parameter, parent: parent, type: parameter.parameterType };
      }
      found = findParameter(id, parameter, 'parameter');
      if (found) return found;
    }
    if (found) return found;
  } else {
    // search in parameter parent
    let parent = _parent as Parameter;
    for (let parameter of parent.subParameters) {
      if (parameter.id === id) {
        return { selection: parameter, parent: parent, type: parameter.parameterType };
      }
      found = findParameter(id, parameter, 'parameter');
      if (found) return found;
    }
  }
  return found;
}

/**
 * Returns a list of all parameters under a parent paired with their "path" to create unique keys
 * @param _parent A config or a parameter that is to be searched.
 * @param type Type of the parent. _"config" | "parameter"_
 * @param path Path describing the parent parameter. Empty for parent config.
 * @returns
 */
export function getAllParameters(
  _parent: Config | Parameter,
  type: 'config' | 'parameter',
  path: string,
): { key: string; value: Parameter }[] {
  let found: { key: string; value: Parameter }[] = [];
  if (type === 'config') {
    let parent = _parent as Config;
    for (let parameter of parent.content) {
      const nextPath = parent.name.value + '.';
      found.push({ key: nextPath + parameter.name, value: parameter });
      found = found.concat(
        getAllParameters(parameter, 'parameter', path + nextPath + parameter.name + '.'),
      );
    }
  } else {
    let parent = _parent as Parameter;
    for (let parameter of parent.subParameters) {
      const nextPath = path;
      found.push({
        key: nextPath + parameter.name,
        value: parameter,
      });
      found = found.concat(
        getAllParameters(parameter, 'parameter', nextPath + parameter.name + '.'),
      );
    }
  }
  return found;
}

export function configToAasFormat(config: Config) {
  let assConfig = {
    assetAdministrationShells: [
      {
        id: 'https://proceed-labs.org/ids/aas/' + config.versionId,
        idShort: config.shortName.value ?? 'TDS',
        displayName: [
          {
            language: 'en',
            text: config.name.value,
          },
        ],
        description: [
          {
            language: 'en',
            text: config.description.value,
          },
        ],
        assetInformation: {
          assetKind: 'NotApplicable',
          globalAssetId: 'https://proceed-labs.org/ids/asset/' + config.id,
        },
        submodels: [
          {
            type: 'ModelReference',
            keys: [
              {
                type: 'Submodel',
                value: 'https://proceed-labs.org/ids/aas/' + config.templateId,
              },
            ],
          },
        ],
        modelType: 'AssetAdministrationShell',
      },
    ],
    submodels: [
      {
        idShort: 'TDSTemplate',
        id: 'https://proceed-labs.org/ids/aas/' + config.templateId,
        displayName: [
          {
            language: 'en',
            text: 'Tech Data Set (TDS) Template',
          },
          {
            language: 'de',
            text: 'Techdaten-Set (TDS) Template',
          },
        ],
        description: [
          {
            language: 'en',
            text: 'The TDS Template contains the structure and data for all production technologies.',
          },
          {
            language: 'de',
            text: 'Das TDS Template beinhaltet die Struktur und Daten f\u00FCr alle Produktiontechnologien.',
          },
        ],
        kind: 'Template',
        submodelElements: config.content.map((param) => parameterToProp(param)).filter(Boolean),
        modelType: 'Submodel',
      },
    ], // paste data here
    conceptDescriptions: [],
    // conceptDescriptions: [
    //   {
    //     idShort: 'H\u00E4rteRockwellC',
    //     displayName: [
    //       {
    //         language: 'en',
    //         text: 'Hardness, Rockwell C',
    //       },
    //       {
    //         language: 'de',
    //         text: 'H\u00E4rte, Rockwell C',
    //       },
    //     ],
    //     id: 'https://example.com/ids/concept/Hardness_RockwellC',
    //     embeddedDataSpecifications: [
    //       {
    //         dataSpecification: {
    //           type: 'ExternalReference',
    //           keys: [
    //             {
    //               type: 'GlobalReference',
    //               value:
    //                 'https://admin-shell.io/DataSpecificationTemplates/DataSpecificationIec61360/3/0',
    //             },
    //           ],
    //         },
    //         dataSpecificationContent: {
    //           preferredName: [
    //             {
    //               language: 'en',
    //               text: 'Hardness, Rockwell C',
    //             },
    //             {
    //               language: 'de',
    //               text: 'H\u00E4rte, Rockwell C',
    //             },
    //           ],
    //           unit: 'HRC',
    //           modelType: 'DataSpecificationIec61360',
    //         },
    //       },
    //     ],
    //     modelType: 'ConceptDescription',
    //   },
    //   {
    //     idShort: 'TemperaturKelvin',
    //     displayName: [
    //       {
    //         language: 'en',
    //         text: 'Temperature (Kelvin)',
    //       },
    //       {
    //         language: 'de',
    //         text: 'Temperatur (Kelvin)',
    //       },
    //     ],
    //     id: 'https://example.com/ids/concept/Temperature_Kelvin',
    //     embeddedDataSpecifications: [
    //       {
    //         dataSpecification: {
    //           type: 'ExternalReference',
    //           keys: [
    //             {
    //               type: 'GlobalReference',
    //               value:
    //                 'https://admin-shell.io/DataSpecificationTemplates/DataSpecificationIec61360/3/0',
    //             },
    //           ],
    //         },
    //         dataSpecificationContent: {
    //           preferredName: [
    //             {
    //               language: 'en',
    //               text: 'Temperature (Kelvin)',
    //             },
    //             {
    //               language: 'de',
    //               text: 'Temperatur (Kelvin)',
    //             },
    //           ],
    //           unit: 'K',
    //           modelType: 'DataSpecificationIec61360',
    //         },
    //       },
    //     ],
    //     modelType: 'ConceptDescription',
    //   },
    //   {
    //     idShort: 'TemperaturCelsius',
    //     displayName: [
    //       {
    //         language: 'en',
    //         text: 'Temperature (Celsius)',
    //       },
    //       {
    //         language: 'de',
    //         text: 'Temperatur (Celsius)',
    //       },
    //     ],
    //     id: 'https://example.com/ids/concept/Temperature_Celsius',
    //     embeddedDataSpecifications: [
    //       {
    //         dataSpecification: {
    //           type: 'ExternalReference',
    //           keys: [
    //             {
    //               type: 'GlobalReference',
    //               value:
    //                 'https://admin-shell.io/DataSpecificationTemplates/DataSpecificationIec61360/3/0',
    //             },
    //           ],
    //         },
    //         dataSpecificationContent: {
    //           preferredName: [
    //             {
    //               language: 'en',
    //               text: 'Temperature (Celsius)',
    //             },
    //             {
    //               language: 'de',
    //               text: 'Temperatur (Celsius)',
    //             },
    //           ],
    //           unit: 'C',
    //           modelType: 'DataSpecificationIec61360',
    //         },
    //       },
    //     ],
    //     modelType: 'ConceptDescription',
    //   },
    // ],
    // paste unit definitions here
  };
  return assConfig;
}

/**
 * Converts a parameter from our internal format to the AAS-Format.
 * @param parameter parameter that is to be converted
 * @return Parameter as a AAS-Prop or AAS-SubmodelElementCollection
 */
export function parameterToProp(parameter: Parameter) {
  if (parameter == undefined) return;
  let AasItem: AasProperty | AasSubmodelElement | AasOperation = {
    idShort: parameter.name,
    displayName: parameter.displayName,
    description: parameter.description,
    value: undefined,
    modelType: '',
    qualifiers: [],
  };
  if (parameter.subParameters.length) {
    AasItem.modelType = 'SubmodelElementCollection';
    AasItem.value = (parameter.subParameters as Parameter[]).map((param) =>
      parameterToProp(param as Parameter),
    );
    (AasItem as AasProperty).qualifiers = parameterDataToQualifiers(parameter);
  } else if (parameter.transformation) {
    // const inputVariables = referenceElementFromTranformation(parameter.transformation);
    // AasItem.modelType = 'Operation';
    // (AasItem as AasProperty).qualifiers = [
    //   ...parameterDataToQualifiers(parameter),
    //   {
    //     type: parameter.transformation.transformationType,
    //     valueType: 'xs:string',
    //     value: parameter.transformation.action,
    //   },
    // ];

    AasItem.modelType = 'Property';
    AasItem.value = parameter.value;
    (AasItem as AasProperty).valueType = parameter.valueType || 'xs:string';
    (AasItem as AasProperty).qualifiers = parameterDataToQualifiers(parameter);
  } else {
    AasItem.modelType = 'Property';
    AasItem.value = parameter.value;
    (AasItem as AasProperty).valueType = parameter.valueType || 'xs:string';
    (AasItem as AasProperty).qualifiers = parameterDataToQualifiers(parameter);
  }
  return AasItem;
}

// TODO CONTINUE HERE FOR AAS-Transformation!
function referenceElementFromTranformation(transformation: ParameterTranformation) {
  const referenceElement: AasReferenceElement[] = Object.entries(
    transformation.linkedInputParameters,
  ).map((key, val) => {
    return {
      idShort: '',
      modelType: 'ReferenceElement',
      value: { type: 'ModelReference', keys: [] },
    };
  });
}

function parameterDataToQualifiers(parameter: Parameter) {
  let qualifiers = [
    {
      type: 'PROCEED-id',
      valueType: 'xs:string',
      value: parameter.id,
    },
    {
      type: 'PROCEED-parameterType',
      valueType: 'xs:string',
      value: parameter.parameterType,
    },
    ...(parameter.unitRef
      ? [
          {
            type: 'PROCEED-unitRef',
            valueType: 'xs:string',
            value: parameter.unitRef,
          },
        ]
      : []),
    ...('valueTemplateSource' in parameter
      ? [
          {
            type: 'PROCEED-valueTemplateSource',
            valueType: 'xs:string',
            value: (parameter as MetaParameter).valueTemplateSource,
          },
        ]
      : []),
    {
      type: 'PROCEED-structureVisible',
      valueType: 'xs:boolean',
      value: `${parameter.structureVisible}`,
    },
    {
      type: 'PROCEED-changeableByUser',
      valueType: 'xs:boolean',
      value: `${parameter.changeableByUser}`,
    },
  ];
  return qualifiers;
}

export function buildLinkedInputParametersFromIds(
  parameterIds: string[],
  parent: Config,
): LinkedParameter[] {
  return parameterIds.map((id) => ({
    id,
    path: findPathToParameter(id, parent, [], 'config'),
  }));
}

export function findPathToParameter(
  id: string,
  _parent: Config | Parameter,
  path: string[],
  type: 'config' | 'parameter',
): string[] {
  let found: string[] = [];
  if (type === 'config') {
    let parent = _parent as Config;
    for (const parameter of parent.content) {
      let parameterPath = Array.from(path);
      parameterPath.push(parameter.name);
      if (parameter.id === id) {
        return parameterPath;
      }
      found = findPathToParameter(id, parameter, parameterPath, 'parameter');
      if (found.length) return found;
    }
  } else {
    // search in parameter parent
    let parent = _parent as Parameter;
    for (const parameter of parent.subParameters) {
      let parameterPath = Array.from(path);
      parameterPath.push(parameter.name);
      if (parameter.id === id) {
        return parameterPath;
      }
      found = findPathToParameter(id, parameter, parameterPath, 'parameter');
      if (found.length) return found;
    }
  }
  return found;
}

/**
 * Extracts a parameter at a given path from a config.
 */
export function extractParameter(configOrParameter: Config | Parameter, path: string[]) {
  if (!path.length) return;

  let current: Parameter | undefined;
  if ('content' in configOrParameter) {
    current = configOrParameter.content.find((p) => p.name === path[0]);
    path = path.slice(1);
  } else current = configOrParameter;

  for (let i = 0; i < path.length && current; i++) {
    current = current.subParameters?.find((p) => p.name === path[i]);
  }

  return current;
}

export function isVirtualUserParameter(p: unknown): p is VirtualUserParameter {
  return typeof p === 'object' && p !== null && 'userId' in p;
}
