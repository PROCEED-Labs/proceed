/* eslint-disable class-methods-use-this */
const { logging, information } = require('@proceed/machine');
const distribution = require('@proceed/distribution');
const NeoEngine = require('neo-bpmn-engine');
const { setupNeoEngine } = require('./neoEngineSetup.js');
const { getNewInstanceHandler } = require('./hookCallbacks.js');
const { getShouldPassToken } = require('./shouldPassToken.js');
const { getShouldActivateFlowNode } = require('./shouldActivateFlowNode.js');
const { getProcessIds } = require('@proceed/bpmn-helper');

const { enableMessaging } = require('../../../../../../FeatureFlags.js');
const { publishCurrentInstanceState } = require('./publishStateUtils');
// const Separator = require('./separator.js').default;

const { teardownEngineStatusInformationPublishing } = require('./publishStateUtils');

setupNeoEngine();

/**
 * @memberof module:@proceed/core
 * @class
 * Every instance is associated with exactly one BPMN process definition and can
 * contain multiple instances of said process.
 */
class Engine {
  /**
   * Creates a new Engine instance.
   */
  constructor(management) {
    /**
     * The management module that created this engine (is needed when we want to start call activity processes)
     */
    this._management = management;

    /**
     * The user tasks when encountered in a process instance and awaiting handling.
     * @type {object[]}
     */
    this.userTasks = [];

    /**
     * The globally known IDs for the instances created within this BPMN process
     * @type {string[]}
     */
    this.instanceIDs = [];

    /**
     * The name of the file the process description is taken from before being executed in this module
     * @type {string}
     */
    this.definitionId = null;

    /**
     * A mapping from the version of a process to the Neo Engine Process it is deployed as
     * @private
     */
    this._versionProcessMapping = {};

    /**
     * A mapping from the version of a process to its bpmn
     * @private
     */
    this._versionBpmnMapping = {};

    /**
     * A mapping from an instance to the Neo Engine Process it is currently being executed in
     * @private
     */
    this._instanceIdProcessMapping = {};

    /**
     * Handlers to be called on specific instance events (onStarted, onEnded, onTokenEnded)
     */
    this.instanceEventHandlers = {};

    /**
     * Contains information about the initial instance state for instances that were imported into the engine
     */
    this.originalInstanceState = undefined;

    this.versions = [];

    /**
     * The logging instance configured with the provided definitionId.
     * @private
     */
    this._log = null;

    /** id, ip and name of this machine
     * @type {object}
     */
    this.machineInformation = null;
  }

  static provideScriptExecutor(scriptExecutor) {
    if (scriptExecutor) {
      NeoEngine.provideScriptExecutor(scriptExecutor);
    }
  }

  /**
   * Deploys the process version to the NeoBPMN Engine making it ready to start instances
   *
   * @param {string} definitionId The name of the file of the (main) process (as stored in the `data`)
   * @param {number} the version of the process to deploy
   */
  async deployProcessVersion(definitionId, version) {
    if (!this._versionProcessMapping[version]) {
      // Fetch the stored BPMN
      const bpmn = await distribution.db.getProcessVersion(definitionId, version);

      const [processId] = await getProcessIds(bpmn);
      // validate imports and user tasks on first deploy || assumes validity for imported processes since we expect to have a fully valid main process
      if (!(await distribution.db.isProcessVersionValid(definitionId, version))) {
        throw new Error(
          `Process version ${version} for process ${processId} with definitionId ${definitionId} is invalid. It can't be deployed.`
        );
      }

      const log = logging.getLogger({
        moduleName: 'CORE',
        definitionId,
      });
      this._log = log;

      const { id, name, hostname, port } = await information.getMachineInformation([
        'id',
        'name',
        'hostname',
        'port',
      ]);

      const { ip } = distribution.communication
        .getAvailableMachines()
        .find((machine) => machine.id === id);

      this.machineInformation = { id, name: name || hostname, ip, port };

      const process = await NeoEngine.BpmnProcess.fromXml(`${definitionId}-${version}`, bpmn, {
        shouldPassTokenHook: getShouldPassToken(this),
        shouldActivateFlowNodeHook: getShouldActivateFlowNode(this),
      });

      process.deploy();

      // Subscribe to the new process instances stream before we start the execution
      process.getInstance$().subscribe(getNewInstanceHandler(this));

      // Every Engine instance is only allowed to be associated with one process definition
      // (possibly multiple versions and instances of that process though)
      this.definitionId = definitionId;

      this._versionProcessMapping[version] = process;
      this._versionBpmnMapping[version] = bpmn;
      this.versions.push(version);
    }
  }

  /**
   * Starts the execution of a BPMN process version. This can involve the creation of
   * multiple instances of the process, if the process contains such events.
   * When encountering User Tasks in the ongoing execution, they are added to
   * the `userTasks` array property.
   *
   * @param {number} the version of the process to start
   * @param {object} processVariables The process variables in the init state
   * @param {object|string} instance contains the instance object that came from another engine to be contiued here (might contain only an id of an activity to start)
   * @param {function} onStarted function that is executed when the new instance starts
   * @param {function} onEnded function that is executed when the new instance ends
   * @param {function} onTokenEnded function that is executed when a token ends its execution
   */
  startProcessVersion(version, processVariables, instance, onStarted, onEnded, onTokenEnded) {
    if (typeof instance === 'function') {
      onTokenEnded = onEnded;
      onEnded = onStarted;
      onStarted = instance;
      instance = undefined;
    }
    // we want to start a new instance at a specific node
    let activityId;
    if (typeof instance === 'string') {
      activityId = instance;
      instance = undefined;
    }

    let resolver;
    const instanceCreatedPromise = new Promise((resolve) => {
      resolver = resolve;
    });

    this.originalInstanceState = instance;
    this.instanceEventHandlers = {
      onStarted: (newInstance) => {
        resolver(newInstance.id);
        // make sure to keep the information from the original instance on the recreated instance
        if (instance && instance.callingInstance) {
          newInstance.callingInstance = instance.callingInstance;
        }

        if (typeof onStarted === 'function') {
          onStarted(newInstance);
        }
      },
      onEnded,
      onTokenEnded,
    };

    try {
      if (activityId !== undefined) {
        // start at the specified activity
        this._versionProcessMapping[version].startAt({
          tokens: [
            {
              currentFlowElementId: activityId,
              machineHops: 0,
              deciderStorageTime: 0,
              deciderStorageRounds: 0,
            },
          ],
        });
      } else if (instance !== undefined) {
        // continue the given instance
        this._versionProcessMapping[version].startAt({
          globalStartTime: instance.globalStartTime,
          tokens: instance.tokens,
          instanceId: instance.processInstanceId,
          variables: processVariables,
          log: instance.log,
          adaptationLog: instance.adaptationLog,
        });
      } else {
        // start the process at a its start event
        this._versionProcessMapping[version].start({
          variables: processVariables,
          token: { machineHops: 0, deciderStorageTime: 0, deciderStorageRounds: 0 },
        });
      }
    } catch (error) {
      this._log.error(error);
    }

    return instanceCreatedPromise;
  }

  /**
   * Continues an token coming from another machine by inserting the token in the running instance on this engine
   *
   * @param {Object} instance the instance object coming from another machine we want to continue
   */
  insertIncomingInstanceData(instance) {
    // the instance is already running => place token at desired location
    const localInstance = this.getInstance(instance.processInstanceId);

    const [token] = instance.tokens;

    localInstance.mergeVariableChanges(instance.variables);
    localInstance.mergeFlowNodeLog(instance.log);
    localInstance.mergeAdaptationLog(instance.adaptationLog);

    const placingToken = { ...token };
    delete placingToken.from;
    delete placingToken.to;

    localInstance.placeTokenAt(token.to, placingToken, true);
  }

  migrate(sourceVersion, targetVersion, instanceIds, migrationArgs) {
    // the neo engine expect the tokenMapping to use targetFlowElementId but we use currentFlowNodeId in the tokenMapping
    if (migrationArgs.tokenMapping) {
      const { tokenMapping } = migrationArgs;
      if (tokenMapping.move) {
        tokenMapping.move = tokenMapping.move.map((token) => ({
          ...token,
          targetFlowElementId: token.currentFlowElementId,
          currentFlowElementId: undefined,
        }));
      }
      if (tokenMapping.add) {
        tokenMapping.add = tokenMapping.add.map((token) => ({
          ...token,
          targetFlowElementId: token.currentFlowElementId,
          currentFlowElementId: undefined,
        }));
      }
    }

    const instanceIdString = instanceIds.reduce((string, id, index) => {
      if (index > 0) {
        string += `, ${id}`;
      }

      return string;
    }, instanceIds[0]);

    this._log.info({
      msg: `Migrating instances [${instanceIdString}] from version ${sourceVersion} to version ${targetVersion}`,
    });

    NeoEngine.BpmnProcess.migrate(
      `${this.definitionId}-${sourceVersion}`,
      `${this.definitionId}-${targetVersion}`,
      instanceIds,
      migrationArgs
    );

    instanceIds.forEach((id) => {
      this._instanceIdProcessMapping[id] = this._versionProcessMapping[targetVersion];
    });
  }

  /**
   * Archive an Instance which is not active anymore
   *
   * @param {string} instanceID
   */
  async archiveInstance(instanceID) {
    if (!this.instanceIDs.includes(instanceID)) {
      this._log.warn(
        `Tried to archive an instance that could not be found in the execution environment (id: ${instanceID})`,
      );
      return;
    }

    const instanceInformation = { ...this.getInstanceInformation(instanceID) };
    const archiveInformation = {
      ...instanceInformation,
      userTasks: this.userTasks
        .filter((userTask) => userTask.processInstance.id === instanceID)
        .map((userTask) => ({
          ...userTask,
          processInstance: {
            id: userTask.processInstance.id,
          },
          definitionId: this.definitionId,
        })),
    };

    await distribution.db.archiveInstance(this.definitionId, instanceID, archiveInformation);
  }

  /**
   * Signals the user task as completed to the corresponding process instance,
   * which is responsible.
   * @param {string} instanceID The id of the process instance to be notified
   * @param {string} userTaskID The id of the user task
   * @param {object} variables The updated process variables
   */
  completeUserTask(instanceID, userTaskID, variables) {
    const userTask = this.userTasks.find(
      (uT) =>
        uT.processInstance.id === instanceID &&
        uT.id === userTaskID &&
        (uT.state === 'READY' || uT.state === 'ACTIVE')
    );

    const token = this.getToken(instanceID, userTask.tokenId);
    // remember the changes made by this user task invocation
    userTask.variableChanges = { ...token.intermediateVariablesState };
    userTask.milestones = { ...token.milestones };

    userTask.processInstance.completeActivity(userTask.id, userTask.tokenId, variables);
  }

  /**
   * Signals the user task as aborted to the corresponding process instance,
   * which is responsible.
   * @param {string} instanceID The id of the process instance to be notified
   * @param {string} userTaskID The id of the user task
   */
  abortUserTask(instanceID, userTaskID) {
    const userTask = this.userTasks.find(
      (uT) =>
        uT.processInstance.id === instanceID &&
        uT.id === userTaskID &&
        (uT.state === 'READY' || uT.state === 'ACTIVE')
    );

    userTask.processInstance.failActivity(userTask.id, userTask.tokenId);
  }

  /**
   * Sets the current progress of a flowNode running at given token (mainly used for usertasks)
   * @param {string} instanceID The id of the process instance to be notified
   * @param {string} tokenId  The id of the token
   * @param {number} progress The current progress of a flow node
   */
  setFlowNodeProgress(instanceID, tokenId, progress) {
    const instance = this.getInstance(instanceID);
    instance.updateToken(tokenId, { currentFlowNodeProgress: progress });
  }

  /**
   * Returns the instance with the given id
   *
   * @param {string} instanceID id of the instance we want to get
   * @returns {object} - the requested process instance
   */
  getInstance(instanceID) {
    if (this._instanceIdProcessMapping[instanceID]) {
      return this._instanceIdProcessMapping[instanceID].getInstanceById(instanceID);
    }
  }

  getInstanceBpmn(instanceId) {
    const instance = this.getInstance(instanceId);

    const state = instance.getState();
    const processId = state.processId.substring(0, state.processId.lastIndexOf('-'));
    const version = state.processId.substring(processId.length + 1);

    return this._versionBpmnMapping[version];
  }

  /**
   * Deletes the instance with the given id
   *
   * @param {string} instanceID id of the instance to be deleted
   */
  deleteInstance(instanceID) {
    if (!this.instanceIDs.includes(instanceID)) {
      this._log.warn(
        `Tried to delete an instance from the execution environment that is not currently being executed (id: ${instanceID})`,
      );
      return;
    }

    teardownEngineStatusInformationPublishing(this, this.getInstanceInformation(instanceID));
    this.instanceIDs.splice(this.instanceIDs.indexOf(instanceID), 1);
    const process = this._instanceIdProcessMapping[instanceID];
    delete this._instanceIdProcessMapping[instanceID];
    process.deleteInstanceById(instanceID);
    this.userTasks = this.userTasks.filter(
      (userTask) => userTask.processInstance.id !== instanceID
    );
  }

  getInstanceInformation(instanceID) {
    const instance = this.getInstance(instanceID);

    const state = instance.getState();

    const processId = state.processId.substring(0, state.processId.lastIndexOf('-'));
    const processVersion = state.processId.substring(processId.length + 1);

    // map the adaptation log migration entries to show the version info
    const adaptationLog = state.adaptationLog.map((entry) => {
      if (entry.type === 'MIGRATION' && entry.from && entry.to) {
        return {
          type: entry.type,
          time: entry.time,
          sourceVersion: parseInt(entry.from.substring(processId.length + 1)),
          targetVersion: parseInt(entry.to.substring(processId.length + 1)),
        };
      } else {
        return entry;
      }
    });

    const instanceInfo = { ...state, processId, processVersion, adaptationLog };

    if (instance.callingInstance) {
      instanceInfo.callingInstance = instance.callingInstance;
    }

    return instanceInfo;
  }

  getAllInstanceTokens(instanceID) {
    const instance = this.getInstance(instanceID);

    const state = instance.getState();

    return state.tokens;
  }

  getToken(instanceID, tokenId) {
    const instance = this.getInstance(instanceID);

    const tokens = instance.getState().tokens;

    return tokens.find((token) => token.tokenId === tokenId);
  }

  updateToken(instanceID, tokenId, attributes) {
    const instance = this.getInstance(instanceID);

    instance.updateToken(tokenId, attributes);
  }

  logExecution(instanceID, elementId, tokenId, attributes) {
    const instance = this.getInstance(instanceID);

    instance.logExecution(elementId, tokenId, attributes);
  }

  insertToken(instanceId, token) {
    const instance = this.getInstance(instanceId);

    if (!token || !token.currentFlowElementId) {
      throw new Error(
        'Inserting a token requires a currentFlowElementId to be given in the tokenInformation!'
      );
    }

    instance.addToken(token.currentFlowElementId, {
      ...token,
      machineHops: 0,
      deciderStorageTime: 0,
      deciderStorageRounds: 0,
    });
  }

  removeToken(instanceID, tokenId) {
    const instance = this.getInstance(instanceID);

    instance.removeToken(tokenId);
  }

  moveToken(instanceId, tokenId, targetId) {
    const localInstance = this.getInstance(instanceId);

    if (!localInstance) {
      throw new Error(`Instance with id ${instanceId} does not exist!`);
    }

    const localToken = localInstance.getState().tokens.find((token) => token.tokenId === tokenId);

    if (!localToken) {
      throw new Error(`Token with id ${tokenId} does not exist!`);
    }

    localInstance.moveToken(targetId, { ...localToken });
  }

  updateLog(instanceID, elementId, tokenId, attributes) {
    const instance = this.getInstance(instanceID);

    instance.updateLog(elementId, tokenId, attributes);
  }

  updateVariables(instanceID, variables) {
    const instance = this.getInstance(instanceID);

    instance.updateVariables(variables);
  }

  getInstanceState(instanceID) {
    const instance = this.getInstance(instanceID);

    if (instance.isEnded()) {
      return 'ended';
    } else if (instance.isPaused()) {
      return 'paused';
    } else {
      return 'running';
    }

    // TODO: get state from instance
    // return instance.getState().instanceState;
    // -> returns array with states of all tokens
  }

  /**
   * Stops instance
   *
   * @param {string} instanceID id of the instance we want to stop
   */
  async stopInstance(instanceID) {
    const instance = this.getInstance(instanceID);

    if (!instance.isEnded()) {
      this._log.info({
        msg: `Stopping process instance. Id = ${instanceID}`,
        instanceId: instanceID,
      });

      const tokens = this.getAllInstanceTokens(instanceID);

      tokens.forEach((token) => {
        if (
          token.state === 'RUNNING' ||
          token.state === 'DEPLOYMENT-WAITING' ||
          token.state === 'READY'
        ) {
          instance.interruptToken(token.tokenId);
          instance.logExecution(token.currentFlowElementId, token.tokenId, {
            executionState: 'STOPPED',
            startTime: token.currentFlowElementStartTime,
            endTime: +new Date(),
            machine: this.machineInformation,
            progress: token.currentFlowNodeProgress,
            priority: token.priority,
            performers: token.performers,
          });
        }
      });

      this.userTasks = this.userTasks.map((uT) => {
        if (uT.processInstance === instance && (uT.state === 'READY' || uT.state === 'ACTIVE')) {
          return { ...uT, state: 'STOPPED' };
        }

        return uT;
      });

      instance.stop();

      if (enableMessaging) {
        await publishCurrentInstanceState(this, instance);
      }

      // archive the information for the stopped instance
      await this.archiveInstance(instance.id);
      this.deleteInstance(instance.id);
    }
  }
  /**
   *
   * Stop every token of this instance due to unfulfilled constraints
   * @param {String} instanceID - ID of process instance
   * @param {Array} unfulfilledConstraints - List of unfulfilled constraints
   */
  async stopUnfulfilledInstance(instanceID, unfulfilledConstraints) {
    const instance = this.getInstance(instanceID);

    if (!instance.isEnded()) {
      this._log.info({
        msg: `Stopping process instance due to unfulfilled constraints. Id =${instanceID}`,
        instanceId: instanceID,
      });
    }

    const tokens = this.getAllInstanceTokens(instanceID);

    tokens.forEach((token) => {
      if (token.state === 'DEPLOYMENT-WAITING') {
        instance.interruptToken(token.tokenId); // will cancel shouldPassTokenHook
        instance.endToken(token.tokenId, {
          state: 'ERROR-CONSTRAINT-UNFULFILLED',
          errorMessage: `Instance stopped execution because of: ${unfulfilledConstraints.join(
            ', '
          )}`,
          endTime: +new Date(),
        });
        instance.updateLog(token.currentFlowElementId, token.tokenId, {
          machine: this.machineInformation,
          progress: token.currentFlowNodeProgress,
        });
      }

      if (token.state === 'READY' || token.state === 'RUNNING') {
        instance.endToken(token.tokenId, {
          state: 'ERROR-CONSTRAINT-UNFULFILLED',
          errorMessage: `Instance stopped execution because of: ${unfulfilledConstraints.join(
            ', '
          )}`,
          endTime: +new Date(),
        });
        instance.updateLog(token.currentFlowElementId, token.tokenId, {
          machine: this.machineInformation,
          progress: token.currentFlowNodeProgress,
        });
      }
    });

    if (enableMessaging) {
      await publishCurrentInstanceState(this, instance);
    }

    await this.archiveInstance(instance.id);
    this.deleteInstance(instance.id);
  }

  async abortInstance(
    instanceID,
    msg = `Aborting process instance due to signal from another machine. Id =${instanceID}`
  ) {
    const instance = this.getInstance(instanceID);

    if (!instance.isEnded()) {
      this._log.info({
        msg,
        instanceId: instanceID,
      });
    }

    const tokens = this.getAllInstanceTokens(instanceID);
    // abort all not-ended tokens on instance
    tokens.forEach((token) => {
      if (token.state === 'DEPLOYMENT-WAITING') {
        instance.interruptToken(token.tokenId); // will cancel shouldPassTokenHook
        instance.endToken(token.tokenId, { state: 'ABORTED', endTime: +new Date() });
      }

      if (token.state === 'READY' || token.state === 'RUNNING') {
        instance.endToken(token.tokenId, { state: 'ABORTED', endTime: +new Date() });
      }
    });

    if (enableMessaging) {
      await publishCurrentInstanceState(this, instance);
    }

    // archive the information for the stopped instance
    await this.archiveInstance(instance.id);
    this.deleteInstance(instance.id);
  }

  /**
   * Pauses an instance
   *
   * @param {string} instanceID id of the instance we want to pause
   */
  async pauseInstance(instanceID) {
    const instance = this.getInstance(instanceID);
    if (!instance.isEnded() && !instance.isPaused()) {
      instance.updateProcessStatus('PAUSING');
      this._log.info({
        msg: `Pausing process instance. Id = ${instanceID}`,
        instanceId: instanceID,
      });
      const tokens = this.getAllInstanceTokens(instanceID);

      let tokensRunning = false;
      // pause flowNode execution of tokens with state READY and DEPLOYMENT-WAITING
      tokens.forEach((token) => {
        const userTaskIndex = this.userTasks.findIndex(
          (uT) =>
            uT.processInstance.id === instanceID &&
            uT.id === token.currentFlowElementId &&
            uT.startTime === token.currentFlowElementStartTime
        );
        if (token.state === 'DEPLOYMENT-WAITING' || token.state === 'READY') {
          instance.pauseToken(token.tokenId);
          this.updateToken(instanceID, token.tokenId, { state: 'PAUSED' });

          if (userTaskIndex !== -1) {
            this.userTasks.splice(userTaskIndex, 1, {
              ...this.userTasks[userTaskIndex],
              state: 'PAUSED',
            });
          }
        }
        if (token.state === 'RUNNING') {
          if (userTaskIndex !== -1) {
            // pause userTask immediately
            instance.pauseToken(token.tokenId);
            this.updateToken(instanceID, token.tokenId, { state: 'PAUSED' });
            const newUserTask = { ...this.userTasks[userTaskIndex], state: 'PAUSED' };
            this.userTasks.splice(userTaskIndex, 1, newUserTask);
          } else {
            tokensRunning = true;
          }
        }
      });

      // wait for running tokens to end execution before setting instance state to PAUSED
      return new Promise((resolve, reject) => {
        if (!tokensRunning) {
          instance.pause();
          resolve();
        }

        instance.onInstanceStateChange((newInstanceState) => {
          const instanceInactive = newInstanceState.find(
            (tokenState) => tokenState === 'STOPPED' || tokenState === 'PAUSED'
          );
          if (instanceInactive) {
            reject();
          } else {
            tokensRunning = newInstanceState.find((tokenstate) => tokenstate === 'RUNNING');
            if (!tokensRunning) {
              resolve();
            }
          }
        });
      })
        .then(async () => {
          instance.pause();

          if (enableMessaging) {
            await publishCurrentInstanceState(this, instance);
          }

          this.archiveInstance(instance.id);
          this.deleteInstance(instance.id);
        })
        .catch(() => {});
    }
  }

  getPendingUserTasks() {
    const pendingUserTasks = this.userTasks.filter(
      (userTask) => userTask.state === 'READY' || userTask.state === 'ACTIVE'
    );

    const pendingUserTasksWithTokenInfo = pendingUserTasks.map((uT) => {
      const token = this.getToken(uT.processInstance.id, uT.tokenId);
      return {
        ...uT,
        priority: token.priority,
        progress: token.currentFlowNodeProgress.value,
        performers: token.performers,
      };
    });
    return pendingUserTasksWithTokenInfo;
  }

  getInactiveUserTasks() {
    const inactiveUserTasks = this.userTasks.filter(
      (userTask) => userTask.state !== 'READY' && userTask.state !== 'ACTIVE'
    );

    const inactiveUserTasksWithLogInfo = inactiveUserTasks.map((uT) => {
      const instance = this.getInstance(uT.processInstance.id);
      const logs = instance.getState().log;
      const userTaskLogEntry = logs.find(
        (logEntry) => logEntry.flowElementId === uT.id && logEntry.tokenId === uT.tokenId
      );

      return {
        ...uT,
        priority: userTaskLogEntry.priority,
        progress: userTaskLogEntry.progress.value,
        performers: userTaskLogEntry.performers,
      };
    });
    return inactiveUserTasksWithLogInfo;
  }

  getMilestones(instanceID, userTaskID) {
    const userTask = this.userTasks.find(
      (uT) => uT.processInstance.id === instanceID && uT.id === userTaskID
    );

    const token = this.getToken(instanceID, userTask.tokenId);

    return token.milestones || {};
  }
  updateMilestones(instanceID, userTaskID, milestones) {
    const userTask = this.userTasks.find(
      (uT) =>
        uT.processInstance.id === instanceID &&
        uT.id === userTaskID &&
        (uT.state === 'READY' || uT.state === 'ACTIVE')
    );
    if (!userTask) return;

    const token = this.getToken(instanceID, userTask.tokenId);
    const newMilestones = { ...token.milestones, ...milestones };

    userTask.processInstance.updateToken(token.tokenId, {
      milestones: newMilestones,
    });

    if (!token.currentFlowNodeProgress.manual) {
      const currentProgress = Object.values(newMilestones).reduce(
        (prev, curr, _, array) => prev + curr / array.length,
        0
      );
      this.setFlowNodeProgress(instanceID, token.tokenId, {
        value: currentProgress,
        manual: false,
      });
    }

    userTask.milestones = newMilestones;
  }

  updateIntermediateVariablesState(instanceID, userTaskID, variables) {
    const userTask = this.userTasks.find(
      (uT) =>
        uT.processInstance.id === instanceID &&
        uT.id === userTaskID &&
        (uT.state === 'READY' || uT.state === 'ACTIVE')
    );

    Object.entries(variables).forEach(([key, value]) =>
      userTask.processInstance.setVariable(userTask.tokenId, key, value)
    );

    const token = this.getToken(instanceID, userTask.tokenId);
    userTask.variableChanges = { ...token.intermediateVariablesState };
  }

  setFlowNodeState(instanceId, tokenId, state, variables) {
    const instance = this.getInstance(instanceId);
    const token = this.getToken(instanceId, tokenId);
    const activityId = token.currentFlowElementId;
    switch (state) {
      case 'ACTIVE':
      case 'EXTERNAL':
        instance.setFlowNodeState(tokenId, 'EXTERNAL');
        break;
      case 'COMPLETED':
        instance.completeActivity(activityId, tokenId, variables);
        break;
      case 'TERMINATED':
        instance.terminateActivity(activityId, tokenId);
        break;
      case 'FAILED':
        instance.failActivity(activityId, tokenId);
        break;
      default:
        throw new Error('Invalid state');
    }
  }

  /**
   * Clean up some data when the engine is supposed to be removed
   */
  destroy() {
    for (const instanceId of this.instanceIDs) {
      this.deleteInstance(instanceId);
    }
  }
}

module.exports = Engine;
