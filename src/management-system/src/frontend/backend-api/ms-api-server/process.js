import { v4 } from 'uuid';
import { listen, request, io, connectionId } from './socket.js';
import restRequest from './rest.js';
import eventHandler from '@/frontend/backend-api/event-system/EventHandler.js';
import { isAuthenticated, isAuthRequired } from '@/frontend/backend-api/index.js';
//import store from '@/frontend/main.js';
import * as browserStorage from './browser-storage.js';
import { asyncForEach } from '@/shared-frontend-backend/helpers/javascriptHelpers';

function toInternalFormat(processInformation) {
  const internalFormat = { ...processInformation };
  internalFormat.id = processInformation.definitionId;
  internalFormat.name = processInformation.definitionName;
  delete internalFormat.definitionId;
  delete internalFormat.definitionName;
  return internalFormat;
}

async function getProcessesViaWebsocket() {
  const [backendProcesses] = await request('data_get_processes');
  return backendProcesses;
}

async function getProcessesViaRest() {
  const processes = await restRequest('process', 'noBpmn=true');
  return processes.length ? processes.map((process) => toInternalFormat(process)) : [];
}

/**
 * Pulls process from the backend writes it to the browser storage and returns it
 *
 * @param {String} id the definitions id of the process
 * @param {Boolean} [isUpdate] if the process is known but supposed to be synchronized with the server
 * @returns {Object} The process with the given id
 */
async function pullProcess(id, isUpdate) {
  let process = { ...toInternalFormat(await restRequest(`process/${id}`)), shared: true };

  await observeProcess(id);
  if (isUpdate) {
    process = browserStorage.updateProcessMetaData(id, process);
  } else {
    process = await browserStorage.addProcess(process);
  }

  // get user task data
  const userTasks = await restRequest(`process/${id}/user-tasks`, 'withHtml=true');

  browserStorage.saveUserTasksHtml(id, userTasks);

  // get versions
  const { versions } = process;

  const versionBpmns = {};
  await asyncForEach(versions, async ({ version }) => {
    const versionBpmn = await restRequest(`process/${id}/versions/${version}`);
    versionBpmns[version] = versionBpmn;
  });
  // add versions to the browser storage
  browserStorage.saveVersions(id, versionBpmns);

  return process;
}

async function getProcesses(viaWebsocket = false) {
  let backendProcesses = [];

  if ((isAuthRequired && isAuthenticated) || !isAuthRequired) {
    if (viaWebsocket) {
      backendProcesses = await getProcessesViaWebsocket();
    } else {
      backendProcesses = await getProcessesViaRest();
    }

    await Promise.all(
      backendProcesses.map(async (process) => {
        await observeProcess(process.id);
      })
    );

    backendProcesses = backendProcesses.map((p) => ({ ...p, shared: true }));
  }

  // get locally stored processes and merge with the ones from the server
  let localProcesses = Object.values(browserStorage.getProcesses()).map(async (p) => {
    let processData = { ...p.processData };
    if (processData.shared) {
      try {
        processData = await pullProcess(processData.id, true);
      } catch (err) {
        processData = browserStorage.updateProcessMetaData(processData.id, { shared: false });
      }
    }

    if (processData) {
      delete processData.bpmn;
    }
    return processData;
  });
  // the process might be removed from the browser-storage when the information from the backend indicates that it should be deleted
  localProcesses = (await Promise.all(localProcesses)).filter((data) => !!data);

  // prevent processes from being imported twice if they exist in the local storage and the backend
  backendProcesses = backendProcesses.filter((bP) => !localProcesses.some((lP) => lP.id === bP.id));

  return [...backendProcesses, ...localProcesses];
}

/**
 * Contains process specific connections
 */
const processSockets = {};

/**
 * Unregisters from process namespaces
 *
 * @param {String} processDefinitionsId
 */
async function stopObserving(processDefinitionsId) {
  if (!processSockets[processDefinitionsId]) {
    return;
  }

  const { edit, observe } = processSockets[processDefinitionsId];
  delete processSockets[processDefinitionsId];

  observe.disconnect();
  edit.disconnect();
}

/**
 * Connects to process namespace and sets up handlers for server side events
 *
 * @param {String} processDefinitionsId
 */
export async function observeProcess(processDefinitionsId) {
  // only connect if a connection attempt wasn't previously done
  if (!processSockets[processDefinitionsId]) {
    processSockets[processDefinitionsId] = {};

    const observeSocket = io(
      `https://${window.location.hostname}:33081/process/${processDefinitionsId}/view`,
      { auth: { connectionId } }
    );
    processSockets[processDefinitionsId].observe = observeSocket;

    // check if connection can be established
    processSockets[processDefinitionsId].observeConnect = new Promise((resolve, reject) => {
      observeSocket.on('connect', () => {
        resolve();
      });

      observeSocket.on('connect_error', (err) => {
        reject(`Failed connection to observer socket: ${err.message}`);
      });
    });

    observeSocket.on('bpmn_modeler_event_broadcast', (type, context) => {
      eventHandler.dispatch('processBPMNEvent', {
        processDefinitionsId,
        type,
        context: JSON.parse(context),
      });
    });

    // signals changed bpmn to be stored into local storage (should only happen when the process is not currently open in the editor)
    observeSocket.on('process_xml_updated', (processDefinitionsId, newXml) => {
      if (browserStorage.hasProcess(processDefinitionsId)) {
        browserStorage.updateBPMN(processDefinitionsId, newXml);
      }
    });

    // signals forced bpmn change that has to be pushed into the modeler
    observeSocket.on('process_xml_changed', (processDefinitionsId, newXml) => {
      if (browserStorage.hasProcess(processDefinitionsId)) {
        browserStorage.updateBPMN(processDefinitionsId, newXml);
      }

      eventHandler.dispatch('processXmlChanged', { processDefinitionsId, newXml });
    });

    observeSocket.on('user_task_html_changed', (taskId, newHtml) => {
      if (browserStorage.hasProcess(processDefinitionsId)) {
        if (newHtml) {
          browserStorage.saveUserTaskHTML(processDefinitionsId, taskId, newHtml);
        } else {
          browserStorage.deleteUserTaskHTML(processDefinitionsId, taskId);
        }
      }

      eventHandler.dispatch('processTaskHtmlChanged', { processDefinitionsId, taskId, newHtml });
    });

    observeSocket.on('image_changed', (imageFileName, image) => {
      if (browserStorage.hasProcess(processDefinitionsId)) {
        if (image) {
          const imageBlob = new Blob([image]);
          browserStorage.saveImage(processDefinitionsId, imageFileName, imageBlob);
        } else {
          browserStorage.deleteImage(processDefinitionsId, imageFileName);
        }
      }

      eventHandler.dispatch('processImageChanged', { processDefinitionsId, imageFileName, image });
    });

    observeSocket.on('script_changed_event_broadcast', (elId, elType, script, change) => {
      eventHandler.dispatch('processScriptChanged', {
        processDefinitionsId,
        elId,
        elType,
        script,
        change,
      });
    });

    observeSocket.on('element_constraints_changed', (elementId, constraints) => {
      eventHandler.dispatch('elementConstraintsChanged', {
        processDefinitionsId,
        elementId,
        constraints,
      });
    });

    observeSocket.on('process_updated', (oldId, updatedInfo) => {
      if (browserStorage.hasProcess(oldId, updatedInfo)) {
        updatedInfo = browserStorage.updateProcessMetaData(oldId, updatedInfo);
      }

      eventHandler.dispatch('processUpdated', { oldId, updatedInfo });
    });

    const editSocket = io(
      `https://${window.location.hostname}:33081/process/${processDefinitionsId}/edit`,
      { auth: { connectionId } }
    );
    processSockets[processDefinitionsId].edit = editSocket;

    processSockets[processDefinitionsId].editConnect = new Promise((resolve) => {
      editSocket.on('connect', () => {
        resolve();
      });
    });

    observeSocket.on('process_removed', (processDefinitionsId) => {
      // Process is set to local to signal that it isn't stored on the server anymore
      try {
        if (browserStorage.hasProcess(processDefinitionsId)) {
          const updatedInfo = browserStorage.updateProcessMetaData(processDefinitionsId, {
            shared: false,
          });

          if (updatedInfo) {
            eventHandler.dispatch('processUpdated', { oldId: processDefinitionsId, updatedInfo });
          } else {
            eventHandler.dispatch('processRemoved', { processDefinitionsId });
          }
        } else {
          eventHandler.dispatch('processRemoved', { processDefinitionsId });
        }
      } catch (err) {}

      stopObserving(processDefinitionsId);
    });
  }

  // wait until the connections were succesful
  await processSockets[processDefinitionsId].observeConnect;
  await processSockets[processDefinitionsId].editConnect;
}

async function getProcess(id, preferPullFromBackend) {
  let process;

  if (
    !browserStorage.hasProcess(id) ||
    (preferPullFromBackend && !browserStorage.isProcessLocal(id))
  ) {
    // if the process is not stored locally or if the requesting module explicitly asks to get the server state (only possible if the process is not a local process)
    process = toInternalFormat(await restRequest(`process/${id}`));
  } else {
    ({ processData: process } = browserStorage.getProcess(id));
  }

  return process;
}

/**
 * Will send the process to the backend for authenticated users and shared processes or store it in the browser-storage for unauthenticated users
 *
 * @param {Object} processData
 */
async function addProcess(processData) {
  if (processData.owner) {
    await restRequest('process', undefined, 'POST', 'application/json', processData);
    await observeProcess(processData.id);
  } else {
    // prevent the process to be written to storage and backend when we pulled it from the backend and stored it already
    if (!browserStorage.hasProcess(processData.id)) {
      const processInfo = await browserStorage.addProcess(processData);
      if (processInfo.shared) {
        await restRequest('process', undefined, 'POST', 'application/json', processInfo);
        await observeProcess(processInfo.id);
      }
    }
  }
}

/**
 * Will push the information about a process in the browser storage to the backend server
 *
 * @param {String} processDefinitionsId
 */
async function pushToBackend(processDefinitionsId) {
  if (browserStorage.hasProcess(processDefinitionsId)) {
    // set the process to shared since other have access to it now
    browserStorage.updateProcessMetaData(processDefinitionsId, { shared: true });
    // send the data of the process to the backend
    let {
      processData: process,
      html: htmlData,
      versions,
      images,
    } = browserStorage.getProcess(processDefinitionsId);
    await restRequest('process', undefined, 'POST', 'application/json', {
      ...process,
      versions: [], // leave versions empty to avoid duplicate entries when they are added later
    });
    // start listening to changes on the process
    await observeProcess(processDefinitionsId);
    // send additional user task html data to the backend
    await asyncForEach(Object.entries(htmlData), async ([fileName, html]) => {
      const parser = new DOMParser();
      const serializer = new XMLSerializer();

      const userTaskDocument = parser.parseFromString(html, 'text/html');
      const userTaskImageElements = userTaskDocument.querySelectorAll('img');

      let updatedHtml = html;
      await asyncForEach(Array.from(userTaskImageElements), async (imageEl) => {
        // convert base64 string to image file and push to backend
        const base64String = imageEl.src;
        const blob = await fetch(base64String).then((res) => res.blob());
        const file = new File([blob], { type: blob.type });
        const imageType = blob.type.split('image/').pop();
        const imageFileName = `${fileName}_image${v4()}.${imageType}`;
        // replace base64 string in userTask image with image path
        imageEl.setAttribute(
          'src',
          `/resources/process/${processDefinitionsId}/images/${imageFileName}`
        );
        updatedHtml = serializer.serializeToString(userTaskDocument);
        images[imageFileName] = file;
      });

      await saveUserTaskHTML(processDefinitionsId, fileName, updatedHtml);
    });
    // send additional process versions to the backend
    await asyncForEach(Object.entries(versions), async ([versionNumber, bpmn]) => {
      await addProcessVersion(processDefinitionsId, bpmn);
    });
    // send images to the backend
    await asyncForEach(Object.entries(images), async ([fileName, image]) => {
      let imageFile = image;
      if (typeof imageFile === 'string') {
        // convert base64 string to image file and push to backend
        const imageBlob = await fetch(image).then((res) => res.blob());
        imageFile = new File([imageBlob], { type: imageBlob.type });
      }
      await saveImage(processDefinitionsId, fileName, imageFile);
    });
  }
}

async function updateProcess(id, { bpmn }) {
  // non local processes are updated by the backend using events send by the clients
  if (browserStorage.hasProcess(id)) {
    browserStorage.updateBPMN(id, bpmn);
  }
}

async function updateWholeXml(id, newXml) {
  if (browserStorage.hasProcess(id)) {
    browserStorage.updateBPMN(id, newXml);
  }
  if (!browserStorage.isProcessLocal(id)) {
    await restRequest(`process/${id}`, undefined, 'PUT', 'application/json', { bpmn: newXml });
  }
}

/**
 * Sends the new bpmn of a process for the backend to save
 *
 * @param {String} id id of the process
 * @param {String} bpmn
 * @param {String} processChanges changes to the process meta information that should be merged on the server
 */
async function updateProcessViaWebsocket(id, bpmn, processChanges = {}) {
  processSockets[id].edit.emit('data_updateProcess', bpmn, processChanges);
}

async function updateProcessMetaData(processDefinitionsId, metaDataChanges) {
  if (browserStorage.hasProcess(processDefinitionsId)) {
    browserStorage.updateProcessMetaData(processDefinitionsId, metaDataChanges);
  }

  if (!browserStorage.isProcessLocal(processDefinitionsId)) {
    await new Promise((resolve) => {
      processSockets[processDefinitionsId].edit.emit(
        'data_process_meta_update',
        metaDataChanges,
        () => resolve() // will be called once the server sends acknowledgement
      );
    });
  }
}

async function updateProcessName(id, newName) {
  if (browserStorage.hasProcess(id)) {
    await browserStorage.updateProcessName(id, newName);
  }

  // namechange is send via the modeler events
  // only use this when the name is updated from outside the modeler (e.g. process view)

  // create modeler event
  if (!browserStorage.isProcessLocal(id)) {
    const type = 'definitions.updateProperties';
    const context = { properties: { name: newName } };

    // broadcast event to other clients
    processSockets[id].edit.emit('bpmn_modeler_event', type, JSON.stringify(context));
  }
}

async function updateProcessVersionBasedOn(id, basedOnVersion) {
  if (browserStorage.hasProcess(id)) {
    await browserStorage.updateProcessVersionBasedOn(id, basedOnVersion);
  }

  // based on version change is send via the modeler events
  // only use this when the version is updated from outside the modeler (e.g. version creation modal)

  // create modeler event
  if (!browserStorage.isProcessLocal(id)) {
    const type = 'definitions.updateProperties';
    const context = { properties: { versionBasedOn: basedOnVersion } };

    // broadcast event to other clients
    processSockets[id].edit.emit('bpmn_modeler_event', type, JSON.stringify(context));
  }
}

async function updateProcessDescription(processDefinitionsId, processId, description) {
  if (browserStorage.hasProcess(processDefinitionsId)) {
    await browserStorage.updateProcessDescription(processDefinitionsId, description);
  }

  // description update is send via the modeler events
  // only use this when the description is updated from outside the modeler (e.g. process view)

  // create modeler event
  if (!browserStorage.isProcessLocal(processDefinitionsId)) {
    const type = 'element.updateDocumentation';
    const context = { elementId: processId, documentation: description };

    // broadcast event to other clients
    processSockets[processDefinitionsId].edit.emit(
      'bpmn_modeler_event',
      type,
      JSON.stringify(context)
    );
  }
}

async function removeProcess(id) {
  if (!browserStorage.isProcessLocal(id)) {
    stopObserving(id);
    // A process won't be removed from the backend if a user that is not logged in deletes it (when authentication is used)
    if ((isAuthRequired && isAuthenticated) || !isAuthRequired)
      await restRequest(`process/${id}`, undefined, 'DELETE');
  }

  if (browserStorage.hasProcess(id)) {
    browserStorage.removeProcess(id);
  }
}

/**
 * Will add a new version of a process to the browserstorage and/or to the backend
 *
 * @param {String} processDefinitionsId
 * @param {String} bpmn
 */
async function addProcessVersion(processDefinitionsId, bpmn) {
  if (browserStorage.hasProcess(processDefinitionsId)) {
    await browserStorage.addProcessVersion(processDefinitionsId, bpmn);
  }

  // Send the version to the backend if it is not a local process
  if (!browserStorage.isProcessLocal(processDefinitionsId)) {
    await restRequest(
      `process/${processDefinitionsId}/versions`,
      undefined,
      'POST',
      'application/json',
      { bpmn }
    );
  } else {
    // inform the frontend that the version was succesfully added
    // (if the process is on the server the server would trigger this through the websockets)
    const newMetaData = browserStorage.getProcess(processDefinitionsId).processData;
    delete newMetaData.bpmn;
    eventHandler.dispatch('processUpdated', {
      oldId: processDefinitionsId,
      updatedInfo: newMetaData,
    });
  }
}

/**
 * Gets the bpmn for a specific version of a process from the backend or the browser storage
 *
 * @param {String} processDefinitionsId
 * @param {String|Number} version
 * @returns {String} the bpmn of the process version
 */
async function getProcessVersionBpmn(processDefinitionsId, version) {
  if (browserStorage.isProcessLocal(processDefinitionsId)) {
    return browserStorage.getProcessVersionBpmn(processDefinitionsId, version);
  } else {
    return await restRequest(`process/${processDefinitionsId}/versions/${version}`);
  }
}

async function observeProcessEditing(processDefinitionsId) {
  // cant observe editing for local processes
  if (!browserStorage.isProcessLocal(processDefinitionsId)) {
    if (!processSockets[processDefinitionsId]) {
      throw new Error('Not connected to process socket!');
    }

    processSockets[processDefinitionsId].observe.emit('data_observe_modeling');
  }
}

async function stopObservingProcessEditing(processDefinitionsId) {
  // cant observe editing for local processes
  if (!browserStorage.isProcessLocal(processDefinitionsId)) {
    if (!processSockets[processDefinitionsId]) {
      throw new Error('Not connected to process socket!');
    }

    processSockets[processDefinitionsId].observe.emit('data_stop_observing_modeling');
  }
}

async function blockProcess(processDefinitionsId) {
  if (!browserStorage.isProcessLocal(processDefinitionsId)) {
    processSockets[processDefinitionsId].edit.emit('data_edit_process');
  }
}

async function unblockProcess(processDefinitionsId) {
  if (!browserStorage.isProcessLocal(processDefinitionsId)) {
    processSockets[processDefinitionsId].edit.emit('data_stop_editing_process');
  }
}

async function blockTask(processDefinitionsId, taskId) {
  if (!browserStorage.isProcessLocal(processDefinitionsId)) {
    processSockets[processDefinitionsId].edit.emit('data_blockTask', taskId);
  }
}

async function unblockTask(processDefinitionsId, taskId) {
  if (!browserStorage.isProcessLocal(processDefinitionsId)) {
    processSockets[processDefinitionsId].edit.emit('data_unblockTask', taskId);
  }
}

async function broadcastBPMNEvents(processDefinitionsId, type, context) {
  // prevent updates for local processes from being broadcasted
  if (!browserStorage.isProcessLocal(processDefinitionsId)) {
    processSockets[processDefinitionsId].edit.emit(
      'bpmn_modeler_event',
      type,
      JSON.stringify(context)
    );
  }
}

async function broadcastScriptChangeEvent(processDefinitionsId, elId, elType, script, change) {
  // prevent updates for local processes from being broadcasted
  if (!browserStorage.isProcessLocal(processDefinitionsId)) {
    processSockets[processDefinitionsId].edit.emit(
      'script_changed_event',
      elId,
      elType,
      script,
      JSON.stringify(change)
    );
  }
}

async function updateConstraints(processDefinitionsId, elementId, constraints) {
  // prevent updates for local processes from being broadcasted
  if (!browserStorage.isProcessLocal(processDefinitionsId)) {
    processSockets[processDefinitionsId].edit.emit(
      'data_updateConstraints',
      elementId,
      constraints
    );
  }
}

async function getUserTasksHTML(processDefinitionsId) {
  let taskIdHTMLMap;

  if (browserStorage.hasProcess(processDefinitionsId)) {
    taskIdHTMLMap = browserStorage.getUserTasksHTML(processDefinitionsId);
  } else {
    taskIdHTMLMap = await restRequest(
      `process/${processDefinitionsId}/user-tasks`,
      'withHtml=true'
    );
  }

  return taskIdHTMLMap;
}

async function saveUserTaskHTML(definitionsId, taskFileName, html) {
  if (browserStorage.hasProcess(definitionsId)) {
    browserStorage.saveUserTaskHTML(definitionsId, taskFileName, html);
  }

  if (!browserStorage.isProcessLocal(definitionsId)) {
    return new Promise((resolve) => {
      processSockets[definitionsId].edit.emit('data_saveUserTaskHTML', taskFileName, html, () => {
        resolve();
      });
    });
  }
}

async function deleteUserTaskHTML(processDefinitionsId, taskFileName) {
  if (browserStorage.hasProcess(processDefinitionsId)) {
    browserStorage.deleteUserTaskHTML(processDefinitionsId, taskFileName);
  }

  if (!browserStorage.isProcessLocal(processDefinitionsId)) {
    processSockets[processDefinitionsId].edit.emit('data_deleteUserTaskHTML', taskFileName);
  }
}

async function getImages(processDefinitionsId) {
  let images;

  if (browserStorage.hasProcess(processDefinitionsId)) {
    images = browserStorage.getImages(processDefinitionsId);
  } else {
    images = await restRequest(`process/${processDefinitionsId}/images/`);
  }

  return images;
}

async function getImage(processDefinitionsId, imageFileName) {
  let image;

  if (browserStorage.hasProcess(processDefinitionsId)) {
    image = browserStorage.getImage(processDefinitionsId, imageFileName);
  } else {
    image = await restRequest(`process/${processDefinitionsId}/images/${imageFileName}`);
  }

  return image;
}

async function saveImage(definitionsId, imageFileName, image) {
  if (browserStorage.hasProcess(definitionsId)) {
    await browserStorage.saveImage(definitionsId, imageFileName, image);
  }

  if (!browserStorage.isProcessLocal(definitionsId)) {
    return new Promise((resolve) => {
      processSockets[definitionsId].edit.emit('data_saveImage', imageFileName, image, () => {
        resolve();
      });
    });
  }
}

async function saveScriptTaskJS(processDefinitionsId, taskId, js) {
  if (browserStorage.hasProcess(processDefinitionsId)) {
    browserStorage.saveScriptTaskJS(processDefinitionsId, taskId, js);
  }
  if (!browserStorage.isProcessLocal(processDefinitionsId)) {
    processSockets[processDefinitionsId].edit.emit('data_saveScriptTaskJS', taskId, js);
  }
}

export function setProcessesListener() {
  listen('process_added', async (process) => {
    // await pullProcess(process.id);
    // eventHandler.dispatch('processAdded', { process });
    await observeProcess(process.id);
  });
}

export default {
  getProcesses,
  getProcess,
  addProcess,
  updateProcess,
  updateWholeXml,
  updateProcessViaWebsocket,
  updateProcessMetaData,
  updateProcessName,
  updateProcessVersionBasedOn,
  updateProcessDescription,
  removeProcess,
  addProcessVersion,
  getProcessVersionBpmn,
  observeProcessEditing,
  stopObservingProcessEditing,
  blockProcess,
  unblockProcess,
  blockTask,
  unblockTask,
  broadcastBPMNEvents,
  broadcastScriptChangeEvent,
  updateConstraints,
  getUserTasksHTML,
  saveUserTaskHTML,
  deleteUserTaskHTML,
  getImages,
  getImage,
  saveImage,
  saveScriptTaskJS,
  pullProcess,
  pushToBackend,
};
