import { processEndpoint, _5thIndustryEndpoint } from '../ms-engine-communication/module.js';

import {
  removeDeployment as removeStoredDeployment,
  getDeployments,
} from '../../data/deployment.js';
import { immediateDeploymentInfoRequest } from './polling.js';

import {
  asyncForEach,
  asyncMap,
} from '../../../../shared-frontend-backend/helpers/javascriptHelpers.js';

import { convertToEditableBpmn } from '../../../../shared-frontend-backend/helpers/processVersioning.js';

import { getMachines } from '../../data/machines.js';

import {
  getProcessImages,
  addProcess,
  addProcessVersion,
  saveProcessUserTask,
  processMetaObjects,
  getProcessUserTasks,
  saveProcessImage,
  removeProcess,
} from '../../data/process.js';

import bpmnEx from '@proceed/bpmn-helper';
const {
  toBpmnObject,
  getElementsByTagName,
  getElementMachineMapping,
  getStartEvents,
  getProcessIds,
  getDefinitionsAndProcessIdForEveryCallActivity,
  validateCalledProcess,
  getAllUserTaskFileNamesAndUserTaskIdsMapping,
  getTaskConstraintMapping,
  getProcessConstraints,
  getMetaDataFromElement,
  getDeploymentMethod,
} = bpmnEx;

import decider from '@proceed/decider';

import {
  logger,
  settleRequest,
  getProcessVersionBpmn,
  getProcessUserTasksHtml,
} from './helpers.js';

import { enable5thIndustryIntegration } from '../../../../../../../FeatureFlags.js';

/**
 * Will return the complete data of a process version (bpmn, html)
 * The information can either come from the local storage or from engines if the process version is not known locally but deployed to some known engines
 *
 * @param {String} processDefinitionsId
 * @param {String|Number} version
 */
export async function getFullProcessVersionData(processDefinitionsId, version) {
  const bpmn = await getProcessVersionBpmn(processDefinitionsId, version);

  const userTasks = await getProcessUserTasksHtml(processDefinitionsId, bpmn);

  return { bpmn, userTasks };
}

/**
 * Removes deployed process with corresponding definitionid from all given machines
 *
 * @param {String} definitionId name of the file the process is stored under
 * @param {Array} machines contains information about all machines the process is supposed to be removed from
 */
async function removeDeploymentFromMachines(definitionId, machines) {
  // makes all requests executable and awaitable at the same time even when some may fail
  const settledRequests = await asyncMap(machines, async (machine) => {
    const result = await settleRequest(processEndpoint.removeDeployment(machine, definitionId));
    return { request: result, machine };
  });

  settledRequests.forEach(({ request, machine }) => {
    if (request.status === 'Failed') {
      if (logger) {
        logger.error(`Failed to delete from ${machine.name || machine.ip}: ${request.result}`);
      }
    }
  });
}

/**
 * Removes the deployment of the process with the given id from all currently connected machines
 *
 * @param {String} processDefinitionsId the id of the deployed process
 */
export async function removeDeployment(processDefinitionsId) {
  const deployedTo = getDeployments()[processDefinitionsId].machines;

  await removeDeploymentFromMachines(processDefinitionsId, deployedTo);

  await removeStoredDeployment(processDefinitionsId);

  // remove potentially existing instance adaptation processes
  Object.keys(processMetaObjects)
    .filter((key) => key.startsWith(`${processDefinitionsId}-instance-`))
    .forEach((key) => removeProcess(key));

  await immediateDeploymentInfoRequest();
}

/**
 * Tries to find an optimal machine to deploy process to and sends all necessary process information on success
 *
 * @param {String} processDefinitionsId the id of the process to deploy
 * @param {Number} version the version to deploy
 * @param {String} bpmn the process description in xml
 * @param {Object} forceMachine a machine that this has to be deployed to (needed if the process is an import of another process)
 */
export async function dynamicDeployment(processDefinitionsId, version, bpmn, forceMachine) {
  const bpmnObj = await toBpmnObject(bpmn);
  const startEventIds = await getStartEvents(bpmnObj);
  const processConstraints = await getProcessConstraints(bpmnObj);
  const taskConstraintMapping = await getTaskConstraintMapping(bpmnObj);

  const addedMachines = getMachines().filter(
    (machine) => !machine.discovered && machine.status === 'CONNECTED'
  );

  let preferredMachine;

  if (forceMachine) {
    preferredMachine = forceMachine;
  } else {
    // use decider to get sorted list of viable engines
    const { engineList } = await decider.findOptimalExternalMachine(
      { id: processDefinitionsId, nextFlowNode: startEventIds[0] },
      taskConstraintMapping[startEventIds[0]] || {},
      processConstraints || {},
      addedMachines
    );

    // try to get the best engine
    [preferredMachine] = engineList;
  }

  // there is no deployable machine known to the MS
  if (!preferredMachine) {
    if (logger) {
      logger.error(
        `Unable to find machine to deploy the process definitions (id:${processDefinitionsId}, version: ${version}) to.`
      );
    }

    throw new Error('There is no machine the process can be deployed to.');
  }

  // deploying process to selected engine
  try {
    await processEndpoint.deployProcess(preferredMachine, bpmn);
    await sendUserTaskHTML(processDefinitionsId, bpmn, preferredMachine, true);
    await sendImages(processDefinitionsId, preferredMachine, true);
    await sendImportedProcesses(processDefinitionsId, bpmn, preferredMachine, true);
  } catch (error) {
    // TODO: don't remove the whole process when deploying a single version fails
    removeDeploymentFromMachines(processDefinitionsId, [preferredMachine]);

    if (logger) {
      logger.error(
        `Failed to send process definitions (id:${processDefinitionsId}, version: ${version}) to selected machine. ${error}`
      );
    }
    throw error;
  }
}

/**
 * Function that given a machineMapping will return an array of unique machine addresses of machines in the mapping
 *
 * @param {object} machineMapping the mapping that contains the machines we want to know the addresses of
 */
function getUniqueMappedMachineAddresses(machineMapping) {
  return Object.keys(machineMapping)
    .map((key) => {
      const entry = machineMapping[key];

      if (entry.machineId) {
        const machine = getMachines().find((curMachine) => curMachine.id === entry.machineId);
        if (!machine) {
          throw new Error("Can't find machine with given id to resolve address");
        }
        return { ip: machine.ip, port: machine.port };
      }

      const [ip, port] = entry.machineAddress
        .replace(/\[?((?:(?:\d|\w)|:|\.)*)\]?:(\d*)/g, '$1+$2')
        .split('+');
      if (!ip || !port) {
        throw new Error('Unable to get ip and port from given address.');
      }
      return { ip, port: parseInt(port, 10) };
    })
    .reduce((currEntries, entry) => {
      if (!currEntries.some((el) => el.ip === entry.ip && el.port === entry.port)) {
        return [...currEntries, entry];
      }

      return currEntries;
    }, []);
}

/**
 * Sends process bpmn and user task html to all machines that were mapped to flowNodes in the process
 *
 * @param {String} processDefinitionsId the id of the process to deploy
 * @param {Number} version the version of the process that should be deployed
 * @param {String} bpmn the process description in xml
 * @param {Object} forceMachine a machine that this has to be deployed to (needed if the process is an import of another process)
 */
async function staticDeployment(processDefinitionsId, version, bpmn, forceMachine) {
  const machineMapping = await getElementMachineMapping(bpmn);

  let mappedMachinesAdresses;
  try {
    mappedMachinesAdresses = getUniqueMappedMachineAddresses(machineMapping);
  } catch (err) {
    if (logger) {
      logger.debug(err);
    }
    throw new Error('check if all machines are available!');
  }

  if (
    forceMachine &&
    !mappedMachinesAdresses.some(
      ({ ip, port }) => ip === forceMachine.ip && port == forceMachine.port
    )
  ) {
    mappedMachinesAdresses.push(forceMachine);
  }

  // sends request and gets the answer and information if sending succeded for every request
  const settledRequests = await asyncMap(mappedMachinesAdresses, async (address) => {
    const result = await settleRequest(processEndpoint.deployProcess(address, bpmn));
    return {
      result,
      address,
    };
  });

  try {
    if (settledRequests.some(({ result }) => result.status === 'Failed')) {
      throw new Error('check if all machines are available!');
    }

    await sendUserTaskHTML(processDefinitionsId, bpmn, machineMapping, false);
    await sendImages(processDefinitionsId, machineMapping, false);
    await sendImportedProcesses(processDefinitionsId, bpmn, machineMapping, false);
  } catch (error) {
    // TODO: should this run for the version? It might have been already deployed before
    // removeDeploymentFromMachines(
    //   process.id,
    //   settledRequests
    //     .filter((request) => request.result.status === 'Succeeded')
    //     .map((request) => request.address)
    // );

    if (logger) {
      logger.info(
        `Failed to send process definitions (id:${processDefinitionsId}, version: ${version}) to at least one machine.`
      );
    }
    throw error;
  }
}

/**
 * Sends images to all machines that need them
 *
 * @param {string} processDefinitionsId used to determine the endpoint we want to send the data to
 * @param {object} machineInfo either a map mapping taskId to machine or a machine
 * @param {bool} dynamic indicates if the image are to be send to a singular machine or multiple ones
 */
async function sendImages(processDefinitionsId, machineInfo, dynamic) {
  const imageFileNameMapping = await getProcessImages(processDefinitionsId);

  await asyncForEach(Object.entries(imageFileNameMapping), async ([imageFileName, image]) => {
    let machines = [];

    if (dynamic) {
      machines.push(machineInfo);
    } else {
      machines = getUniqueMappedMachineAddresses(machineInfo);
    }

    await asyncForEach(machines, async (machine) => {
      await processEndpoint.sendImage(machine, processDefinitionsId, imageFileName, image);
    });
  });
}

/**
 * Sends user task html to all machines that need them
 *
 * @param {object} processDefinitionsId the id of the process the html is used in
 * @param {object} machineInfo either a map mapping taskId to machine or a machine
 * @param {bool} dynamic indicates if the html is to be send to a singular machine or multiple ones
 */
async function sendUserTaskHTML(processDefinitionsId, bpmn, machineInfo, dynamic) {
  const bpmnObj = await toBpmnObject(bpmn);
  const [processElement] = getElementsByTagName(bpmnObj, 'bpmn:Process');
  const metaData = getMetaDataFromElement(processElement);

  // don't need to send html when 5thIndustry is used as the user task application
  if (enable5thIndustryIntegration && metaData['_5i-Inspection-Plan-ID']) {
    // early exit
    return;
  }

  const taskFileNameHtmlMapping = await getProcessUserTasksHtml(processDefinitionsId, bpmn);
  const taskIdFileNameMapping = await getAllUserTaskFileNamesAndUserTaskIdsMapping(bpmn);

  // send all user task data
  await asyncForEach(Object.entries(taskFileNameHtmlMapping), async ([taskFileName, html]) => {
    const taskIds = taskIdFileNameMapping[taskFileName];

    let machines = [];

    if (dynamic) {
      machines.push(machineInfo);
    } else {
      const machineMapping = {};

      taskIds.forEach((id) => (machineMapping[id] = machineInfo[id]));

      machines = getUniqueMappedMachineAddresses(machineMapping);
    }

    await asyncForEach(machines, async (machine) => {
      await processEndpoint.sendUserTaskHTML(machine, processDefinitionsId, taskFileName, html);
    });
  });
}

/**
 * Checks the process for imported processes and sends them to the correct endpoint if there are any
 *
 * @param {String} importerBpmn
 * @param {*} machineInfo
 * @param {Boolean} dynamic if the process is deployed dynamically
 */
async function sendImportedProcesses(
  importerProcessDefinitionsId,
  importerBpmn,
  machineInfo,
  dynamic
) {
  const activityDefinitionIdMapping = await getDefinitionsAndProcessIdForEveryCallActivity(
    importerBpmn
  );
  Object.entries(activityDefinitionIdMapping).forEach(
    async ([
      activityId,
      { definitionId: importedDefinitionId, processId, version: importedDefinitionVersion },
    ]) => {
      if (!importedDefinitionVersion) {
        throw new Error(
          `Tried to deploy a process (id: ${importerProcessDefinitionsId}) that contained an unversioned process import (id: ${importedDefinitionId})!`
        );
      }

      const importedBpmn = await getProcessVersionBpmn(
        importedDefinitionId,
        importedDefinitionVersion
      );

      const processIds = await getProcessIds(importedBpmn);

      if (!processIds.includes(processId)) {
        throw new Error(
          `The file (${importedDefinitionId}) doesn't contain the expected process with id ${processId}`
        );
      }

      // check if there is only one non typed start event
      try {
        validateCalledProcess(importedBpmn, processId);
      } catch (err) {
        throw new Error(`Invalid process referenced in callActivity ${activityId}: ${err}`);
      }

      let machine;
      if (dynamic) {
        machine = machineInfo;
      } else {
        [machine] = getUniqueMappedMachineAddresses({ activityId: machineInfo[activityId] });
      }

      const deploymentMethod = await getDeploymentMethod(importedBpmn);

      // recursively send all nested imported processes (imported processes in an imported process)
      if (deploymentMethod === 'static') {
        staticDeployment(importedDefinitionId, importedDefinitionVersion, importedBpmn, machine);
      } else {
        dynamicDeployment(importedDefinitionId, importedDefinitionVersion, importedBpmn, machine);
      }
    }
  );
}

export async function deployProcessVersion(processDefinitionsId, version) {
  const bpmn = await getProcessVersionBpmn(processDefinitionsId, version);

  if (!bpmn) {
    throw new Error(
      `Can't find bpmn for the process with id ${processDefinitionsId} and version ${version}`
    );
  }

  const ids = await getProcessIds(bpmn);

  // the engine only allows for descriptions containing a single process
  if (ids.length > 1) {
    throw new Error('Process desciption contains more than one Process');
  }

  if (ids.length === 0) {
    throw new Error("Process description doesn't contain a process");
  }

  const deploymentMethod = await getDeploymentMethod(bpmn);

  if (deploymentMethod === 'static') {
    await staticDeployment(processDefinitionsId, version, bpmn);
  } else {
    await dynamicDeployment(processDefinitionsId, version, bpmn);
  }

  await immediateDeploymentInfoRequest();
}

export async function importProcess(processDefinitionsId) {
  try {
    const deployment = getDeployments()[processDefinitionsId];

    if (!deployment) {
      throw new Error(
        `Cannot find the process (id: ${processDefinitionsId}) among the known deployments`
      );
    }

    let { versions: unknownVersions, machines } = deployment;

    // check if the process is stored locally (if not every version is unknown)
    const localProcess = processMetaObjects[processDefinitionsId];
    let localUserTasks = [];
    let localImages = {};
    if (localProcess) {
      // we only need to import versions that are not known locally
      unknownVersions = unknownVersions.filter(
        (deployedVersion) =>
          !localProcess.versions.some(
            (localVersion) => localVersion.version === deployedVersion.version
          )
      );
      localUserTasks = await getProcessUserTasks(processDefinitionsId);
      localImages = await getProcessImages(processDefinitionsId);
    }

    // create a mapping between all resources used in all versions and the machines they can be found on
    const unknownUserTaskMachineMapping = {};
    const unknownImageMachineMapping = {};
    // TODO: imports

    function addToMapping(machineId, known, mapping, fileNameList) {
      // add the information that the files in the given list can be gotten from the current machine to the mapping
      fileNameList.forEach((entry) => {
        // only add elements to the mapping that are not already stored locally
        if (!known.includes(entry)) {
          if (!mapping[entry]) mapping[entry] = new Set(); // add a set to store machines on first entry occurence
          mapping[entry].add(machineId); // add the machine to the set
        }
      });
    }

    // check for dependencies for all unknown versions
    unknownVersions.forEach((version) => {
      version.machines.forEach(({ machineId, needs: { html, images } }) => {
        if (html) addToMapping(machineId, localUserTasks, unknownUserTaskMachineMapping, html);
        if (images) {
          addToMapping(machineId, Object.keys(localImages), unknownImageMachineMapping, images);
        }
        // TODO: imports
      });
    });

    /**
     * Will try to get the dependencies from a given mapping
     *
     * @param {{string: Set<string>}} mapping mapping from the file to request to the machine ids of machines on which the file should be stored
     * @param {Function} requestFunc the function that should be used to request the data
     * @returns {{string: any}} a mapping from the fileName to the data
     */
    async function getDependencies(mapping, requestFunc) {
      return Object.fromEntries(
        await asyncMap(Object.entries(mapping), async ([fileName, machineIds]) => {
          let data;
          // try to request a specific file from one of the machines it should be stored on
          for (const machineId of machineIds) {
            const machine = machines.find((machine) => machine.id === machineId);

            if (machine) {
              try {
                data = await requestFunc(machine, processDefinitionsId, fileName);
                break;
              } catch (err) {}
            }
          }

          // if we have requested all machines and not gotten the data back from any of them => throw
          if (!data) {
            throw new Error(`Cannot get data for file (fileName: ${fileName})`);
          }

          return [fileName, data];
        })
      );
    }

    // try to get every html
    const unknownUserTasks = await getDependencies(
      unknownUserTaskMachineMapping,
      processEndpoint.getUserTaskHTML
    );

    // try to get every image
    const unknownImages = await getDependencies(
      unknownImageMachineMapping,
      processEndpoint.getImage
    );

    // create the editable version of the process from the latest known version if it does not exist locally yet
    if (!localProcess) {
      // sort the versions by their creation time with the newest being the first
      unknownVersions = unknownVersions.concat([]).sort((a, b) => b.version - a.version);
      const { bpmn, changedFileNames } = await convertToEditableBpmn(unknownVersions[0].bpmn);
      // add the process with the editable bpmn
      // TODO: this process should most likely be stored as being owned by the user that triggered the import
      await addProcess({ bpmn });
      // save the html of the converted version as the editable html
      Object.entries(changedFileNames).forEach(([versioned, unversioned]) => {
        saveProcessUserTask(processDefinitionsId, unversioned, unknownUserTasks[versioned]);
      });
      // TODO: image versioning?
    }

    // save all unknown versions
    for (const version of unknownVersions) {
      addProcessVersion(processDefinitionsId, version.bpmn);
    }

    // save all unknown user task files
    for (const [fileName, html] of Object.entries(unknownUserTasks)) {
      saveProcessUserTask(processDefinitionsId, fileName, html);
    }

    // save all unknown image files
    for (const [fileName, image] of Object.entries(unknownImages)) {
      await saveProcessImage(processDefinitionsId, fileName, image);
    }
  } catch (err) {
    logger.debug(`Failed to import process (id: ${processDefinitionsId}). Reason: ${err.message}`);
    throw err;
  }
}
