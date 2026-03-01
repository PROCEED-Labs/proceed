import {
  AasOperation,
  AasProperty,
  AasReferenceElement,
  AasSubmodelElement,
  Config,
  LinkedParameter,
  LocalizedText,
  MetaAttribute,
  Parameter,
  ParameterTranformation,
  VirtualParameter,
} from '@/lib/data/machine-config-schema';
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
    origin: 'system',
    // unit: newUnit as AasUnit,
    hasChanges: false,
  };
}
/**
 * Creates a parameter of type AasVirtualParameter.
 * @param name Name and key for the parameter.
 * @param displayName Display name(s) for the parameter. : AasLocalizedText[]
 * @param description Description(s) for the parameter. : AasLocalizedText[]
 * @param parameterType (optional) 'meta' | 'content' | 'none'
 * @param valueTemplateSource Template source for the parameters value.
 * @param valueType (optional) Type of the parameters value.
 * @param unitRef (optional) Reference to the unit for the parameters value.
 */
export function defaultVirtualParameter(
  name: string,
  displayName: LocalizedText[],
  description: LocalizedText[],
  parameterType: VirtualParameter['parameterType'] = 'none',
  valueTemplateSource: VirtualParameter['valueTemplateSource'],
  valueType?: string,
  unitRef?: string,
): VirtualParameter {
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
    origin: 'system',
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

//------------ Organization Template ------------

export function defaultOrganizationConfigurationTemplate(
  environmentId: string,
  name: string,
): Config {
  const organizaionConfig = defaultConfiguration(environmentId, `${name} Data Objects`, name);
  const organizationParameter = createOrgConfigTemplateOrganization();
  const iamParameter = createOrgConfigTemplateIam();
  organizaionConfig.content = [organizationParameter, iamParameter];
  organizaionConfig.id = environmentId;
  organizaionConfig.configType = 'organization';
  return organizaionConfig;
}

function createOrgConfigTemplateOrganization() {
  const organizationParameter = defaultParameter(
    'organization',
    [{ text: 'Organization', language: 'en' }],
    [],
  );
  const dataParameter = defaultParameter('data', [{ text: 'Data', language: 'en' }], []);

  dataParameter.subParameters = [];
  organizationParameter.subParameters = [dataParameter];
  return organizationParameter;
}

function createOrgConfigTemplateIam() {
  const iamParameter = defaultParameter(
    'identity-and-access-management',
    [{ text: 'IAM', language: 'en' }],
    [],
  );
  const userParameter = defaultParameter('user', [{ text: 'User', language: 'en' }], []);
  const commonUserDataParameter = defaultParameter(
    'common-user-data',
    [{ text: 'Common User Data', language: 'en' }],
    [],
  );

  iamParameter.subParameters = [commonUserDataParameter, userParameter];
  return iamParameter;
}

//---------------- User Template ----------------
// TODO loading from Organization Template not implemented yet
export function defaultUserParameterTemplate(
  userId: string,
  membershipId: string,
  firstName: string,
  lastName: string,
): Parameter {
  const userParameter = defaultParameter(
    userId,
    [{ text: `${lastName}, ${firstName}`, language: 'en' }],
    [],
  );
  const dataParameter: Parameter = {
    ...defaultParameter('data', [{ text: `Data`, language: 'en' }], []),
    changeableByUser: false,
  };

  userParameter.id = membershipId;
  userParameter.subParameters = [dataParameter];

  return userParameter;
}

//---------------- TDS Template -----------------
export const defaultTdsConfigurationTemplate = (
  environmentId: string,
  name: string,
  shortname: string,
  description: string,
  category: string[],
): Config => {
  let newHeader = createTdsTemplateHeader();

  let newTargetDataset: Parameter = createTdsTemplateTargetDataset();
  let newReferenceDataset: Parameter = createTdsTemplateReferenceDataset();
  let newMachineDatasets: Parameter = createTdsTemplateMachineDatasets(shortname);

  let headerVersionParameter: Parameter = newHeader.subParameters[3];
  let fullVersionParameter: Parameter =
    newMachineDatasets.subParameters[0].subParameters[0].subParameters[3];
  fullVersionParameter.transformation!.linkedInputParameters['$IN1'].id = headerVersionParameter.id;
  headerVersionParameter.usedAsInputParameterIn[0].id = fullVersionParameter.id;

  let identifier: Parameter = newHeader.subParameters[0];
  let machineIdentifier: Parameter =
    newMachineDatasets.subParameters[0].subParameters[0].subParameters[0];
  identifier.usedAsInputParameterIn[0].id = machineIdentifier.id;
  machineIdentifier.transformation!.linkedInputParameters['$IN1'].id = identifier.id;

  let AcknowledgeModeDefault: Parameter = newHeader.subParameters[4];
  let machineAcknowledgeMode: Parameter =
    newMachineDatasets.subParameters[0].subParameters[0].subParameters[5];
  AcknowledgeModeDefault.usedAsInputParameterIn[0].id = machineAcknowledgeMode.id;
  machineAcknowledgeMode.transformation!.linkedInputParameters['$IN1'].id =
    AcknowledgeModeDefault.id;

  let [
    TDSshortName,
    TDSname,
    TDSdescription,
    TDSversionNumber,
    TDSacknowledgeModeDefault,
    TDScategory,
  ] = newHeader.subParameters;

  let newTDSBody: Parameter = {
    ...createTdsTemplateBody(),
    subParameters: [newTargetDataset, newReferenceDataset, newMachineDatasets],
  };

  let newConfig = {
    ...defaultConfiguration(environmentId, name, shortname, description, category),
    templateId: '5fdf19c5-0a7d-49f7-b966-e9dc53b1be8a',
    content: [newHeader, newTDSBody],
    configType: 'tds',
  } as Config;

  newConfig.shortName.linkValueToParameterValue.id = TDSshortName.id;
  newConfig.name.linkValueToParameterValue.id = TDSname.id;
  newConfig.description.linkValueToParameterValue.id = TDSdescription.id;
  newConfig.category.linkValueToParameterValue.id = TDScategory.id;

  return newConfig;
};

function createTdsTemplateHeader(): Parameter {
  let newHeader = {
    ...defaultParameter(
      'Header',
      [
        {
          text: 'TDS Header',
          language: 'en',
        },
        {
          text: 'TDS Header',
          language: 'de',
        },
      ],
      [
        {
          text: 'Meta data for the whole TDS',
          language: 'en',
        },
        {
          text: 'Metadaten für das gesamte TDS',
          language: 'de',
        },
      ],
      'meta',
    ),
    // comment this out if display-bug in edit mode still persists:
    structureVisible: true,
  };

  let newIdentifier: Parameter = {
    ...defaultVirtualParameter(
      'TDSIdentifier',
      [
        {
          text: 'TDS Identifier',
          language: 'en',
        },
        {
          text: 'TDS Kenner',
          language: 'de',
        },
      ],
      [
        {
          text: '',
          language: 'en',
        },
        {
          text: '',
          language: 'de',
        },
      ],
      'none',
      'shortName',
      'xs:string',
    ),
    structureVisible: true,
    usedAsInputParameterIn: [
      { id: '<uuid>', path: ['Body', 'MachineDatasets', 'MachineDataset-1', 'TDSIdentifier'] },
    ],
  };
  let newName = {
    ...defaultVirtualParameter(
      'Name',
      [
        {
          text: 'Name',
          language: 'en',
        },
        {
          text: 'Name',
          language: 'de',
        },
      ],
      [
        {
          text: 'Long Descriptor of the Technology Data Set',
          language: 'en',
        },
        {
          text: 'Ausführlicher Bezeichner des Technologie-Datensatzes',
          language: 'de',
        },
      ],
      'none',
      'name',
      'xs:string',
    ),
    structureVisible: true,
  };
  let newDescription = {
    ...defaultVirtualParameter(
      'Description',
      [
        {
          text: 'Description',
          language: 'en',
        },
        {
          text: 'Beschreibung',
          language: 'de',
        },
      ],
      [
        {
          text: 'Description of the Technology Data Set',
          language: 'en',
        },
        {
          text: 'Beschreibung des Technologiedatensatzes',
          language: 'de',
        },
      ],
      'none',
      'description',
      'xs:string',
    ),
    structureVisible: true,
  };
  let newVersion: Parameter = {
    ...defaultParameter(
      'VersionNumber',
      [
        {
          text: 'Version Number',
          language: 'en',
        },
        {
          text: 'Versionsnummer',
          language: 'de',
        },
      ],
      [
        {
          text: 'The version number indicates that the structure or content of any parameter of the Target or Reference Dataset has been changed since the last version.',
          language: 'en',
        },
        {
          text: 'Die Versionsnummer zeigt an, dass die Struktur oder der Inhalt eines Parameters des Ziel- oder Referenzdatensatzes seit der letzten Version geändert wurde.',
          language: 'de',
        },
      ],
      'none',
      'latest',
      'xs:integer',
    ),
    usedAsInputParameterIn: [
      { id: '<uuid>', path: ['Body', 'MachineDatasets', 'MachineDataset-1', 'FullVersionNumber'] },
    ],
    changeableByUser: false,
    structureVisible: true,
  };
  let newAcknowledgeModeDefault = {
    ...defaultParameter(
      'AcknowledgeModeDefault',
      [
        {
          text: 'Acknowledge Mode Default Value',
          language: 'en',
        },
        {
          text: 'Freifahrstatus Default-Wert',
          language: 'de',
        },
      ],
      [
        {
          text: 'Acknowledge mode for the technology data set',
          language: 'en',
        },
        {
          text: 'Freifahrstatus des Technologiedatensatzes',
          language: 'de',
        },
      ],
    ),
    usedAsInputParameterIn: [
      { id: '<uuid>', path: ['Body', 'MachineDatasets', 'MachineDataset-1', 'AcknowledgeMode'] },
    ],
    structureVisible: true,
  };
  let newCategory = {
    ...defaultVirtualParameter(
      'Categories',
      [
        {
          text: 'Categories',
          language: 'en',
        },
        {
          text: 'Kategorien',
          language: 'de',
        },
      ],
      [
        {
          text: 'Categories for describing the TDS.',
          language: 'en',
        },
        {
          text: 'Kategorien um das TDS zu beschreiben.',
          language: 'de',
        },
      ],
      'none',
      'category',
    ),
    structureVisible: true,
  };
  return {
    ...newHeader,
    subParameters: [
      newIdentifier,
      newName,
      newDescription,
      newVersion,
      newAcknowledgeModeDefault,
      newCategory,
    ],
  };
}

function createTdsTemplateBody(): Parameter {
  let newTDSBody = defaultParameter(
    'Body',
    [
      {
        text: 'TDS Body',
        language: 'en',
      },
      {
        text: 'TDS Body',
        language: 'de',
      },
    ],
    [
      {
        text: 'Contains parameter data sets specific to components, processes, and production resources',
        language: 'en',
      },
      {
        text: 'Enthält bauteil-, prozess- und produktionsmittelspezifische Parameter-Datensets',
        language: 'de',
      },
    ],
    'content',
  );

  return { ...newTDSBody, structureVisible: true };
}

function createTdsTemplateTargetDataset(): Parameter {
  let newTargetDataset = defaultParameter(
    'TargetDataset',
    [
      {
        text: 'Target Dataset',
        language: 'en',
      },
      {
        text: 'Vorgabe-Datensatz',
        language: 'de',
      },
    ],
    [
      {
        text: 'Target Dataset for the TDS',
        language: 'en',
      },
      {
        text: 'Vorgabe-Datensatz für das TDS',
        language: 'de',
      },
    ],
    'content',
  );

  let newTargetHeader: Parameter = createTdsTemplateTargetHeader();

  let newFeedbackHeader: Parameter = createTdsTemplateTargetFeedbackHeader();

  let newProductDescription: Parameter = defaultParameter(
    'ProductDescription',
    [
      {
        text: 'Product Description',
        language: 'en',
      },
      {
        text: 'Produktbeschreibung',
        language: 'de',
      },
    ],
    [
      {
        text: 'Contains parameters about the properties of the product part',
        language: 'en',
      },
      {
        text: 'Enthält Parameter über die Eigenschaften des zu fertigenden Bauteils',
        language: 'de',
      },
    ],
  );

  let newProcessData: Parameter = defaultParameter(
    'ProcessData',
    [
      {
        text: 'Process Data',
        language: 'en',
      },
      {
        text: 'Prozessdaten',
        language: 'de',
      },
    ],
    [
      {
        text: 'Contains parameters about the production process of the product part',
        language: 'en',
      },
      {
        text: 'Enthält Parameter über den Herstellungsprozess des zu fertigenden Bauteils',
        language: 'de',
      },
    ],
  );

  return {
    ...newTargetDataset,
    subParameters: [newTargetHeader, newFeedbackHeader, newProductDescription, newProcessData],
  };
}

function createTdsTemplateTargetHeader(): Parameter {
  let newTargetHeader = defaultParameter(
    'Header',
    [
      {
        text: 'Header',
        language: 'en',
      },
      {
        text: 'Header',
        language: 'de',
      },
    ],
    [
      {
        text: 'Header for the Target Dataset',
        language: 'en',
      },
      {
        text: 'Header für die Vorgabedaten',
        language: 'de',
      },
    ],
    'meta',
  );

  let newReviewState = defaultParameter(
    'ReviewState',
    [
      {
        text: 'Review State',
        language: 'en',
      },
      {
        text: 'Überprüfungsstatus',
        language: 'de',
      },
    ],
    [
      {
        text: 'Review state of the Target Dataset',
        language: 'en',
      },
      {
        text: 'Überprüfungsstatus des Vorgabendatensets',
        language: 'de',
      },
    ],
  );

  let newTargetParameterSourceReference = defaultParameter(
    'TargetParameterSourceReference',
    [
      {
        text: 'Source Reference',
        language: 'en',
      },
      {
        text: 'Quellenreferenz',
        language: 'de',
      },
    ],
    [
      {
        text: 'References the ID of the DataPicker mapping config',
        language: 'en',
      },
      {
        text: 'Referenziert die Version des DataPicker mapping config',
        language: 'de',
      },
    ],
  );

  return {
    ...newTargetHeader,
    subParameters: [newReviewState, newTargetParameterSourceReference],
  };
}

function createTdsTemplateTargetFeedbackHeader(): Parameter {
  let newFeedbackHeader = defaultParameter(
    'FeedbackHeader',
    [
      {
        text: 'Feedback Header',
        language: 'en',
      },
      {
        text: 'Feedback Header',
        language: 'de',
      },
    ],
    [
      {
        text: 'Feedback Header for the Target Dataset',
        language: 'en',
      },
      {
        text: 'Feedback Header für die Vorgabedaten',
        language: 'de',
      },
    ],
    'meta',
  );

  let newFeedbackID = defaultParameter(
    'FeedbackID',
    [
      {
        text: 'Feedback ID',
        language: 'en',
      },
      {
        text: 'Feedback ID',
        language: 'de',
      },
    ],
    [
      {
        text: 'Feedback identifier for the Target Dataset, e.g. timestamp.',
        language: 'en',
      },
      {
        text: 'Feedbackkennung zum Vorgabe-Datensatz, z.B. Zeitstempel.',
        language: 'de',
      },
    ],
  );
  let newAuthenticationData = defaultParameter(
    'AuthenticationData',
    [
      {
        text: 'Authentication',
        language: 'en',
      },
      {
        text: 'Authentifikation',
        language: 'de',
      },
    ],
    [
      {
        text: 'Person who made changes',
        language: 'en',
      },
      {
        text: 'Person die Änderungen vorgenommen hat',
        language: 'de',
      },
    ],
  );
  let newComment = defaultParameter(
    'Comment',
    [
      {
        text: 'Comment',
        language: 'en',
      },
      {
        text: 'Kommentar',
        language: 'de',
      },
    ],
    [
      {
        text: 'Indicates what was changed in the target dataset.',
        language: 'en',
      },
      {
        text: 'Angaben, was am Vorgabe-Datensatz geändert wurde.',
        language: 'de',
      },
    ],
  );

  return {
    ...newFeedbackHeader,
    subParameters: [newFeedbackID, newAuthenticationData, newComment],
  };
}

function createTdsTemplateReferenceDataset(): Parameter {
  let newReferenceDataset = defaultParameter(
    'ReferenceDataset',
    [
      {
        text: 'Reference Dataset',
        language: 'en',
      },
      {
        text: 'Referenz-Datensatz',
        language: 'de',
      },
    ],
    [
      {
        text: 'Reference Dataset for the TDS',
        language: 'en',
      },
      {
        text: 'Referenz-Datensatz für das TDS',
        language: 'de',
      },
    ],
    'content',
  );

  let newReferenceBody = defaultParameter(
    'Body',
    [
      {
        text: 'Body',
        language: 'en',
      },
      {
        text: 'Body',
        language: 'de',
      },
    ],
    [
      {
        text: 'Contains the generic production parameters for manufactoring a product part',
        language: 'en',
      },
      {
        text: 'Enthält generischen Produktions-Parameter für die Herstellung des zu fertigenden Bauteils',
        language: 'de',
      },
    ],
    'content',
  );

  return {
    ...newReferenceDataset,
    subParameters: [
      createTdsTemplateReferenceHeader(),
      createTdsTemplateReferenceFeedbackHeader(),
      newReferenceBody,
    ],
  };
}

function createTdsTemplateReferenceHeader(): Parameter {
  let newTargetHeader = defaultParameter(
    'Header',
    [
      {
        text: 'Header',
        language: 'en',
      },
      {
        text: 'Header',
        language: 'de',
      },
    ],
    [
      {
        text: 'Header for the Reference Dataset',
        language: 'en',
      },
      {
        text: 'Header für die Referenzdaten',
        language: 'de',
      },
    ],
    'meta',
  );

  let newReviewState = defaultParameter(
    'ReviewState',
    [
      {
        text: 'Review State',
        language: 'en',
      },
      {
        text: 'Überprüfungsstatus',
        language: 'de',
      },
    ],
    [
      {
        text: 'Review state of the Reference Dataset',
        language: 'en',
      },
      {
        text: 'Überprüfungsstatus des Referenz-Datensatzes',
        language: 'de',
      },
    ],
  );

  return {
    ...newTargetHeader,
    subParameters: [newReviewState],
  };
}

function createTdsTemplateReferenceFeedbackHeader(): Parameter {
  let newFeedbackHeader = defaultParameter(
    'FeedbackHeader',
    [
      {
        text: 'Feedback Header',
        language: 'en',
      },
      {
        text: 'Feedback Header',
        language: 'de',
      },
    ],
    [
      {
        text: 'Feedback Header for the Reference Dataset',
        language: 'en',
      },
      {
        text: 'Feedback Header für die Referenzdaten',
        language: 'de',
      },
    ],
    'meta',
  );

  let newFeedbackID = defaultParameter(
    'FeedbackID',
    [
      {
        text: 'Feedback ID',
        language: 'en',
      },
      {
        text: 'Feedback ID',
        language: 'de',
      },
    ],
    [
      {
        text: 'Feedback identifier for the Reference Dataset, e.g. timestamp.',
        language: 'en',
      },
      {
        text: 'Feedbackkennung zum Referenzdatenset, z.B. Zeitstempel.',
        language: 'de',
      },
    ],
  );

  let newAuthenticationData = defaultParameter(
    'AuthenticationData',
    [
      {
        text: 'Authentication',
        language: 'en',
      },
      {
        text: 'Authentifikation',
        language: 'de',
      },
    ],
    [
      {
        text: 'Person who made changes',
        language: 'en',
      },
      {
        text: 'Person die Änderungen vorgenommen hat',
        language: 'de',
      },
    ],
  );

  let newComment = defaultParameter(
    'Comment',
    [
      {
        text: 'Comment',
        language: 'en',
      },
      {
        text: 'Kommentar',
        language: 'de',
      },
    ],
    [
      {
        text: 'Indicates what was changed in the Reference dataset.',
        language: 'en',
      },
      {
        text: 'Angaben, was am Referenzdatenset geändert wurde.',
        language: 'de',
      },
    ],
  );

  return {
    ...newFeedbackHeader,
    subParameters: [newFeedbackID, newAuthenticationData, newComment],
  };
}

function createTdsTemplateMachineDatasets(shortName: string): Parameter {
  let newMachineDatasets = defaultParameter(
    'MachineDatasets',
    [
      {
        text: 'Machine Datasets',
        language: 'en',
      },
      {
        text: 'Maschinen-Datensätze',
        language: 'de',
      },
    ],
    [
      {
        text: 'Contains specific Machine Datasets for multiple production machines',
        language: 'en',
      },
      {
        text: 'Enthält spezifische Maschinen-Datensätze für mehrere Produktionsmaschinen',
        language: 'de',
      },
    ],
  );

  let newMachineBody = defaultParameter(
    'Body',
    [
      {
        text: 'Body',
        language: 'en',
      },
      {
        text: 'Body',
        language: 'de',
      },
    ],
    [
      {
        text: 'Machine Dataset Body',
        language: 'en',
      },
      {
        text: 'Maschinen-Datensatz Body',
        language: 'de',
      },
    ],
  );

  let newMachine1Dataset: Parameter = {
    ...defaultParameter(
      'MachineDataset-1',
      [
        {
          text: 'Machine 1 Parameterset',
          language: 'en',
        },
        {
          text: 'Maschine 1 Parametersatz',
          language: 'de',
        },
      ],
      [
        {
          text: 'Machine 1 Parameterset',
          language: 'en',
        },
        {
          text: 'Maschine 1 Parametersatz',
          language: 'de',
        },
      ],
    ),
    subParameters: [
      createTdsTemplateMachineDatasetHeader(shortName),
      createTdsTemplateMachineDatasetFeedbackHeader(),
      newMachineBody,
    ],
  };

  return {
    ...newMachineDatasets,
    structureVisible: true,
    subParameters: [newMachine1Dataset],
  };
}

export function createTdsTemplateMachineDatasetHeader(shortName: string): Parameter {
  let newMachineDatasetHeader = defaultParameter(
    'Header',
    [
      {
        text: 'Header',
        language: 'en',
      },
      {
        text: 'Header',
        language: 'de',
      },
    ],
    [
      {
        text: 'Machine Dataset Header',
        language: 'en',
      },
      {
        text: 'Maschinen-Datensatz Header',
        language: 'de',
      },
    ],
    'meta',
  );

  let newTDSIdentifier: Parameter = {
    ...defaultParameter(
      'TDSIdentifier',
      [
        {
          text: 'TDS Identifier',
          language: 'en',
        },
        {
          text: 'TDS Kenner',
          language: 'de',
        },
      ],
      [
        {
          text: '',
          language: 'en',
        },
        {
          text: '',
          language: 'de',
        },
      ],
      'none',
      shortName,
    ),
    transformation: {
      transformationType: 'linked',
      linkedInputParameters: {
        $IN1: { id: '<uuid>', path: ['Header', 'TDSIdentifier'] },
      },
      action: '',
    },
  };

  let newStructureVersionNumber: Parameter = {
    ...defaultParameter(
      'StructureVersionNumber',
      [
        {
          text: 'Structure Version',
          language: 'en',
        },
        {
          text: 'Struktur-Version',
          language: 'de',
        },
      ],
      [
        {
          text: 'The structure version number shows a structual change in the Machine Dataset (e.g. to adapt the machine program). It is increased if a parameter was added or deleted in this Machine Dataset.',
          language: 'en',
        },
        {
          text: 'Die Struktur-Version zeigt eine strukturelle Veränderung im Maschinendatensatz an (z.B. um das Maschinenprogramm anzupassen). Sie wird erhöht, wenn ein Parameter in diesem Maschinendatensatz hinzugefügt oder gelöscht wurde.',
          language: 'de',
        },
      ],
      'none',
      'latest',
      'xs:integer',
    ),
    usedAsInputParameterIn: [
      { id: '<uuid>', path: ['Body', 'MachineDatasets', 'MachineDataset-1', 'FullVersionNumber'] },
    ],
    changeableByUser: false,
  };

  let newVersionNumber: Parameter = {
    ...defaultParameter(
      'VersionNumber',
      [
        {
          text: 'Version Number',
          language: 'en',
        },
        {
          text: 'Versionsnummer',
          language: 'de',
        },
      ],
      [
        {
          text: 'The machine version number shows optimization changes in the Machine Dataset by feedback from the Machine Operator. It is increased if a value of a parameter changed by feedback. It is reset to 0 if the change came from the Target Dataset, Reference Dataset or from a structural change in the Machine Dataset.',
          language: 'en',
        },
        {
          text: 'Die Maschinenversionsnummer zeigt Optimierungsänderungen im Maschinendatensatz durch Rückmeldungen des Maschinenbedieners an. Sie wird erhöht, wenn sich der Wert eines Parameters durch Feedback geändert hat. Sie wird auf 0 zurückgesetzt, wenn die Änderung aus dem Target Dataset, dem Referenz Dataset oder aus einer Strukturänderung im Maschinendatensatz stammt.',
          language: 'de',
        },
      ],
      'none',
      'latest',
      'xs:integer',
    ),
    usedAsInputParameterIn: [
      { id: '<uuid>', path: ['Body', 'MachineDatasets', 'MachineDataset-1', 'FullVersionNumber'] },
    ],
    changeableByUser: false,
  };

  let newFullVersionNumber: Parameter = {
    ...defaultParameter(
      'FullVersionNumber',
      [
        {
          text: 'Full Version Number',
          language: 'en',
        },
        {
          text: 'Full-Versionsnummer',
          language: 'de',
        },
      ],
      [
        {
          text: 'Complete, concatenated version number of the TDS',
          language: 'en',
        },
        {
          text: 'Komplette, zusammengesetzte Versionsnummer des TDS',
          language: 'de',
        },
      ],
      'none',
      'latest.latest.latest',
      'xs:string',
    ),
    transformation: {
      transformationType: 'algorithm',
      linkedInputParameters: {
        $IN1: { id: '<uuid>', path: ['Header', 'VersionNumber'] },
        $IN2: {
          id: newStructureVersionNumber.id,
          path: ['Body', 'MachineDatasets', 'MachineDataset-1', 'Header', 'StructureVersionNumber'],
        },
        $IN3: {
          id: newVersionNumber.id,
          path: ['Body', 'MachineDatasets', 'MachineDataset-1', 'Header', 'VersionNumber'],
        },
      },
      action: "$IN1 & '.' & $IN2 & '.' & $IN3",
    },
    changeableByUser: false,
  };

  let newVariantMachineIdentifier = defaultParameter(
    'VariantMachineIdentifier',
    [
      {
        text: 'Variant (Machine Identifier)',
        language: 'en',
      },
      {
        text: 'Variante (Anlagenkenner)',
        language: 'de',
      },
    ],
    [
      {
        text: 'Variant (Machine Identifier)',
        language: 'en',
      },
      {
        text: 'Variante (Anlagenkenner)',
        language: 'de',
      },
    ],
  );

  let newAcknowledgeMode: Parameter = {
    ...defaultParameter(
      'AcknowledgeMode',
      [
        {
          text: 'Acknowledge Mode',
          language: 'en',
        },
        {
          text: 'Freifahr-Status',
          language: 'de',
        },
      ],
      [
        {
          text: 'Acknowledge Mode of the Machine Dataset',
          language: 'en',
        },
        {
          text: 'Freifahr-Status des Maschinen-Datensets',
          language: 'de',
        },
      ],
    ),
    transformation: {
      transformationType: 'linked',
      linkedInputParameters: {
        $IN1: { id: '<uuid>', path: ['Header', 'AcknowledgeModeDefault'] },
      },
      action: '',
    },
  };

  let newReviewState = defaultParameter(
    'ReviewState',
    [
      {
        text: 'Review State',
        language: 'en',
      },
      {
        text: 'Überprüfungsstatus',
        language: 'de',
      },
    ],
    [
      {
        text: 'Review state of the Machine Dataset',
        language: 'en',
      },
      {
        text: 'Überprüfungsstatus des Maschinendatensets',
        language: 'de',
      },
    ],
  );

  newStructureVersionNumber.usedAsInputParameterIn[0].id = newFullVersionNumber.id;
  newVersionNumber.usedAsInputParameterIn[0].id = newFullVersionNumber.id;

  return {
    ...newMachineDatasetHeader,
    subParameters: [
      newTDSIdentifier,
      newStructureVersionNumber,
      newVersionNumber,
      newFullVersionNumber,
      newVariantMachineIdentifier,
      newAcknowledgeMode,
      newReviewState,
    ],
  };
}

function createTdsTemplateMachineDatasetFeedbackHeader(): Parameter {
  let newMachineDatasetFeedbackHeader = defaultParameter(
    'FeedbackHeader',
    [
      {
        text: 'Feedback Header',
        language: 'en',
      },
      {
        text: 'Feedback Header',
        language: 'de',
      },
    ],
    [
      {
        text: 'Machine Feedback Header',
        language: 'en',
      },
      {
        text: 'Maschinen Feedback Header',
        language: 'de',
      },
    ],
    'meta',
  );
  let newMachineFeedbackID = defaultParameter(
    'MachineFeedbackID',
    [
      {
        text: 'Feedback ID',
        language: 'en',
      },
      {
        text: 'Feedback ID',
        language: 'de',
      },
    ],
    [
      {
        text: 'Feedback identifier for the Machine Dataset, e.g. timestamp.',
        language: 'en',
      },
      {
        text: 'Feedbackkennung zum Maschinendatenset, z.B. Zeitstempel.',
        language: 'de',
      },
    ],
  );
  let newAuthenticationData = defaultParameter(
    'AuthenticationData',
    [
      {
        text: 'Authentication',
        language: 'en',
      },
      {
        text: 'Authentifikation',
        language: 'de',
      },
    ],
    [
      {
        text: 'Person who made changes',
        language: 'en',
      },
      {
        text: 'Person die Änderungen vorgenommen hat',
        language: 'de',
      },
    ],
  );
  let newComment = defaultParameter(
    'Comment',
    [
      {
        text: 'Comment',
        language: 'en',
      },
      {
        text: 'Kommentar',
        language: 'de',
      },
    ],
    [
      {
        text: 'Indicates what was changed in the Machine dataset.',
        language: 'en',
      },
      {
        text: 'Angaben, was am Maschinendatenset geändert wurde.',
        language: 'de',
      },
    ],
  );

  return {
    ...newMachineDatasetFeedbackHeader,
    subParameters: [newMachineFeedbackID, newAuthenticationData, newComment],
  };
}

/**
 * Note: this currently contains parts of the template data. [ which is overwritten on addMachineDataSet() ]
 * @param parentConfig
 * @param name
 * @param displayName
 * @returns
 */
export function defaultMachineDataSet(parentConfig: Config, name: string, displayName: string) {
  let newMachineBody = defaultParameter(
    'Body',
    [
      {
        text: 'Body',
        language: 'en',
      },
      {
        text: 'Body',
        language: 'de',
      },
    ],
    [
      {
        text: 'Machine Dataset Body',
        language: 'en',
      },
      {
        text: 'Maschinen-Datensatz Body',
        language: 'de',
      },
    ],
  );
  let newMachineDataset: Parameter = {
    ...defaultParameter(
      name,
      [
        {
          text: displayName,
          language: 'en',
        },
        {
          text: displayName,
          language: 'de',
        },
      ],
      [
        {
          text: 'new Machine Parameterset',
          language: 'en',
        },
        {
          text: 'neuer Maschinenparametersatz',
          language: 'de',
        },
      ],
    ),
    subParameters: [
      createTdsTemplateMachineDatasetHeader(parentConfig.shortName.value),
      createTdsTemplateMachineDatasetFeedbackHeader(),
      newMachineBody,
    ],
  };
  return newMachineDataset;
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
            value: (parameter as VirtualParameter).valueTemplateSource,
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
