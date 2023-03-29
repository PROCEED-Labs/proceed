const { config } = require('@proceed/machine');
const distribution = require('@proceed/distribution');
const {
  getUserTaskFileNameMapping,
  getElementById,
  toBpmnObject,
} = require('@proceed/bpmn-helper');
const decider = require('@proceed/decider');
const Parser = require('@proceed/constraint-parser-xml-json/parser.js');
const Engine = require('./engine/engine.js');
const APIError = require('@proceed/distribution/src/routes/ApiError');
const { interruptedInstanceRecovery } = require('../../../../../FeatureFlags.js');

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

  ensureProcessEngine(definitionId) {
    // check if an engine instance was already created for the process
    let engine = this.getEngineWithDefinitionId(definitionId);

    if (!engine) {
      // Start up a new engine
      engine = new Engine(this);
      engine.definitionId = definitionId;
      this._engines.push(engine);
    }

    return engine;
  },

  /**
   * Will ensure that there is an instance of the engine for the given process and that the given process version is deployed inside it
   *
   * @param {String} definitionId
   * @param {Number} version
   * @returns {Engine} the instance of
   */
  async ensureProcessEngineWithVersion(definitionId, version) {
    const engine = this.ensureProcessEngine(definitionId);

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

  /**
   * Transform instance information into the form used inside the neo-bpmn-engine
   *
   * @param {Object} instance the instance information as used by the PROCEED Engine
   * @returns {Object} the process version and an object containing the instance information as used by the neo-bpmn-engine
   */
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

      if (!interruptedInstanceRecovery) {
        // remove intermediate state when the instance recovery is not used; when it is finally implemented this should be removed
        await distribution.db.deleteArchivedInstance(definitionId, instanceId);
      }
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

  /**
   * Will try to put an instance that has been interrupted (e.g. because of an engine crash) back into a functioning execution state
   *
   * @param {String} definitionId the id of the process the instance was created from
   * @param {String} instance archived state of the instance before the crash
   * @param {Object} restartedInstances Object containing promises that are resolved when an instance has been restarted (to allow dependent instances to wait until another dependency instance has started)
   */
  async restoreInterruptedInstance(definitionId, instance, restartedInstances) {
    function ensureAwaitable(instanceId) {
      // allow instances to await the restart of other instances (needed for call activities)
      if (!restartedInstances[instanceId]) {
        let resolver;
        restartedInstances[instanceId] = new Promise((resolve) => (resolver = resolve));
        restartedInstances[instanceId].resolve = resolver;
      }
    }
    // make sure that this instance is awaitable by other instances (needed if the other instance was called by this instance)
    ensureAwaitable(instance.processInstanceId);
    // make sure that the called instance is awaitable by this instance
    if (instance.callingInstance) {
      ensureAwaitable(instance.callingInstance);
      // wait for the calling instance to be started before starting this instance (otherwise we run into problems if this instance finishes before the calling one is started)
      const interruptedTokens = await restartedInstances[instance.callingInstance];
      // if the call activity that started this instance is not automatically continued we need to pause this instance until the user decides what should happen
      if (interruptedTokens.some((token) => token.calledInstance === instance.processInstanceId)) {
        instance.instanceState = ['PAUSING'];
      }
    }

    const engine = await this.ensureProcessEngineWithVersion(definitionId, instance.processVersion);
    // transform instance information into the form used by the neo-engine
    const { processVersion, importedInstance } = this.importInstance(instance);

    const bpmn = await distribution.db.getProcessVersion(definitionId, processVersion);

    const bpmnObj = await toBpmnObject(bpmn);

    const interruptedTokens = [];

    importedInstance.tokens = importedInstance.tokens.map((token) => {
      // get the element the token was interrupted on
      const currentFlowElement = getElementById(bpmnObj, token.currentFlowElementId);

      const needTokenRestart =
        currentFlowElement.$type !== 'bpmn:SubProcess' && // don't restart the subprocess itself to prevent a reinitialization of the subprocess (only continue the contained tasks)
        (currentFlowElement.$type !== 'bpmn:CallActivity' || !token.calledInstance) && // don't restart the call activity element to prevent starting a new instance of the referenced process (continue the execution of the instance that was already started for the call activity)
        (token.state === 'RUNNING' || token.state === 'DEPLOYMENT-WAITING');

      let newState = needTokenRestart ? 'READY' : token.state;
      let currentFlowNodeState = needTokenRestart ? 'READY' : token.currentFlowNodeState;

      // see if the element can be automatically handled or if it should be interrupted for manual user handling
      // some elements should not be restarted due to the risk of reexecuting commands that are not idempotent
      let shouldBeInterrupted = false;
      let curr = currentFlowElement;
      // elements that are nested inside a subprocess with manual interruption handling should also be interrupted
      while (curr) {
        if (curr.manualInterruptionHandling) {
          shouldBeInterrupted = true;
          break;
        }
        curr = curr.$parent;
      }

      if (shouldBeInterrupted) {
        newState = 'ERROR-INTERRUPTED';
        // if the element is a flowNode (=> has a flowNodeState) set the state to interrupted else (its a sequence flow) dont set a flowNodeState
        currentFlowNodeState = currentFlowNodeState && 'ERROR-INTERRUPTED';

        if (token.state !== 'ERROR-INTERRUPTED') {
          interruptedTokens.push(token);
        }
      }

      return {
        ...token,
        state: newState,
        currentFlowNodeState,
        flowElementExecutionWasInterrupted: true,
      };
    });

    const instanceId = await engine.startProcessVersion(
      processVersion,
      importedInstance.variables,
      importedInstance,
      () => {
        engine._log.info({
          msg: `Continuing execution of an interrupted instance (id: ${instance.processInstanceId})`,
          instanceId: instance.processInstanceId,
        });
      }
    );

    // if the instance was in the process of being paused => make sure that it is paused again
    // (will lead to it being paused directly since no tasks have started yet)
    if (importedInstance.instanceState[0] === 'PAUSING') {
      await engine.pauseInstance(instanceId);
    }

    // allow waiting instances to be started (and give information about tokens being interrupted which is needed to check if called instances should run)
    restartedInstances[instance.processInstanceId].resolve(interruptedTokens);
  },

  /**
   * BEWARE: This should only be used when the engine is (re)starting to recover interruped instances
   *
   * Will try to start all instances that are currently marked as still being executed in the engine
   */
  async restoreInterruptedInstances() {
    const definitionIds = await distribution.db.getAllProcesses();

    // promises that are resolved once an instance has started
    const restartedInstances = {};

    for (const definitionId of definitionIds) {
      const instances = await distribution.db.getArchivedInstances(definitionId);

      for (const instance of Object.values(instances)) {
        if (instance.isCurrentlyExecutedInBpmnEngine) {
          // make sure that only one engine is created per process
          this.ensureProcessEngine(definitionId);
          this.restoreInterruptedInstance(definitionId, instance, restartedInstances);
        }
      }
    }

    // wait until all instances have been restarted
    await Promise.all(Object.values(restartedInstances));
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
   * Return all pending userTasks that currently wait for user input.
   * @returns {object[]}
   */
  getPendingUserTasks() {
    const allPendingUserTasks = this._engines.flatMap((engine) => engine.getPendingUserTasks());
    return allPendingUserTasks;
  },

  /**
   * Return all userTasks that are currently not active
   * @returns {object[]}
   */
  async getInactiveUserTasks() {
    // get inactive userTasks of still running instances
    const allInactiveUserTasks = this._engines.flatMap((engine) => engine.getInactiveUserTasks());
    // get inactive userTasks of already archived instances
    const allProcesses = await distribution.db.getAllProcesses();
    const allArchivedInstances = await allProcesses.reduce(async (acc, currentDefinitionId) => {
      const archivedInstancesForDefinitionId = await distribution.db.getArchivedInstances(
        currentDefinitionId
      );

      const nonDuplicateArchivedInstancesForDefinitionId = {};

      Object.keys(archivedInstancesForDefinitionId).forEach((instanceId) => {
        const executingEngine = this.getEngineWithID(instanceId);
        if (!executingEngine) {
          nonDuplicateArchivedInstancesForDefinitionId[instanceId] =
            archivedInstancesForDefinitionId[instanceId];
        }
      });

      return { ...acc, ...nonDuplicateArchivedInstancesForDefinitionId };
    }, {});

    const allArchivedUserTasks = Object.values(allArchivedInstances).flatMap((archivedInstance) => {
      if (archivedInstance.userTasks) {
        const instanceUserTasks = archivedInstance.userTasks.map((uT) => {
          const userTaskToken = archivedInstance.tokens.find(
            (token) => token.tokenId === uT.tokenId && token.currentFlowElementId === uT.id
          );

          if (userTaskToken) {
            return {
              ...uT,
              priority: userTaskToken.priority,
              progress: userTaskToken.currentFlowNodeProgress.value,
            };
          } else {
            const userTaskLogEntry = archivedInstance.log.find(
              (logEntry) => logEntry.flowElementId === uT.id && logEntry.tokenId === uT.tokenId
            );

            return {
              ...uT,
              priority: userTaskLogEntry.priority,
              progress: userTaskLogEntry.progress.value,
            };
          }
        });
        return instanceUserTasks;
      }
      return [];
    });

    return [...allInactiveUserTasks, ...allArchivedUserTasks];
  },
};

module.exports = Management;
