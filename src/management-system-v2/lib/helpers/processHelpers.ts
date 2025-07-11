import {
  toBpmnObject,
  toBpmnXml,
  getElementsByTagName,
  generateDefinitionsId,
  setDefinitionsId,
  setStandardDefinitions,
  setTargetNamespace,
  addDocumentationToProcessObject,
  getProcessDocumentationByObject,
  getExporterName,
  getExporterVersion,
  getDefinitionsInfos,
  initXml,
  getDefinitionsName,
  setDefinitionsName,
  getOriginalDefinitionsId,
  getIdentifyingInfos,
  addDocumentation,
  setDefinitionsVersionInformation,
  getUserTaskFileNameMapping,
  setUserTaskData,
  getScriptTaskFileNameMapping,
  setScriptTaskData,
  updateBpmnCreatorAttributes,
  updateBpmnOriginalAttributes,
  getStartFormFileNameMapping,
  setStartFormFileName,
  getAllElements,
} from '@proceed/bpmn-helper';
import { ProcessInput, ProcessInputSchema, ProcessMetadata } from '../data/process-schema';
import { WithRequired } from '../typescript-utils';
import { asyncForEach } from './javascriptHelpers';
import { XMLAttrDBProcessTableColsMap } from './xmlAttr-db-process-cols-map';

interface ProcessInfo {
  bpmn: string;
  metaInfo: WithRequired<ProcessMetadata, 'id' | 'name' | 'description'>;
}

/**
 * Creates a default process meta object containing all fields we expect a process meta object to have
 *
 */
export function getDefaultProcessMetaInfo() {
  const date = new Date();
  return {
    id: '',
    environmentId: '',
    type: 'process',
    originalId: '',
    name: 'Default Process',
    description: '',
    creatorId: '',
    processIds: [],
    //variables: [],
    //departments: [],
    inEditingBy: [],
    createdOn: date,
    lastEditedOn: date,
    sharedAs: 'protected',
    shareTimestamp: 0,
    allowIframeTimestamp: 0,
    versions: [],
    folderId: '',
  } satisfies ProcessMetadata;
}

/**
 * Creates a new proceed process either from a given bpmn or from a default bpmn template
 * creates a bpmn and a meta info object
 */
export async function createProcess(
  processInfo: ProcessInput & { bpmn?: string },
  noDefaults: boolean = false,
) {
  // create default bpmn if user didn't provide any
  let bpmn = processInfo.bpmn || initXml();

  // schema parser removes bpmn property
  let metaInfo = ProcessInputSchema.parse(processInfo);

  let definitions;

  try {
    const xmlObj = await toBpmnObject(bpmn);
    [definitions] = getElementsByTagName(xmlObj, 'bpmn:Definitions');
  } catch (err) {
    throw new Error(`Invalid bpmn: ${err}`);
  }

  // if process is imported, add original attributes
  processInfo.bpmn
    ? updateBpmnOriginalAttributes(definitions, {
        originalId: definitions.id,
        originalName: definitions.name,
        originalCreatorName: definitions.creatorName,
        originalCreatorId: definitions.creatorId,
        originalCreatorUsername: definitions.creatorUsername,
        originalCreatorSpaceId: definitions.creatorSpaceId,
        originalCreatorSpaceName: definitions.creatorSpaceName,
        originalCreationDate: definitions.creationDate,
        originalExporterVersion: definitions.exporterVersion,
        originalProcessVersionId: definitions.processVersionId,
        originalProcessVersionName: definitions.processVersionName,
        originalTargetNamespace: definitions.targetNamespace,
        originalUserDefinedId: definitions.userDefinedId,
        originalExporter: definitions.exporter,
      })
    : null;

  // if we import a process not created in proceed we set the id to a proceed conform id
  const { exporter, id: importDefinitionsId } = await getDefinitionsInfos(definitions);
  if (
    exporter !== getExporterName() &&
    (!processInfo.id || processInfo.id === importDefinitionsId)
  ) {
    processInfo.id = generateDefinitionsId();
  }

  if (!processInfo.name) {
    // try to get name from bpmn object
    metaInfo.name = (await getDefinitionsName(definitions))!;
  }

  setStandardDefinitions(definitions, getExporterName(), getExporterVersion());

  setDefinitionsVersionInformation(definitions, {
    versionId: '',
    versionName: '',
  });

  // add dummy values, these are replaced by db values
  updateBpmnCreatorAttributes(definitions, {
    userDefinedId: processInfo.userDefinedId ?? '',
  });

  if (!metaInfo.name) {
    throw new Error(
      'No name provided (name can be provided in the general information or in the definitions of the given bpmn)',
    );
  }

  // specifically provided id takes precedence over existing id and if there is none a new one is created
  metaInfo.id = processInfo.id || importDefinitionsId || generateDefinitionsId();

  await setDefinitionsId(definitions, metaInfo.id);
  await setDefinitionsName(definitions, metaInfo.name);

  if (!processInfo.originalId) {
    metaInfo.originalId = (await getOriginalDefinitionsId(definitions))!;
  }

  await setTargetNamespace(definitions, metaInfo.id);

  const processes = getElementsByTagName(definitions, 'bpmn:Process');

  // // make sure every process has an id
  // processes.forEach((p) => {
  //   if (!p.id) {
  //     p.id = generateProcessId();
  //   }
  // });
  //
  // metaInfo.processIds = processes.map((p) => p.id);

  const [process] = processes;

  // if the user gave a process description make sure to write it into bpmn
  if (process && processInfo.hasOwnProperty('description')) {
    addDocumentationToProcessObject(process, processInfo.description);
  }

  metaInfo.description = getProcessDocumentationByObject(process);

  bpmn = await toBpmnXml(definitions);

  // if (!noDefaults) {
  //   // make sure metaInfo has all necessary entries for a process meta object
  //   metaInfo = { ...getDefaultProcessMetaInfo(), ...metaInfo };
  // }

  return { metaInfo, bpmn } as ProcessInfo;
}

/**
 * Parses all necessary information from a process description
 *
 */
export async function getProcessInfo(bpmn: string) {
  if (!bpmn || typeof bpmn !== 'string') {
    throw new Error(`Expected given bpmn to be of type string but got ${typeof bpmn} instead!`);
  }

  let definitions;
  try {
    definitions = await toBpmnObject(bpmn);
  } catch (err) {
    throw new Error(`Given process description is invalid. Reason:\n${err}`);
  }

  const metadata = await getIdentifyingInfos(definitions);

  if (!metadata.id) {
    throw new Error('Process definitions do not contain an id.');
  }

  if (!metadata.name) {
    throw new Error('Process definitions do not contain a name.');
  }

  return metadata;
}

export const getFinalBpmn = async ({
  id,
  name,
  description,
  bpmn,
}: {
  id: string;
  name: string;
  description: string;
  bpmn: string;
}) => {
  // write the necessary meta info into the bpmn to create the final bpmn that is sent to the backend
  const bpmnObj = await toBpmnObject(bpmn);

  await setDefinitionsId(bpmnObj, id);
  await setDefinitionsName(bpmnObj, name);
  await addDocumentation(bpmnObj, description);
  await setTargetNamespace(bpmnObj, id);

  await setDefinitionsVersionInformation(bpmnObj, {
    versionId: undefined,
    versionName: undefined,
    versionDescription: undefined,
    versionBasedOn: undefined,
  });

  return await toBpmnXml(bpmnObj);
};

export async function updateFileNames(bpmn: string, formChanges: [string, string][]) {
  let bpmnObj = await toBpmnObject(bpmn);

  const elements = getAllElements(bpmnObj);

  const fileNameAttributes = ['fileName', 'uiForNontypedStartEventsFileName'];
  formChanges = formChanges.map(([oldFile, newFile]) => [
    oldFile.split('.')[0],
    newFile.split('.')[0],
  ]);

  for (const element of elements) {
    for (const [oldName, newName] of formChanges) {
      for (const attribute of fileNameAttributes) {
        if (element[attribute] === oldName) element[attribute] = newName;
      }
    }
  }

  return await toBpmnXml(bpmnObj);
}

type ProcessWithCreatorAndSpace = {
  bpmn: string;
  userDefinedId: string | null;
  id: string;
  createdOn: string;
  name: string;
  originalId: string;
} & {
  creator: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
  } | null;
  space: { name: string | null; id: string };
};

export enum BpmnAttributeType {
  DB_PLACEHOLDER,
  ACTUAL_VALUE,
}

export async function transformBpmnAttributes(
  input: string | ProcessWithCreatorAndSpace,
  transformType: BpmnAttributeType,
): Promise<string> {
  const bpmnString =
    typeof input === 'string' ? input : `<?xml version="1.0" encoding="UTF-8"?>\n${input?.bpmn}`;

  let definitions: object;
  try {
    const xmlObj = await toBpmnObject(bpmnString);
    [definitions] = getElementsByTagName(xmlObj, 'bpmn:Definitions');
  } catch (err) {
    throw new Error(`Invalid BPMN: ${err}`);
  }

  if (transformType === BpmnAttributeType.DB_PLACEHOLDER) {
    const placeholders: Record<string, string> = {};
    Object.entries(XMLAttrDBProcessTableColsMap).forEach(([attrKey, dbPath]) => {
      placeholders[attrKey] = `PROCEED_DB_VALUE_${dbPath}`;
    });

    updateBpmnCreatorAttributes(definitions, placeholders);
  } else {
    const processMeta = input as ProcessWithCreatorAndSpace;
    const actualValues: Record<string, string> = {};

    Object.entries(XMLAttrDBProcessTableColsMap).forEach(([attrKey, dbPath]) => {
      if (dbPath.includes('+')) {
        const parts = dbPath.split('+').map((part) => part.trim());
        const values = parts.map((part) => getNestedValue(processMeta, part) || '');
        actualValues[attrKey] = values.join(' ').trim();
      } else {
        actualValues[attrKey] = getNestedValue(processMeta, dbPath) || '';
      }
    });
    updateBpmnCreatorAttributes(definitions, actualValues);
  }
  const transformedXml = await toBpmnXml(definitions);
  return transformedXml;
}

// Helper function to access nested properties by path (e.g., "creator.firstName")
function getNestedValue(obj: any, path: string): string | null {
  const keys = path.split('.');
  return keys.reduce((o, key) => (o ? o[key] : null), obj);
}
