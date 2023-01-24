const system = require('@proceed/system');
const { db, communication } = require('@proceed/distribution');

/**
 * Sends the process definition to the next machine
 *
 * @param {String} ip the ip of the other machine
 * @param {Number} port the port the engine is published on on the other machine
 * @param {String} definitionId the name of the file the process is supposed to be stored under
 * @param {String} the version of the process to forward
 */
async function forwardProcess(ip, port, definitionId, version) {
  const bpmn = await db.getProcessVersion(definitionId, version);
  await system.network.sendData(ip, port, `/process`, 'POST', 'application/json', {
    bpmn,
  });

  await forwardHTML(ip, port, definitionId, version);
  await forwardImports(ip, port, definitionId, version);
}

/**
 * Sends the necessary instance information and the signal to continue the process on the next machine
 *
 * @param {String} ip the ip of the next machine
 * @param {Number} port the port the engine is published on on the next machine
 * @param {String} definitionId the name of the file the process information is supposed to be stored under on the next machine
 * @param {String} instanceId id of the instance we want to continue
 * @param {Object} instanceInfo the complete instance information that exists at this point
 */
async function forwardInstance(ip, port, definitionId, instanceId, instanceInfo) {
  await system.network.sendData(
    ip,
    port,
    `/process/${definitionId}/instance/${instanceId}`,
    'PUT',
    'application/json',
    instanceInfo
  );
}

/**
 * Sends the html information for all user tasks to the next machine
 *
 * @param {String} ip the ip of the next machine
 * @param {Number} port the port the engine is published on on the next machine
 * @param {String} definitionId the name of the file the process information is supposed to be stored under on the next machine
 * @param {Number} the version of the process for which we want to forward the html
 */
async function forwardHTML(ip, port, definitionId, version) {
  const htmlFileNames = await db.getAllUserTasks(definitionId);

  const {
    needs: { html: requiredHtml },
  } = await db.getProcessVersionInfo(definitionId, version);

  const htmlSendRequests = htmlFileNames.map(async (htmlFileName) => {
    if (requiredHtml.includes(htmlFileName)) {
      const html = await db.getHTML(definitionId, htmlFileName);

      await system.network.sendData(
        ip,
        port,
        `/process/${definitionId}/user-tasks/${htmlFileName}`,
        'PUT',
        'application/json',
        {
          html,
        }
      );
    }
  });

  await Promise.all(htmlSendRequests);
}

/**
 * Sends the process descriptions and user task data for all imported processes to the next machine
 *
 * @param {String} ip the ip of the next machine
 * @param {Number} port the port the engine is published on on the next machine
 * @param {String} definitionId the name of the file the process information is supposed to be stored under on the next machine
 * @param {Number} the version of the process for which we want to forward the imports
 */
async function forwardImports(ip, port, definitionId, version) {
  const {
    needs: { imports },
  } = await db.getProcessVersionInfo(definitionId, version);

  const importsSendRequests = imports.map(
    async ({ definitionId: importDefinitionId, version: importVersion }) => {
      await forwardProcess(ip, port, importDefinitionId, importVersion);
    }
  );

  await Promise.all(importsSendRequests);
}

/**
 * Requests additional information about a machine
 *
 * @param {String} ip the ip of the machine
 * @param {Number} port the port the engine is running on
 */
async function getMachineInfo(ip, port) {
  const { body } = await system.network.sendRequest(ip, port, '/machine/id,name,hostname');

  return JSON.parse(body);
}

/**
 * Sends request to abort process instance to all machines in the local network
 *
 * @param {string} definitionId name of the file the process is stored in
 * @param {string} instanceId the id of the instance to abort
 */
async function abortInstanceOnNetwork(definitionId, instanceId) {
  const requests = communication.getAvailableMachines().map(async (machine) => {
    try {
      await system.network.sendData(
        machine.ip,
        machine.port,
        `/process/${definitionId}/instance/${instanceId}/instanceState`,
        'PUT',
        'application/json',
        { instanceState: 'aborted' }
      );
    } catch (err) {}
  });

  await Promise.all(requests);
}

/**
 * Sends request to stop process instance to all machines in the local network
 *
 * @param {string} definitionId name of the file the process is stored in
 * @param {string} instanceId the id of the instance to stop
 */
async function stopInstanceOnNetwork(definitionId, instanceId) {
  const requests = communication.getAvailableMachines().map(async (machine) => {
    try {
      await system.network.sendData(
        machine.ip,
        machine.port,
        `/process/${definitionId}/instance/${instanceId}/instanceState`,
        'PUT',
        'application/json',
        { instanceState: 'stopped' }
      );
    } catch (err) {}
  });

  await Promise.all(requests);
}

/**
 * @memberof module:@proceed/core
 *
 * Exposes functions to send necessary process information to the next machine
 */
module.exports = {
  forwardProcess,
  forwardInstance,
  getMachineInfo,
  abortInstanceOnNetwork,
  stopInstanceOnNetwork,
};
