const { config } = require('@proceed/machine');
const distribution = require('@proceed/distribution');
const { getUserTaskFileNameMapping } = require('@proceed/bpmn-helper');
const decider = require('@proceed/decider');
const Parser = require('@proceed/constraint-parser-xml-json/parser.js');
const Engine = require('./engine/engine.js');
const APIError = require('@proceed/distribution/src/routes/ApiError');

/**
 * @memberof module:@proceed/core
 * @class
 *
 * Object that manages the execution of **all** BPMN processes.
 * It is a Singleton.
 * @hideconstructor
 */
const Management = {
  /**
   * Array containing all currently running engine instances.
   * @private
   */
  _engines: [],

  provideScriptExecutor(scriptExecutor) {
    Engine.provideScriptExecutor(scriptExecutor);
  },

  /**
   * Will ensure that there is an instance of the engine for the given process and that the given instance is deployed inside it
   *
   * @param {String} definitionId
   * @param {Number} version
   * @returns {Engine} the instance of
   */
  async ensureProcessEngineWithVersion(definitionId, version) {
    // check if an engine instance was already created for the process
    let engine = this.getEngineWithDefinitionId(definitionId);

    if (!engine) {
      // Start up a new engine
      engine = new Engine(this);
      this._engines.push(engine);
    }

    // ensure that the version is deployed
    if (!engine.versions.includes(version)) {
      await engine.deployProcessVersion(definitionId, version);
    }

    return engine;
  },

  /**
   * Creates a new engine instance for execution of the given process version.
   * @param {string} definitionId The name of the file the process to start is stored in
   * @param {number} version the version of the process to start
   * @param {object} variables The process variables for the execution
   * @param {string} [activityID] The optional id of the activity to start execution at (if not at the beginning)
   * @param {function} [onStarted] an optional callback that should be called when the instance starts
   * @param {function} [onEnded] an optional callback that should be called when the instance ends
   */
  async createInstance(definitionId, version, variables, activityID, onStarted, onEnded) {
    const { processes } = await config.readConfig();
    if (processes.deactivateProcessExecution) {
      return null;
    }

    const { bpmn, deploymentMethod } = await distribution.db.getProcessVersionInfo(
      definitionId,
      version
    );

    if (deploymentMethod === 'dynamic') {
      const parser = new Parser();
      const processConstraints = parser.getConstraints(bpmn);
      const taskConstraints = parser.getConstraints(bpmn, activityID);

      const userTasks = await getUserTaskFileNameMapping(bpmn);

      const processInfo = {
        id: definitionId,
        nextFlowNode: {
          id: activityID,
          isUserTask: !!userTasks[activityID],
        },
      };

      const executionAllowed = await decider.allowedToExecuteLocally(
        processInfo,
        null,
        taskConstraints,
        processConstraints
      );

      if (!executionAllowed) {
        return null;
      }
    }

    const engine = await this.ensureProcessEngineWithVersion(definitionId, version);

    return await engine.startProcessVersion(version, variables, activityID, onStarted, onEnded);
  },

  importInstance(instance) {
    const { processVersion } = instance;

    const importedInstance = { ...instance, processId: `${instance.processId}#${processVersion}` };
    delete importedInstance.processVersion;

    return { processVersion, importedInstance };
  },

  /**
   * Will ensure that an instance is loaded into an engine and ready for other changes
   *
   * @param {String} definitionId the identifier of the process
   * @param {String} instanceId the identifier of the instance
   * @returns {Object} the engine that is executing the instance
   * @throws {APIError} will throw if the instance is completely unknown to this PROCEED Engine (not in an active engine and not archived)
   */
  async ensureInstanceEngine(definitionId, instanceId) {
    let engine = this.getEngineWithID(instanceId);
    if (!engine) {
      const archivedInstances = await distribution.db.getArchivedInstances(definitionId);

      const archivedInstance = archivedInstances[instanceId];

      if (!archivedInstance) {
        throw new APIError(
          404,
          `Cannot find the instance (id: ${instanceId}) of the given process (id: ${definitionId})!`
        );
      }

      const { processVersion, importedInstance } = this.importInstance(archivedInstance);

      const engine = await this.ensureProcessEngineWithVersion(definitionId, processVersion);

      engine.startProcessVersion(
        processVersion,
        importedInstance.variables,
        importedInstance,
        () => {
          engine._log.info({
            msg: `Loaded an archived process instance back into the engine. Id = ${instanceId}.}`,
            instanceId: instanceId,
          });
        }
      );
    }
    return engine;
  },

  /**
   * Continues running an instance of a process version on this engine
   * that was running on another machine
   *
   * @param {string} definitionId The name of the file the process to continue is stored in
   */
  async continueInstance(definitionId, instance) {
    const { processes } = await config.readConfig();
    if (processes.deactivateProcessExecution) {
      return null;
    }

    const { bpmn, deploymentMethod } = await distribution.db.getProcessVersionInfo(
      definitionId,
      instance.processVersion
    );

    if (deploymentMethod === 'dynamic') {
      const parser = new Parser();
      const processConstraints = parser.getConstraints(bpmn);
      const taskConstraints = parser.getConstraints(bpmn, instance.to);

      const userTasks = await getUserTaskFileNameMapping(bpmn);

      const processInfo = {
        id: definitionId,
        nextFlowNode: {
          id: instance.tokens[0].to,
          isUserTask: !!userTasks[instance.tokens[0].to],
        },
      };

      const tokenInfo = {
        globalStartTime: instance.globalStartTime,
        localStartTime: instance.tokens[0].localStartTime,
        localExecutionTime: instance.tokens[0].localExecutionTime,
        machineHops: instance.tokens[0].machineHops,
        storageRounds: instance.tokens[0].deciderStorageRounds,
        storageTime: instance.tokens[0].deciderStorageTime,
      };

      const executionAllowed = await decider.allowedToExecuteLocally(
        processInfo,
        tokenInfo,
        taskConstraints,
        processConstraints
      );

      if (!executionAllowed) {
        return null;
      }
    }

    let engine;

    // try inserting the tokens into an existing local instance (either one that is still in the engine or one that is archived)
    try {
      engine = await this.ensureInstanceEngine(definitionId, instance.processInstanceId);
      const placingTokens = instance.tokens.map((token) => {
        return {
          tokenId: token.tokenId,
          from: token.from,
          to: token.to,
          machineHops: token.machineHops + 1,
          nextMachine: undefined,
        };
      });
      const continueInstanceInfo = { ...instance, tokens: placingTokens };
      continueInstanceInfo.processId = `${continueInstanceInfo.processId}#${continueInstanceInfo.processVersion}`;
      engine.insertIncomingInstanceData(continueInstanceInfo);
    } catch (err) {
      // create a new local instance with the given state
      const startingTokens = instance.tokens.map((token) => {
        return {
          tokenId: token.tokenId,
          currentFlowElementId: token.to,
          machineHops: token.machineHops + 1,
          deciderStorageTime: 0,
          deciderStorageRounds: 0,
        };
      });
      const startingInstanceInfo = { ...instance, tokens: startingTokens };

      const { processVersion, importedInstance } = this.importInstance(startingInstanceInfo);

      engine = await this.ensureProcessEngineWithVersion(definitionId, processVersion);

      engine.startProcessVersion(
        processVersion,
        importedInstance.variables,
        importedInstance,
        (newInstance) => {
          engine._log.info({
            msg: `Continuing process instance. Id = ${startingInstanceInfo.processInstanceId}. TokenId = ${startingInstanceInfo.tokens[0].tokenId}`,
            instanceId: startingInstanceInfo.processInstanceId,
          });
        }
      );
    }

    return engine;
  },

  /**
   * Resuming an instance of a process on this engine that was paused
   *
   * @param {string} definitionId The name of the file the process to continue is stored in
   * @param {string} instanceId The id the process instance to resume
   */
  async resumeInstance(definitionId, instanceId) {
    let instanceInformation;

    const existingEngine = this.getEngineWithID(instanceId);
    if (existingEngine) {
      instanceInformation = existingEngine.getInstanceInformation(instanceId);
      this.removeInstance(instanceId);
    } else {
      instanceInformation = (await distribution.db.getArchivedInstances(definitionId))[instanceId];
    }

    const resumedTokens = instanceInformation.tokens.map((token) => {
      const tokenActive =
        token.state === 'RUNNING' ||
        token.state === 'READY' ||
        token.state === 'DEPLOYMENT-WAITING' ||
        token.state === 'PAUSED';

      return {
        tokenId: token.tokenId,
        state: tokenActive ? 'READY' : token.state,
        currentFlowElementId: token.currentFlowElementId,
        deciderStorageRounds: token.deciderStorageRounds,
        deciderStorageTime: token.deciderStorageTime,
        machineHops: token.machineHops,
      };
    });

    const resumedInstanceInformation = {
      ...instanceInformation,
      tokens: resumedTokens,
    };

    const { processVersion, importedInstance } = this.importInstance(resumedInstanceInformation);

    const engine = await this.ensureProcessEngineWithVersion(definitionId, processVersion);

    engine.startProcessVersion(
      processVersion,
      importedInstance.variables,
      importedInstance,
      (newInstance) => {
        engine._log.info({
          msg: `Resuming process instance. Id = ${resumedInstanceInformation.processInstanceId}`,
          instanceId: resumedInstanceInformation.instanceId,
        });
      }
    );

    return engine;
  },

  removeProcessEngine(definitionId) {
    const engine = this.getEngineWithDefinitionId(definitionId);
    this._engines.splice(this._engines.indexOf(engine), 1);
  },

  removeInstance(instanceId) {
    const engine = this.getEngineWithID(instanceId);
    engine.deleteInstance(instanceId);
  },

  getAllEngines() {
    return this._engines;
  },

  /**
   * Return the engine with the given instance id.
   * @param {string} instanceID The id of an instance the engine is executing
   * @returns {module:@proceed/core.ProceedEngine}
   */
  getEngineWithID(instanceID) {
    return this._engines.find((engine) => engine.instanceIDs.includes(instanceID));
  },

  /**
   * Return the engine running a process that is defined in the file with the given definitionId
   *
   * @param {String} definitionId name of the file the process description is stored in
   * @returns {Engine|undefined} - the engine running instances of the process with the given id
   */
  getEngineWithDefinitionId(definitionId) {
    return this._engines.find((engine) => engine.definitionId === definitionId);
  },

  /**
   * Return all activities that currently wait for user input.
   * @returns {object[]}
   */
  getPendingUserTasks() {
    const userTasks = this._engines.flatMap((engine) => engine.getUserTasks());

    return userTasks;
  },
};

module.exports = Management;
