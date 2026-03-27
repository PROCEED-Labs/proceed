import { Config, Parameter } from '@/lib/data/machine-config-schema';

import {
  defaultConfiguration,
  defaultMetaParameter,
  defaultParameter,
} from '../helpers/configuration-helper';

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
    ...defaultMetaParameter(
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
    ...defaultMetaParameter(
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
    ...defaultMetaParameter(
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
    ...defaultMetaParameter(
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
