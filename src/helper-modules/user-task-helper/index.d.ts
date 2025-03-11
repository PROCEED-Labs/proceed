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
     * - the values of variables changed during the tokens execution that are not yet commited to the instance
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
 * Function that replaces placeholders in html with the correct data
 *
 * @param {string} bpmn the bpmn of the process the user task is executed in
 * @param {string} html the html that contains placeholders to replace with some data
 * @param {UserTaskInfo} userTask the user Task for which the returned html will be used
 * @param {InstanceInfo} instance the instance information that contains the relevant data to inline
 * @returns {Promise<string>} the html with all placeholders replaced by the respective data
 */
export function inlineUserTaskData(bpmn: string, html: string, userTask: UserTaskInfo, instance: InstanceInfo): Promise<string>;
