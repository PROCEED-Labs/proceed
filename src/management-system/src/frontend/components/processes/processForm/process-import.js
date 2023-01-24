import JSZip from 'jszip';
import {
  ensureCorrectProceedNamespace,
  toBpmnObject,
  getDefinitionsName,
  getDefinitionsId,
  generateDefinitionsId,
} from '@proceed/bpmn-helper';

import { asyncMap } from '@/shared-frontend-backend/helpers/javascriptHelpers.js';

/**
 * @module components
 */
/**
 * @memberof module:components
 * @module processes
 */
/**
 * @memberof module:components.module:processes
 * @module Vue:ProcessForm
 */
/**
 * @memberof module:components.module:processes.module:Vue:ProcessForm
 * @module process-import
 */

/**
 * @typedef {Object} HtmlInfo
 * @property {String} [fileName] the name of the file the user task is (supposed to be) stored in
 * @property {String} html
 * @property {String} state the current state this html is in (missing|existing|obsolete)

 * @typedef {Object} UserTaskInfo
 * @property {String} fileName name of the file the html of this user task is stored in
 * @property {String} implementation how the user task is implemented
 * @property {Boolean} missingAttributes if the fileName and implementation need to be added to the bpmn
 *
 * @typedef {Object} ImportInfo
 * @property {String} bpmnFileAsXml the process definition as a string
 * @property {Object} bpmnFileAsObject the process as a bpmn-moddle-object
 * @property {HtmlInfo} htmlData the html information provided with the process
 */

/**
 * Gets the process from the selected file
 *
 * @param {File} file - the file the user has selected via the web interface, {@link https://developer.mozilla.org/en-US/docs/Web/API/File}
 * @returns { Promise.<ImportInfo[]>} the process information gotten through the import
 * @throws {Error} if importedFile is empty
 * @throws {Error} if the given file can not be converted to a bpmn-moddle object (multiple possible reasons)
 */
export async function getProcessFiles(file) {
  if (!file) {
    throw new Error('Import Error: no file selected.');
  }
  let isZip = false;
  const fileName = file.name;
  let processesData = [];

  if (fileName.endsWith('.bpmn') || fileName.endsWith('.xml')) {
    // get the BPMN XML as string
    processesData.push({ fileName, bpmnFileAsXml: await readFileAsText(file) });
  } else if (fileName.endsWith('.zip')) {
    processesData = await readZipAsync(file);
    isZip = true;
  } else {
    throw new Error('Import Error: Selected file is neither a *.bpmn, *.xml, or *.zip file.');
  }

  // parse every bpmn file into a bpmn moddle object, throw error if parsing fails for a file
  processesData = await asyncMap(processesData, async (pData) => {
    try {
      // making sure the proceed namespace is correct, else it will lead to problems on import with bpmn-moddle
      // every element with proceed prefix would get an ns0 prefix instead
      let xml = ensureCorrectProceedNamespace(pData.bpmnFileAsXml);

      return {
        ...pData,
        bpmnFileAsXml: xml,
        bpmnFileAsObject: await toBpmnObject(xml),
      };
    } catch (err) {
      const zipText = isZip ? ` from zip file ${fileName}` : '';
      throw new Error(`Failed to load ${pData.fileName}${zipText}! Reason: ${err.message}`);
    }
  });

  return processesData;
}

/**
 * Analyses a BPMN if
 *   1. the process exists
 *   2. if its called processes exist
 *   3. if user task data exists or needs to be added
 *
 * @param {(string|object)} bpmn - the process definition as XML string or BPMN-Moddle Object
 * @param {(undefined|Map<String, HtmlInfo>)} htmlData - the html data that was provided alongside the bpmn
 * @param {*} $store - the vuex store to look up processes
 * @returns { Promise.<{ processData: {id: string, name: string, description: string, departments: Array, userTasks: UserTaskInfo, htmlData: HtmlInfo } }>} - the process info needed for an import
 */
export async function analyseBPMNFile(bpmn, htmlData, $store, type, defaultName = '') {
  const bpmnObj = typeof bpmn === 'string' ? await toBpmnObject(bpmn) : bpmn;
  let definitionsId = await getDefinitionsId(bpmnObj);
  const name = (await getDefinitionsName(bpmnObj)) || defaultName.replace(/(\.bpmn|\.xml)$/gm, '');

  let possibleOverrideProcess;
  let possibleDerivedProcesses = [];

  const processFromStore = $store.getters['processStore/processById'](definitionsId);
  // handle already existing processes that would be overwritten
  if (processFromStore) {
    // force a new id if the process to override is of a different type
    if (processFromStore.type !== type) {
      definitionsId = generateDefinitionsId();
    } else {
      possibleOverrideProcess = processFromStore.id;
    }
  } else {
    // see if there are processes that might have been derived from earlier imports of this process
    possibleDerivedProcesses = $store.getters['processStore/processes']
      .filter((p) => p.type === type && p.originalId === definitionsId)
      .map(({ id }) => id);
  }

  return {
    id: possibleOverrideProcess || possibleDerivedProcesses.length ? '' : definitionsId,
    name,
    htmlData,
    possibleOverrideProcess,
    possibleDerivedProcesses,
  };
}

/**
 * Async read file with FileReader as text and
 * resolve the returned Promise once the file content is loaded
 *
 * @param {(Blob|File)} file - selected bpmn file
 * @returns {Promise<string>} Promise containing the content of the file as text
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      resolve(reader.result);
    };

    // few error cases, no error if binary file
    // https://w3c.github.io/FileAPI/#ErrorAndException
    reader.onerror = (event) => {
      reject(`Unable to read selected file: ${reader.error}`);
    };
    reader.readAsText(file);
  });
}

/**
 * @summary Read zip files and searches for bpmn files and user tasks for each bpmn file
 *
 * @param {Blob} zipBlob - zip file containing several bpmn files
 * @returns {Promise<Array<{ fileName: string, bpmnFileAsXml: string, htmlData: HtmlInfo }>>} - array containing all the provided information about the contained processes
 */
export async function readZipAsync(zipBlob) {
  const zip = await JSZip.loadAsync(zipBlob);

  // list all bpmn files inside this zip regardless of the folder depth
  const bpmnFiles = Object.values(zip.files).filter(
    (file) => file.name.endsWith('.bpmn') && !file.dir
  );

  const contentContainer = [];

  for (const bpmnFile of bpmnFiles) {
    // get the actual file name for nested files like 'Delivery-Proces-604fdef1/Delivery-Proces-604fdef1.bpmn'
    const bpmnFileName = bpmnFile.name.split('/').pop();

    // generate folder name like 'Delivery-Proces-604fdef1/user-tasks/'
    const userTaskDir = bpmnFile.name.replace(bpmnFileName, 'user-tasks/');

    // list all html files inside the user-tasks folder which is in the same folder like the current bpmn file
    const userTaskFiles = Object.values(zip.files).filter(
      (file) => file.name.startsWith(userTaskDir) && file.name.endsWith('.html')
    );

    const htmlData = new Map();
    for (const userTaskFile of userTaskFiles) {
      const fileName = userTaskFile.name.split('/').pop().replace('.html', '');
      // resolves the content of the file in a string
      const htmlFileContent = await userTaskFile.async('string');

      htmlData.set(fileName, {
        provided: {
          html: htmlFileContent,
        },
      });
    }

    // resolves the content of the file in a string
    const bpmnFileContent = await bpmnFile.async('string');

    contentContainer.push({
      fileName: bpmnFileName,
      bpmnFileAsXml: bpmnFileContent,
      htmlData,
    });
  }

  return contentContainer;
}
