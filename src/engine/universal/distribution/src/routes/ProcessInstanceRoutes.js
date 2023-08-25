const { network } = require('@proceed/system');
const { logging } = require('@proceed/machine');
const db = require('../database/db');
const APIError = require('./ApiError');
const { getAllInstances } = require('./helpers.js');

/**
 * Endpoints for the running process instances
 *
 * @param {*} path  = "/process/..."
 * :definitionId = the definitions-id of a BPMN file
 */
module.exports = (path, management) => {
  const log = logging.getLogger({ moduleName: 'DISTRIBUTION' });

  /**
   * Start a new process instance.
   * This method tells the management to start up a new "neo-engine".
   */
  network.post(`${path}/:definitionId/versions/:version/instance`, { cors: true }, async (req) => {
    const { definitionId, version } = req.params;
    const { variables, activityID } = req.body;

    const instanceId = await management.createInstance(
      definitionId,
      version,
      variables,
      activityID,
    );

    if (!instanceId) {
      throw new APIError(
        406,
        `Engine not allowed to start the instance for the process (id: ${definitionId}).`,
      );
    }

    log.debug(
      `New process instance (POST) created via API: (id: ${definitionId}, version: ${version})`,
    );
    return {
      statusCode: 201,
      mimeType: 'application/json',
      response: JSON.stringify({ instanceId }),
    };
  });

  /**
   * Get ALL Process Instances
   */
  network.get(`${path}/:definitionId/instance`, { cors: true }, async (req) => {
    const definitionId = req.params.definitionId;
    const { state: queriedState } = req.query;

    // Test if there is a process with the given id
    if (!db.isProcessExisting(definitionId)) {
      throw new APIError(
        404,
        `List all instances: there is no process for the requested process: ${definitionId}`,
      );
    }

    let allInstances = await getAllInstances(management, definitionId);

    if (queriedState) {
      allInstances = allInstances.filter((instance) =>
        instance.instanceState.includes(queriedState),
      );
    }

    const instanceIds = allInstances
      .sort((a, b) => a.globalStartTime - b.globalStartTime)
      .map((instance) => instance.processInstanceId);

    return JSON.stringify(instanceIds);
  });

  /**
   * Get the current process-instance status and all tokens
   */
  network.get(`${path}/:definitionId/instance/:instanceID`, { cors: true }, async (req) => {
    const { instanceID, definitionId } = req.params;

    let instanceInfo;
    const engine = management.getEngineWithID(instanceID);

    if (engine) {
      const engineInstanceInfo = engine.getInstanceInformation(instanceID);

      const isCurrentlyExecutedInBpmnEngine = !!engineInstanceInfo.instanceState.find(
        (state) =>
          state === 'RUNNING' ||
          state === 'READY' ||
          state === 'DEPLOYMENT-WAITING' ||
          state === 'PAUSING',
      );

      instanceInfo = { ...engineInstanceInfo, isCurrentlyExecutedInBpmnEngine };
    } else {
      const archivedInstanceInfo = (await db.getArchivedInstances(definitionId))[instanceID];
      instanceInfo = { ...archivedInstanceInfo, isCurrentlyExecutedInBpmnEngine: false };
    }

    if (!instanceInfo) {
      throw new APIError(
        404,
        `For the given process (id: ${definitionId}), there is no instance with the given id: ${instanceID}`,
      );
    }

    return JSON.stringify(instanceInfo);
  });

  /**
   * Start a Process Instance with a predefined status (ids, tokens, etc.)
   */
  network.put(`${path}/:definitionId/instance/:instanceID`, { cors: true }, async (req) => {
    const { definitionId } = req.params;
    const instance = req.body;

    const engine = await management.continueInstance(definitionId, instance);

    if (!engine) {
      throw new APIError(
        406,
        `For the given process (id: ${definitionId}) version (${instance.processVersion}), it is not allowed to continue instance with the given id (body): ${instance.id}`,
      );
    }

    log.debug(
      `Continuing process instance (PUT) via API: DefinitionId = ${definitionId}, Version = ${instance.processVersion}, InstanceId = ${instance.id}`,
    );
    log.trace(
      `Continuing process instance (PUT) via API: DefinitionId = ${definitionId}, Version = ${instance.processVersion}, InstanceId = ${instance.id}, Body: ${instance}`,
    );
    return {
      statusCode: 201,
      mimeType: 'application/json',
      response: JSON.stringify(instance),
    };
  });

  /**
   * Set the state of the whole process instance.
   * @param instanceState variable inside body, can be 'paused', 'resume', 'stopped', or 'aborted'
   */
  network.put(
    `${path}/:definitionId/instance/:instanceID/instanceState`,
    { cors: true },
    async (req) => {
      const { definitionId, instanceID } = req.params;
      const { body } = req;

      log.debug(`Status update for process instance ${instanceID}. Body: ${JSON.stringify(body)}`);

      const { instanceState } = body;

      if (instanceState === 'resume') {
        await management.resumeInstance(definitionId, instanceID);
      } else {
        const engine = management.getEngineWithID(instanceID);
        if (!engine) {
          throw new APIError(
            404,
            `For the given process (id: ${definitionId}), there is no instance with the given id: ${instanceID} to fetch the /instanceState.`,
          );
        }

        if (instanceState === 'stopped') {
          engine.stopInstance(instanceID);
        } else if (instanceState === 'paused') {
          engine.pauseInstance(instanceID);
        } else if (instanceState === 'aborted') {
          engine.abortInstance(instanceID);
        }
      }

      return '';
    },
  );

  /**
   * Update Token: Can be used to update certain attributes or to move token to position on specific FlowElement
   */
  network.put(
    `${path}/:definitionId/instance/:instanceId/tokens/:tokenId`,
    { cors: true },
    async (req) => {
      const { definitionId, instanceId, tokenId } = req.params;
      const { currentFlowElementId, ...otherAttributes } = req.body;

      const engine = await management.ensureInstanceEngine(definitionId, instanceId);

      if (otherAttributes) {
        engine.updateToken(instanceId, tokenId, otherAttributes);
      }

      if (currentFlowElementId) {
        try {
          engine.moveToken(instanceId, tokenId, currentFlowElementId);
        } catch (err) {
          throw new Error(404, err.message);
        }
      }
    },
  );

  network.delete(
    `${path}/:definitionId/instance/:instanceId/tokens/:tokenId`,
    { cors: true },
    async (req) => {
      const { definitionId, instanceId, tokenId } = req.params;

      const engine = await management.ensureInstanceEngine(definitionId, instanceId);

      try {
        engine.removeToken(instanceId, tokenId);
      } catch (err) {
        throw new APIError(500, err.message);
      }
    },
  );

  network.post(`${path}/:definitionId/instance/:instanceId/tokens`, { cors: true }, async (req) => {
    const { definitionId, instanceId } = req.params;
    const tokenInfo = req.body;

    const engine = await management.ensureInstanceEngine(definitionId, instanceId);

    try {
      engine.insertToken(instanceId, tokenInfo);
    } catch (err) {
      throw new APIError(
        500,
        `Inserting the token into the instance (id: ${instanceId}) for the process (id: ${definitionId}) failed. Reason: ${err.message}`,
      );
    }
  });

  network.post(
    `${path}/:definitionId/instance/:instanceId/variables`,
    { cors: true },
    async (req) => {
      const { definitionId, instanceId } = req.params;
      const variableChanges = req.body;

      const engine = await management.ensureInstanceEngine(definitionId, instanceId);

      try {
        engine.updateVariables(instanceId, variableChanges);
      } catch (err) {
        throw new APIError(
          500,
          `Updating the variables in the instance (id: ${instanceId}) for the process (id: ${definitionId}) failed. Reason: ${err.message}`,
        );
      }
    },
  );

  /**
   * Set FlowNode/ Activity Status for external FlowNodes
   */
  network.put(
    `${path}/:definitionId/instance/:instanceId/tokens/:tokenId/currentFlowNodeState`,
    { cors: true },
    async (req) => {
      const { definitionId, instanceId, tokenId } = req.params;

      const engine = management.getEngineWithID(instanceId);
      if (!engine) {
        throw new APIError(
          404,
          `For the given process (id: ${definitionId}), there is no running instance with the given id: ${instanceId}.`,
        );
      }

      const token = engine.getToken(instanceId, tokenId);
      if (!token) {
        throw new APIError(
          404,
          `For the given instance (id: ${instanceId}), there is no token with the given id: ${tokenId}.`,
        );
      }

      const { body } = req;
      const { currentFlowNodeState, variables, boundaryEventReference } = body;
      let newFlowNodeState = null;

      switch (currentFlowNodeState) {
        case 'EXTERNAL':
          newFlowNodeState = 'EXTERNAL';
          break;
        case 'EXTERNAL-COMPLETED':
          newFlowNodeState = 'COMPLETED';
          break;
        case 'EXTERNAL-TERMINATED':
          newFlowNodeState = 'TERMINATED';
          break;
        case 'EXTERNAL-FAILED':
          newFlowNodeState = 'FAILED';
          break;
        default:
          newFlowNodeState = null;
      }

      if (newFlowNodeState) {
        //TODO: if EXTERNAL, check if `external` attribute is enabled for the current FlowNode
        //TODO: if other states, check if `currentFlowNodeState` == EXTERNAL
        //TODO: trigger specific boundary event with boundaryEventReference if given,; first version only needs Escalation and Error event like in script tasks, see https://docs.proceed-labs.org/concepts/bpmn/bpmn-script-task/#trigger-events
        //TODO: if it is a non-interrupting escalation event, spawn new token and stay in "EXTERNAL" state
        engine.setFlowNodeState(instanceId, tokenId, newFlowNodeState, variables);
      } else {
        // newFlowNodeState == false;
        throw new APIError(
          400,
          `Tried to set the flow node state to invalid value (value: ${currentFlowNodeState}).`,
        );
      }
    },
  );

  network.post(
    `${path}/:definitionId/versions/:version/instance/migration`,
    { cors: true },
    async (req) => {
      const { definitionId, version: sourceVersion } = req.params;

      const {
        body: { targetVersion, instanceIds, tokenMapping, flowElementMapping },
      } = req;

      management.ensureProcessEngineWithVersion(definitionId, targetVersion);

      const allInstances = await getAllInstances(management, definitionId);

      // make sure that we know all engines to migrate before the migration starts
      const unknownInstanceId = instanceIds.find(
        (id) => !allInstances.some((instance) => instance.processInstanceId === id),
      );
      if (unknownInstanceId) {
        throw APIError(400, `Tried to migrate an unknown instance (id: ${unknownInstanceId})`);
      }

      instanceIds.forEach((id) => {
        // make sure that all instances are loaded into the engine so we are able to migrate them
        management.ensureInstanceEngine(definitionId, id);
      });

      const engine = management.getEngineWithDefinitionId(definitionId);

      // make sure the target version is deployed in the engine before we try to migrate
      if (!engine.versions.includes(targetVersion)) {
        await engine.deployProcessVersion(definitionId, targetVersion);
      }

      // migrate the instances
      engine.migrate(sourceVersion, targetVersion, instanceIds, {
        tokenMapping,
        flowElementMapping,
      });
    },
  );
};
