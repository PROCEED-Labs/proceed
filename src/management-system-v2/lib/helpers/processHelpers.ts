import { ProcessData } from '@/components/process-import';
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
  generateProcessId,
  getIdentifyingInfos,
  addDocumentation,
  setDefinitionsVersionInformation,
} from '@proceed/bpmn-helper';

interface ProceedProcess {
  id?: string;
  type?: string;
  originalId?: string;
  name?: string;
  description?: string;
  processIds?: string[];
  variables?: { name: string; type: string }[];
  departments?: string[];
  inEditingBy?: { id: string; task: string | null }[];
  createdOn?: string;
  lastEdited?: string;
  shared?: boolean;
  sharedAs?: 'public' | 'protected';
  versions?: Array<string | number>;
}

interface ProcessInfo {
  bpmn: string;
  metaInfo: ProceedProcess;
}

/**
 * Creates a default process meta object containing all fields we expect a process meta object to have
 *
 */
export function getDefaultProcessMetaInfo() {
  const date = new Date().toUTCString();
  return {
    id: '',
    type: 'process',
    originalId: '',
    name: 'Default Process',
    description: '',
    owner: null,
    processIds: [],
    variables: [],
    departments: [],
    inEditingBy: [],
    createdOn: date,
    lastEdited: date,
    shared: false,
    sharedAs: 'public',
    versions: [],
  } as ProceedProcess;
}

/**
 * Creates a new proceed process either from a given bpmn or from a default bpmn template
 * creates a bpmn and a meta info object
 */
export async function createProcess(
  processInfo: ProceedProcess & { bpmn?: string },
  noDefaults: boolean = false,
) {
  let metaInfo = { ...processInfo };
  delete metaInfo.bpmn;

  // create default bpmn if user didn't provide any
  let bpmn = processInfo.bpmn || initXml();

  let definitions;

  try {
    const xmlObj = await toBpmnObject(bpmn);
    [definitions] = getElementsByTagName(xmlObj, 'bpmn:Definitions');
  } catch (err) {
    throw new Error(`Invalid bpmn: ${err}`);
  }

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

  // make sure every process has an id
  processes.forEach((p) => {
    if (!p.id) {
      p.id = generateProcessId();
    }
  });

  metaInfo.processIds = processes.map((p) => p.id);

  const [process] = processes;

  // if the user gave a process description make sure to write it into bpmn
  if (process && processInfo.hasOwnProperty('description')) {
    addDocumentationToProcessObject(process, processInfo.description);
  }

  metaInfo.description = getProcessDocumentationByObject(process);

  bpmn = await toBpmnXml(definitions);

  if (!noDefaults) {
    // make sure metaInfo has all necessary entries for a process meta object
    metaInfo = { ...getDefaultProcessMetaInfo(), ...metaInfo };
  }

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
  definitionId,
  definitionName,
  description,
  bpmn,
}: {
  definitionId: string;
  definitionName: string;
  description: string;
  bpmn: string;
}) => {
  // write the necessary meta info into the bpmn to create the final bpmn that is sent to the backend
  const bpmnObj = await toBpmnObject(bpmn);
  await setDefinitionsId(bpmnObj, definitionId);
  await setDefinitionsName(bpmnObj, definitionName);
  await addDocumentation(bpmnObj, description);
  await setTargetNamespace(bpmnObj, definitionId);

  await setDefinitionsVersionInformation(bpmnObj, {
    version: undefined,
    versionName: undefined,
    versionDescription: undefined,
    versionBasedOn: undefined,
  });

  return await toBpmnXml(bpmnObj);
};
