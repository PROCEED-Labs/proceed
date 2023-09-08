import networkEx from '@proceed/system';
const { network } = networkEx;

/**
 * Requests information about all deployed processes of a machine
 *
 * @param {object} machine contains machine information
 * @param {string} machine.ip the ip address of the machine
 * @param {number} machine.port the port of the machine
 * @param {boolean} entryQuery a query for specific entries that should be returned for the deployments
 * @returns {array} deployment information for all processes deployed to the given machine
 */
export async function getDeployedProcesses(machine, entryQuery) {
  let path = '/process';

  if (entryQuery) {
    path += `?entries=${entryQuery}`;
  }

  const { body } = await network.sendRequest(machine.ip, machine.port, path);

  return JSON.parse(body);
}

/**
 * Sends process definitionid and process bpmn to deploy process on engine
 *
 * @param {object} machine contains machine information
 * @param {string} machine.ip the ip address of the machine
 * @param {number} machine.port the port of the machine
 * @param {string} bpmn the description of the process in xml
 */
export async function deployProcess(machine, bpmn) {
  await network.sendData(machine.ip, machine.port, `/process`, 'POST', 'application/json', {
    bpmn,
  });
}

/**
 * Sends request to delete the deployment of process with given id
 *
 * @param {object} machine contains machine information
 * @param {string} machine.ip the ip address of the machine
 * @param {number} machine.port the port of the machine
 * @param {string} definitionId name of the file the process is saved in
 */
export async function removeDeployment(machine, definitionId) {
  await network.sendRequest(machine.ip, machine.port, `/process/${definitionId}/`, {
    method: 'DELETE',
  });
}

/**
 *
 * @param {object} machine contains machine information
 * @param {string} machine.ip the ip address of the machine
 * @param {number} machine.port the port of the machine
 * @param {string} definitionId name of the file the process is saved in
 * @param {string} fileName fileName of the image
 */
export async function getImage(machine, definitionId, fileName) {
  const { body } = await network.sendRequest(
    machine.ip,
    machine.port,
    `/resources/process/${definitionId}/images/${fileName}`,
    {
      encoding: 'binary',
    },
  );
  const image = Buffer.from(body, 'binary');
  return image;
}

/**
 *
 * @param {object} machine contains machine information
 * @param {string} machine.ip the ip address of the machine
 * @param {number} machine.port the port of the machine
 * @param {string} definitionId name of the file the process is saved in
 * @param {string} fileName fileName of the image
 * @param {string} image the image to send
 */
export async function sendImage(machine, definitionId, fileName, image) {
  await network.sendData(
    machine.ip,
    machine.port,
    `/resources/process/${definitionId}/images/${fileName}`,
    'PUT',
    'image/png image/svg+xml image/jpeg',
    image,
  );
}

/**
 *
 * @param {object} machine contains machine information
 * @param {string} machine.ip the ip address of the machine
 * @param {number} machine.port the port of the machine
 * @param {string} definitionId name of the file the process is saved in
 * @param {string} userTaskId id of the user task
 * @param {string} html the html of the user task
 */
export async function sendUserTaskHTML(machine, definitionId, userTaskId, html) {
  await network.sendData(
    machine.ip,
    machine.port,
    `/process/${definitionId}/user-tasks/${userTaskId}`,
    'PUT',
    'application/json',
    { html },
  );
}

/**
 * Gets a list of user task file names that are stored for the given process id
 *
 * @param {Object} machine contains machine information
 * @param {String} machine.ip the ip address of the machine
 * @param {Number} machine.port the port of the machine
 * @param {String} definitionId name of the file the process is saved in
 * @returns {string[]} a list of all known user task files for the given process
 */
export async function getUserTasks(machine, definitionId) {
  const { body } = await network.sendRequest(
    machine.ip,
    machine.port,
    `/process/${definitionId}/user-tasks`,
  );

  return JSON.parse(body);
}

/**
 * Gets HTML for user task with given id in process with given id
 *
 * @param {Object} machine contains machine information
 * @param {String} machine.ip the ip address of the machine
 * @param {Number} machine.port the port of the machine
 * @param {String} definitionId name of the file the process is saved in
 * @param {String} userTaskId id of the user task
 * @returns {string} the user task html
 */
export async function getUserTaskHTML(machine, definitionId, userTaskId) {
  const { body } = await network.sendRequest(
    machine.ip,
    machine.port,
    `/process/${definitionId}/user-tasks/${userTaskId}`,
  );

  return body;
}

/**
 * Sends request to start an instance of a process with process variables
 *
 * @param {object} machine contains machine information
 * @param {string} machine.ip the ip address of the machine
 * @param {number} machine.port the port of the machine
 * @param {string} definitionId name of the file the process is saved in
 * @param {number} version of the process to start
 * @param {object} variables start values for process variables
 * @returns {string} the id of the created isntance
 */
export async function startProcessInstance(machine, definitionId, version, variables) {
  const { body } = await network.sendData(
    machine.ip,
    machine.port,
    `/process/${definitionId}/versions/${version}/instance`,
    'POST',
    'application/json',
    { variables },
  );

  return JSON.parse(body).instanceId;
}

/**
 * Request information about a certain process instance
 *
 * @param {object} machine contains machine information
 * @param {string} machine.ip the ip address of the machine
 * @param {number} machine.port the port of the machine
 * @param {string} definitionId name of the file the process is saved in
 * @param {string} instanceId id of the specific instance
 * @returns {object} instance information object
 */
export async function getInstanceInformation(machine, definitionId, instanceId) {
  const { body } = await network.sendRequest(
    machine.ip,
    machine.port,
    `/process/${definitionId}/instance/${instanceId}`,
  );

  return JSON.parse(body);
}

/**
 * Requests active userTasks on machine
 *
 * @param {object} machine contains machine information
 * @param {string} machine.host the ip address of the machine
 * @param {number} machine.port the port of the machine
 * @returns {array} array with information-objects for every active usertask
 */
export async function getActiveUserTasks(machine) {
  const { body } = await network.sendRequest(machine.host, machine.port, `/tasklist/api`);

  return JSON.parse(body);
}

/**
 * Requests HTML from active userTask on machine
 *
 * @param {object} machine contains machine information
 * @param {string} machine.host the ip address of the machine
 * @param {number} machine.port the port of the machine
 * @param {string} instanceId id of the instance the userTask is running in
 * @param {string} userTaskId id of the active userTask
 * @returns {string} HTML of the userTask
 */
export async function getActiveUserTaskHTML(machine, instanceId, userTaskId, userTaskStartTime) {
  const { body } = await network.sendRequest(
    machine.host,
    machine.port,
    `/tasklist/api/userTask?instanceID=${instanceId}&userTaskID=${userTaskId}&startTime=${userTaskStartTime}`,
  );

  return JSON.parse(body);
}

/**
 * Complete userTask on machine
 *
 * @param {object} machine contains machine information
 * @param {string} machine.host the ip address of the machine
 * @param {number} machine.port the port of the machine
 * @param {string} instanceId id of the instance the userTask is running in
 * @param {string} userTaskId id of the active userTask
 */
export async function completeUserTask(machine, instanceId, userTaskId) {
  await network.sendData(
    machine.host,
    machine.port,
    `/tasklist/api/userTask?instanceID=${instanceId}&userTaskID=${userTaskId}`,
    'POST',
    'application/json',
    {},
  );
}

/**
 * Update milestone on UserTask
 *
 * @param {object} machine contains machine information
 * @param {string} machine.host the ip address of the machine
 * @param {number} machine.port the port of the machine
 * @param {string} instanceId id of the instance the userTask is running in
 * @param {string} userTaskId id of the active userTask
 * @param {object} milestone object with id and value of milestone
 */
export async function updateUserTaskMilestone(machine, instanceId, userTaskId, milestone) {
  await network.sendData(
    machine.host,
    machine.port,
    `/tasklist/api/milestone?instanceID=${instanceId}&userTaskID=${userTaskId}`,
    'PUT',
    'application/json',
    milestone,
  );
}

/**
 * Update intermediate variable on UserTask
 *
 * @param {object} machine contains machine information
 * @param {string} machine.host the ip address of the machine
 * @param {number} machine.port the port of the machine
 * @param {string} instanceId id of the instance the userTask is running in
 * @param {string} userTaskId id of the active userTask
 * @param {object} variable object with key and value of variable
 */
export async function updateUserTaskIntermediateVariablesState(
  machine,
  instanceId,
  userTaskId,
  variable,
) {
  await network.sendData(
    machine.host,
    machine.port,
    `/tasklist/api/variable?instanceID=${instanceId}&userTaskID=${userTaskId}`,
    'PUT',
    'application/json',
    variable,
  );
}

/**
 * Sends request to stop a certain process instance
 *
 * @param {object} machine contains machine information
 * @param {string} machine.ip the ip address of the machine
 * @param {number} machine.port the port of the machine
 * @param {string} definitionId name of the file the process is saved in
 * @param {string} instanceId id of the specific instance
 */
export async function stopProcessInstance(machine, definitionId, instanceId) {
  await network.sendData(
    machine.ip,
    machine.port,
    `/process/${definitionId}/instance/${instanceId}/instanceState`,
    'PUT',
    'application/json',
    { instanceState: 'stopped' },
  );
}

/**
 * Sends request to pause a certain process instance
 *
 * @param {object} machine contains machine information
 * @param {string} machine.ip the ip address of the machine
 * @param {number} machine.port the port of the machine
 * @param {string} definitionId name of the file the process is saved in
 * @param {string} instanceId id of the specific instance
 */
export async function pauseProcessInstance(machine, definitionId, instanceId) {
  await network.sendData(
    machine.ip,
    machine.port,
    `/process/${definitionId}/instance/${instanceId}/instanceState`,
    'PUT',
    'application/json',
    { instanceState: 'paused' },
  );
}

/**
 * Sends request to resume a certain process instance
 *
 * @param {object} machine contains machine information
 * @param {string} machine.ip the ip address of the machine
 * @param {number} machine.port the port of the machine
 * @param {string} definitionId name of the file the process is saved in
 * @param {string} instanceId id of the specific instance
 */
export async function resumeProcessInstance(machine, definitionId, instanceId) {
  await network.sendData(
    machine.ip,
    machine.port,
    `/process/${definitionId}/instance/${instanceId}/instanceState`,
    'PUT',
    'application/json',
    { instanceState: 'resume' },
  );
}

/**
 * Sends a request to move a token from one element to another
 *
 * @param {Object} machine the machine that is currently executing the token
 * @param {string} machine.ip the ip address of the machine
 * @param {number} machine.port the port of the machine
 * @param {string} definitionId name of the file the process is saved in
 * @param {string} instanceId id of the specific instance
 * @param {string} tokenId id of the token to move
 * @param {string} flowElementId id of the target element
 */
export async function moveToken(machine, definitionId, instanceId, tokenId, flowElementId) {
  // if we don't escape hash characters that are used for tokens inside subprocesses everything from the hash will be lost in transition to the engine
  tokenId = tokenId.replace(/#/g, '%23');

  await network.sendData(
    machine.ip,
    machine.port,
    `/process/${definitionId}/instance/${instanceId}/tokens/${tokenId}`,
    'PUT',
    'application/json',
    { currentFlowElementId: flowElementId },
  );
}

/**
 * Sends a request to remove a token from an instance
 *
 * @param {Object} machine information of the machine the token should be on
 * @param {String} processDefinitionsId the id of the process
 * @param {String} instanceId the id of the instance the token is in
 * @param {String} tokenId the id of the token to remove
 */
export async function removeToken(machine, processDefinitionsId, instanceId, tokenId) {
  await network.sendRequest(
    machine.ip,
    machine.port,
    `/process/${processDefinitionsId}/instance/${instanceId}/tokens/${tokenId}`,
    {
      method: 'DELETE',
    },
  );
}

/**
 * Sends a request to add a token to an instance
 *
 * @param {Object} machine information of a machine that is currently executing the instance
 * @param {String} processDefinitionsId the id of the process
 * @param {String} instanceId the id of the instance the token should be added to
 * @param {Object} token information about the token (most importantly the currentFlowElementId the token will be added to)
 */
export async function addToken(machine, processDefinitionsId, instanceId, token) {
  await network.sendData(
    machine.ip,
    machine.port,
    `/process/${processDefinitionsId}/instance/${instanceId}/tokens`,
    'POST',
    'application/json',
    token || {},
  );
}

/** Send a request to migrate a list of instances on the given machine
 *
 * @param {Object} machine the machine that is currently executing the token
 * @param {string} machine.ip the ip address of the machine
 * @param {number} machine.port the port of the machine
 * @param {String} processDefinitionsId the id of the process
 * @param {Number} currentVersion the version the instances to migrate are currently running in
 * @param {Number} targetVersion the version the instances should be migrated to
 * @param {String[]} instanceIds the ids of the instances to migrate
 * @param {{ tokenMapping, flowElementMapping }} migrationArgs mappings that can be used to adjust tokens to the new model
 */
export async function migrateInstances(
  machine,
  processDefinitionsId,
  currentVersion,
  targetVersion,
  instanceIds,
  { tokenMapping, flowElementMapping },
) {
  await network.sendData(
    machine.ip,
    machine.port,
    `/process/${processDefinitionsId}/versions/${currentVersion}/instance/migration`,
    'POST',
    'application/json',
    { targetVersion, instanceIds, tokenMapping, flowElementMapping },
  );
}

/**
 * Sends a request to update a token with given attributes
 *
 * @param {Object} machine the machine that is currently executing the token
 * @param {string} machine.ip the ip address of the machine
 * @param {number} machine.port the port of the machine

 * @param {string} definitionId name of the file the process is saved in
 * @param {string} instanceId id of the specific instance
 * @param {string} tokenId id of the token to update
 * @param {string} attributes attributes to update token with
 */
export async function updateToken(machine, definitionId, instanceId, tokenId, attributes) {
  await network.sendData(
    machine.ip,
    machine.port,
    `/process/${definitionId}/instance/${instanceId}/tokens/${tokenId}`,
    'PUT',
    'application/json',
    { ...attributes },
  );
}
