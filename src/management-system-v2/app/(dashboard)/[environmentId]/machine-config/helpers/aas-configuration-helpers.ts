import {
  AasOperation,
  AasProperty,
  AasReferenceElement,
  AasSubmodelElement,
} from '@/lib/data/machine-config-aas-schema';
import {
  Config,
  MetaParameter,
  Parameter,
  ParameterTranformation,
} from '@/lib/data/machine-config-schema';

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
