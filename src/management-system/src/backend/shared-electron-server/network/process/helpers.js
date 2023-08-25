import { getMachines } from '../../data/machines.js';

import { asyncFilter } from '../../../../shared-frontend-backend/helpers/javascriptHelpers.js';

import { toListString } from '../../../../shared-frontend-backend/helpers/arrayHelpers.js';

import {
  getProcessVersionBpmn as getLocalVersionBpmn,
  getProcessUserTasksHtml as getLocalUserTasksHtml,
  getProcesses,
} from '../../data/process.js';

import bpmnEx from '@proceed/bpmn-helper';
const { getAllUserTaskFileNamesAndUserTaskIdsMapping } = bpmnEx;

import loggingEx from '@proceed/machine';
import { processEndpoint } from '../ms-engine-communication/module.js';
import { getDeployments } from '../../data/deployment.js';
const { logging } = loggingEx;

const configObject = {
  moduleName: 'MS',
  consoleOnly: true,
};

export let logger = null;

async function getLogger() {
  logger = await logging.getLogger(configObject);
}
getLogger();

/**
 * Waits for request to resolve or reject and returns the result and information if it succeded
 *
 * @param {promise} request the request we await to resolve
 *
 * @returns {object} object containing a result and a status member
 */
export async function settleRequest(request) {
  let result;
  let status;
  try {
    result = await request;
    status = 'Succeeded';
  } catch (err) {
    result = err;
    status = 'Failed';
  }

  return { result, status };
}

/**
 * Returns the bpmn of a process version that is either stored locally or on a known engine
 *
 * @param {String} processDefinitionsId
 * @param {Number} version
 * @returns {String} the bpmn of the requested process version
 * @throws throws an error if the process version is not known locally and also not deployed to any known engine
 */
export async function getProcessVersionBpmn(processDefinitionsId, version) {
  // return the locally stored bpmn if the process and the version are known
  const process = getProcesses().find((process) => process.id === processDefinitionsId);
  if (process && process.versions.some(({ version: knownVersion }) => knownVersion == version)) {
    return getLocalVersionBpmn(processDefinitionsId, version);
  }

  // get the bpmn from the deployment on one of the machines it is deployed to
  const deployment = getDeployments()[processDefinitionsId];

  if (deployment) {
    const versionInfo = deployment.versions.find(
      ({ version: deployedVersion }) => deployedVersion == version,
    );
    if (versionInfo) {
      return versionInfo.bpmn;
    }
  }

  throw new Error(
    `The requested process version (id: ${processDefinitionsId}, version ${version}) could neither be found locally nor on a known engine.`,
  );
}

/**
 * Returns the html for all User Tasks in the given bpmn
 *
 * @param {String} processDefinitionsId the id of the process definitions
 * @param {String} bpmn the process model containing the User Tasks
 * @returns {Object.<string, string>} the html for all files referenced in the bpmn
 * @throws will throw when at least one html file cannot be found
 */
export async function getProcessUserTasksHtml(processDefinitionsId, bpmn) {
  let requiredFileNames = Object.keys(await getAllUserTaskFileNamesAndUserTaskIdsMapping(bpmn));

  const files = {};

  // try to get all user task files that are locally known if the process is stored locally
  const process = getProcesses().find((process) => process.id === processDefinitionsId);
  if (process) {
    const localProcessHtml = await getLocalUserTasksHtml(processDefinitionsId);

    requiredFileNames = requiredFileNames.filter((fileName) => {
      // the file exists locally => remove from list of files that are still required
      if (localProcessHtml[fileName]) {
        files[fileName] = localProcessHtml[fileName];
        return false;
      }

      // file is not in list of locally known html => keep as required file
      return true;
    });
  }

  // try to get the html data from the engines the process is deployed to
  const deployment = getDeployments()[processDefinitionsId];

  if (deployment) {
    for (const machine of deployment.machines) {
      const userTaskFiles = await processEndpoint.getUserTasks(machine, processDefinitionsId);

      requiredFileNames = await asyncFilter(requiredFileNames, async (fileName) => {
        if (userTaskFiles.some((fN) => fN === fileName)) {
          files[fileName] = await processEndpoint.getUserTaskHTML(
            machine,
            processDefinitionsId,
            fileName,
          );
          return false;
        }

        return true;
      });

      if (!requiredFileNames.length) break;
    }
  }

  if (requiredFileNames.length) {
    throw new Error(
      `Unable to get the html for all User Tasks in the process (id: ${processDefinitionsId}). Could not find User Task files: [${toListString(
        requiredFileNames,
      )}]`,
    );
  }

  return files;
}
