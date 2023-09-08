import * as deployment from '../shared-electron-server/network/process/deployment.js';
import * as instance from '../shared-electron-server/network/process/instance.js';
import * as requests from '../shared-electron-server/network/requests.js';
import './machineInfo.js';
import logger from '../shared-electron-server/logging.js';
import * as deploymentRequests from '../shared-electron-server/network/ms-engine-communication/process.js';
import { toListString } from '../../shared-frontend-backend/helpers/arrayHelpers.js';

export function setupNetworkRequestHandlers(addListener) {
  addListener('process_import', async (socket, id, definitionId) => {
    logger.debug(`Request to import process (id: ${definitionId}).`);
    try {
      await deployment.importProcess(definitionId);
      socket.emit('process_import', id, {});
    } catch (err) {
      socket.emit('process_import', id, { error: err });
    }
  });

  addListener('deployment_remove', async (socket, id, processDefinitionsId) => {
    logger.debug(`Request to remove deployment of process with id ${processDefinitionsId}.`);
    socket.emit('deployment_remove', id, await deployment.removeDeployment(processDefinitionsId));
  });

  addListener('deployment_deploy', async (socket, id, processDefinitionsId, version, dynamic) => {
    logger.debug(
      `Request to ${
        dynamic ? 'dynamically' : 'statically'
      } deploy process with id ${processDefinitionsId} and version ${version}.`,
    );
    let response = {};

    try {
      await deployment.deployProcessVersion(processDefinitionsId, version, dynamic);
    } catch (err) {
      response.error = err.message;
    }

    socket.emit('deployment_deploy', id, response);
  });

  addListener('user_task_complete', async (socket, id, instanceId, userTaskId) => {
    logger.debug(`Complete userTask (id: ${userTaskId}) in instance (id: ${instanceId}).`);
    let response = {};

    try {
      response = await instance.completeUserTask(instanceId, userTaskId);
    } catch (err) {
      response.error = err.message;
    }

    socket.emit('user_task_complete', id, response);
  });

  addListener(
    'user_task_milestone_update',
    async (socket, id, instanceId, userTaskId, milestone) => {
      logger.debug(
        `Update milestone on userTask (id: ${userTaskId}) in instance (id: ${instanceId}).`,
      );
      let response = {};

      try {
        response = await instance.updateUserTaskMilestone(instanceId, userTaskId, milestone);
      } catch (err) {
        response.error = err.message;
      }

      socket.emit('user_task_milestone_update', id, response);
    },
  );

  addListener('version_data_get', async (socket, id, processDefinitionsId, version) => {
    logger.debug(
      `Request to get the data for a version (id:${version}) of a process (id: ${processDefinitionsId}).`,
    );
    let response = {};

    try {
      response = await deployment.getFullProcessVersionData(processDefinitionsId, version);
    } catch (err) {
      response.error = err.message;
    }

    socket.emit('version_data_get', id, response);
  });

  addListener('user_task_variable_update', async (socket, id, instanceId, userTaskId, variable) => {
    logger.debug(
      `Update intermediate variable on userTask (id: ${userTaskId}) in instance (id: ${instanceId}).`,
    );
    let response = {};

    try {
      response = await instance.updateUserTaskIntermediateVariablesState(
        instanceId,
        userTaskId,
        variable,
      );
    } catch (err) {
      response.error = err.message;
    }

    socket.emit('user_task_variable_update', id, response);
  });

  addListener('instance_start', async (socket, id, processDefinitionsId, version) => {
    logger.debug(
      `Request to start instance for process with id ${processDefinitionsId} and version ${version}.`,
    );
    let response = {};

    try {
      response = await instance.startInstance(processDefinitionsId, version);
    } catch (err) {
      response.error = err.message;
    }

    socket.emit('instance_start', id, response);
  });

  addListener('instance_stop', async (socket, id, processDefinitionsId, instanceId) => {
    logger.debug(
      `Request to stop instance with id ${instanceId} of process with id ${processDefinitionsId}.`,
    );

    let response = {};

    try {
      await instance.stopInstance(processDefinitionsId, instanceId);
    } catch (err) {
      console.log(err);
      response.error = err.message;
    }

    socket.emit('instance_stop', id, response);
  });

  addListener('instance_pause', async (socket, id, processDefinitionsId, instanceId) => {
    logger.debug(
      `Request to pause instance with id ${instanceId} of process with id ${processDefinitionsId}.`,
    );
    let response = {};

    try {
      await instance.pauseInstance(processDefinitionsId, instanceId);
    } catch (err) {
      response.error = err.message;
    }

    socket.emit('instance_pause', id, response);
  });

  addListener('instance_resume', async (socket, id, processDefinitionsId, instanceId) => {
    logger.debug(
      `Request to resume instance with id ${instanceId} of process with id ${processDefinitionsId}.`,
    );
    let response = {};

    try {
      await instance.resumeInstance(processDefinitionsId, instanceId);
    } catch (err) {
      response.error = err.message;
    }

    socket.emit('instance_resume', id, response);
  });

  addListener(
    'instance_tokens_update',
    async (socket, id, processDefinitionsId, instanceId, tokenChanges) => {
      logger.debug(
        `Request to change the tokens of the instance with id ${instanceId} of process with id ${processDefinitionsId}.`,
      );
      let response = {};

      try {
        await instance.updateInstanceTokenState(processDefinitionsId, instanceId, tokenChanges);
      } catch (err) {
        console.log(err);
        response.error = err.message;
      }

      socket.emit('instance_tokens_update', id, response);
    },
  );

  addListener(
    'instances_migrate_version',
    async (socket, id, definitionId, currentVersion, targetVersion, instanceIds, migrationArgs) => {
      logger.debug(
        `Request to migrate instances [${toListString(
          instanceIds,
        )}] of process (id: ${definitionId}) from version ${currentVersion} to version ${targetVersion}.`,
      );

      let response = {};

      try {
        await instance.migrateInstances(
          definitionId,
          currentVersion,
          targetVersion,
          instanceIds,
          migrationArgs,
        );
      } catch (err) {
        console.debug(err);
        response.error = err.message;
      }

      socket.emit('instances_migrate_version', id, response);
    },
  );

  addListener(
    'instance_token_update',
    async (socket, id, definitionsId, instanceId, tokenId, attributes) => {
      logger.debug(`Request to update token (id: ${tokenId}) in instance (id: ${instanceId})`);

      let response = {};

      try {
        await instance.updateToken(definitionsId, instanceId, tokenId, attributes);
      } catch (err) {
        response.error = err.message;
      }

      socket.emit('instance_token_update', id, response);
    },
  );

  addListener('machine_status_get', async (socket, id, machineId) => {
    logger.debug(`Request to get status of machine with id ${machineId}.`);
    try {
      socket.emit('machine_status_get', id, await requests.getStatus(machineId));
    } catch (err) {
      socket.emit('machine_status_get', id, { error: err });
    }
  });

  addListener('machine_properties_get', async (socket, id, machineId, properties) => {
    logger.debug(`Request to get properties of machine with id ${machineId}.`);
    try {
      socket.emit(
        'machine_properties_get',
        id,
        await requests.getMachineProperties(machineId, properties),
      );
    } catch (err) {
      socket.emit('machine_properties_get', id, { error: err });
    }
  });

  addListener('machine_configuration_get', async (socket, id, machineId) => {
    logger.debug(`Request to get configuration of machine with id ${machineId}.`);
    try {
      socket.emit('machine_configuration_get', id, await requests.getConfiguration(machineId));
    } catch (err) {
      socket.emit('machine_configuration_get', id, { error: err });
    }
  });

  addListener('machine_configuration_set', async (socket, id, machineId, configuration) => {
    logger.debug(`Request to set configuration of machine with id ${machineId}.`);
    try {
      socket.emit(
        'machine_configuration_set',
        id,
        await requests.sendConfiguration(machineId, configuration),
      );
    } catch (err) {
      socket.emit('machine_configuration_set', id, { error: err });
    }
  });

  addListener('machine_logs_get', async (socket, id, machineId) => {
    logger.debug(`Request to get logs of machine with id ${machineId}.`);
    try {
      socket.emit('machine_logs_get', id, await requests.getLogs(machineId));
    } catch (err) {
      socket.emit('machine_logs_get', id, { error: err });
    }
  });
}
