/**
 * An object containing information about a user task execution
 */
export type UserTaskInfo = {
  /**
   * - the id of the user task
   */
  id: string;
  /**
   * - the time at which execution of the element started
   */
  startTime: number;
  /**
   * - the time at which execution of the element ended
   */
  endTime?: number;
  /**
   * - the current execution state of the user task
   */
  state: string;
  /**
   * - the values of the milestones of the user task
   */
  milestones?: {
    [key: string]: number;
  };
  /**
   * - the variables that were changed by the user task
   */
  variableChanges?: {
    [key: string]: any;
  };
};
/**
 * An object containing information about a token in an instance
 */
export type TokenInfo = {
  /**
   * - the id of the token
   */
  tokenId: string;
  /**
   * - the state the token is in
   */
  state: string;
  /**
   * - the flow element the token resides on
   */
  currentFlowElementId: string;
  /**
   * - the time the current execution of the current flow element started
   */
  currentFlowElementStartTime: number;
  /**
   * - the values of variables changed during the tokens execution that are not yet committed to the instance
   */
  intermediateVariablesState?: {
    [key: string]: any;
  };
};
/**
 * An object containing information about a token in an instance
 */
export type VariableInfo = {
  /**
   * - the value of the variable
   */
  value: any;
  log: {
    changedTime: number;
    changedBy: string;
    oldValue?: any;
  }[];
};
/**
 * An object containing information about already executed flow nodes
 */
export type LogEntry = {
  /**
   * - id of the executed element
   */
  flowElementId: string;
  /**
   * - id of the token that activated the element
   */
  tokenId: string;
  /**
   * - the with which the execution of the element ended
   */
  executionState: string;
  /**
   * - the time at which execution of the element started
   */
  startTime: number;
  /**
   * - the time at which execution of the element ended
   */
  endTime: number;
};
/**
 * An object containing information about a process execution
 */
export type InstanceInfo = {
  /**
   * - the id of the process that is being executed
   */
  processId: string;
  /**
   * - the id of the instance
   */
  processInstanceId: string;
  /**
   * - the time the instance was started
   */
  globalStartTime: number;
  /**
   * - the states of the tokens in the instance
   */
  instanceState: string[];
  /**
   * - the tokens currently existing in the instance
   */
  tokens: TokenInfo[];
  /**
   * - the variables in the instance (state and change log)
   */
  variables: {
    [key: string]: VariableInfo;
  };
  /**
   * - execution log with info about already executed flow nodes
   */
  log: LogEntry[];
};
/**
 * @module @proceed/user-task-helper
 */
/**
 * An object containing information about a user task execution
 *
 * @typedef UserTaskInfo
 * @type {object}
 * @property {string} id - the id of the user task
 * @property {number} startTime - the time at which execution of the element started
 * @property {number} [endTime] - the time at which execution of the element ended
 * @property {string} state - the current execution state of the user task
 * @property {{ [key: string]: number }} [milestones] - the values of the milestones of the user task
 * @property {{ [key: string]: any }} [variableChanges] - the variables that were changed by the user task
 */
/**
 * An object containing information about a token in an instance
 *
 * @typedef TokenInfo
 * @type {object}
 * @property {string} tokenId - the id of the token
 * @property {string} state - the state the token is in
 * @property {string} currentFlowElementId - the flow element the token resides on
 * @property {number} currentFlowElementStartTime - the time the current execution of the current flow element started
 * @property {{ [key: string]: any }} [intermediateVariablesState] - the values of variables changed during the tokens execution that are not yet committed to the instance
 */
/**
 * An object containing information about a token in an instance
 *
 * @typedef VariableInfo
 * @type {object}
 * @property {any} value - the value of the variable
 * @property {{ changedTime: number, changedBy: string, oldValue?: any }[]} log
 */
/**
 * An object containing information about already executed flow nodes
 *
 * @typedef LogEntry
 * @type {object}
 * @property {string} flowElementId - id of the executed element
 * @property {string} tokenId - id of the token that activated the element
 * @property {string} executionState - the with which the execution of the element ended
 * @property {number} startTime - the time at which execution of the element started
 * @property {number} endTime - the time at which execution of the element ended
 */
/**
 * An object containing information about a process execution
 *
 * @typedef InstanceInfo
 * @type {object}
 * @property {string} processId - the id of the process that is being executed
 * @property {string} processInstanceId - the id of the instance
 * @property {number} globalStartTime - the time the instance was started
 * @property {string[]} instanceState - the states of the tokens in the instance
 * @property {TokenInfo[]} tokens - the tokens currently existing in the instance
 * @property {{ [key: string]: VariableInfo }} variables - the variables in the instance (state and change log)
 * @property {LogEntry[]} log - execution log with info about already executed flow nodes
 */
/**
 * Returns the relevant variable state for a user task that is being executed or was executed at some point in the past
 *
 * @param {UserTaskInfo} userTask information about the user task for which we want to get the data
 * @param {InstanceInfo} instance the instance information that contains the relevant data
 * @returns {{ [key: string]: any }} the value for all variables at the time the user task was executed
 */
export function getCorrectVariableState(
  userTask: UserTaskInfo,
  instance: InstanceInfo,
): {
  [key: string]: any;
};
/**
 * Returns the relevant milestone state for a user task that is being executed or was executed at some point in the past
 *
 * @param {string} bpmn the bpmn of the process the user task is part of
 * @param {UserTaskInfo} userTask information about the user task for which we want to get the data
 * @param {InstanceInfo} instance the instance information that contains the relevant data
 * @returns {Promise<{ id: string; name: string; description?: string; value: number; }[]>}
 */
export function getCorrectMilestoneState(
  bpmn: string,
  userTask: UserTaskInfo,
  instance: InstanceInfo,
): Promise<
  {
    id: string;
    name: string;
    description?: string;
    value: number;
  }[]
>;
/**
 * Function that replaces the {{script}} placeholder in the html with the default script
 *
 * @param {string | Buffer} html the html that contains placeholders to replace with some data
 * @param {string} instanceId the id of the instance the user task was triggered in
 * @param {string} userTaskId the id of the user task element that created this user task instance
 * @param {{ name: string; dataType: string; enum?: string; }[]} [variableDefinitions=[]] meta data about the variables expected in the instance
 * containing the user task
 * @returns {string} the html with the placeholders replaced by the correct values
 */
export function inlineScript(
  html: string | Buffer,
  instanceId: string,
  userTaskId: string,
  variableDefinitions?: {
    name: string;
    dataType: string;
    enum?: string;
  }[],
): string;
/**
 * Function that replaces placeholders in html with the correct data
 *
 * @param {string | Buffer} html the html that contains placeholders to replace with some data
 * @param {ReturnType<typeof getCorrectVariableState>} variables the values of variables at the time the user task is executed
 * @param {Awaited<ReturnType<typeof getCorrectMilestoneState>>} milestones the milestones assigned to the user task
 * @returns {string} the html with the placeholders replaced by the correct values
 */
export function inlineUserTaskData(
  html: string | Buffer,
  variables: ReturnType<typeof getCorrectVariableState>,
  milestones: Awaited<ReturnType<typeof getCorrectMilestoneState>>,
): string;
