const whiskers = require('whiskers');

const { getMilestonesFromElementById } = require('@proceed/bpmn-helper/src/getters');
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
function getCorrectVariableState(userTask, instance) {
  const variables = {};

  // handle variables on user tasks that have already ended
  Object.entries(instance.variables).forEach(([key, { value, log }]) => {
    for (const entry of log) {
      if (userTask.endTime && entry.changedTime > userTask.endTime + 10) {
        value = entry.oldValue;
        break;
      }
    }

    variables[key] = value;
  });

  if (userTask.variableChanges) {
    Object.entries(userTask.variableChanges).forEach(([key, value]) => (variables[key] = value));
  }

  // handle variables on user tasks that are still running
  const userTaskToken = instance.tokens.find(
    (token) =>
      token.currentFlowElementId === userTask.id &&
      token.currentFlowElementStartTime === userTask.startTime,
  );

  if (userTaskToken) {
    Object.entries(userTaskToken.intermediateVariablesState).forEach(([key, value]) => {
      variables[key] = value;
    });
  }

  return variables;
}

/**
 * Returns the relevant milestone state for a user task that is being executed or was executed at some point in the past
 *
 * @param {string} bpmn the bpmn of the process the user task is part of
 * @param {UserTaskInfo} userTask information about the user task for which we want to get the data
 * @param {InstanceInfo} instance the instance information that contains the relevant data
 * @returns {Promise<{ id: string; name: string; description?: string; value: number; }[]>}
 */
async function getCorrectMilestoneState(bpmn, userTask, instance) {
  const userTaskToken = instance.tokens.find(
    (token) =>
      token.currentFlowElementId === userTask.id &&
      token.currentFlowElementStartTime === userTask.startTime,
  );

  let milestonesData;
  if (userTaskToken) {
    milestonesData = userTaskToken.milestones;
  } else {
    milestonesData = userTask.milestones;
  }

  const milestones = await getMilestonesFromElementById(bpmn, userTask.id);
  return milestones.map((milestone) => ({
    ...milestone,
    value: milestonesData[milestone.id] || 0,
  }));
}

/**
 * Function that replaces placeholders in html with the correct data
 *
 * @param {string} html the html that contains placeholders to replace with some data
 * @param {string} instanceId the id of the instance the user task was triggered in
 * @param {string} userTaskId the id of the user task element that created this user task instance
 * @param {ReturnType<typeof getCorrectVariableState>} variables the values of variables at the time the user task is executed
 * @param {Awaited<ReturnType<typeof getCorrectMilestoneState>>} milestones the milestones assigned to the user task
 * @returns {string} the html with the placeholders replaced by the correct values
 */
function inlineUserTaskData(html, instanceId, userTaskId, variables, milestones) {
  const script = `
    const instanceID = '${instanceId}';
    const userTaskID = '${userTaskId}';

    window.addEventListener('submit', (event) => {
      event.preventDefault();

      const data = new FormData(event.target);


      const variables = {};
      const entries = data.entries();
      let entry = entries.next();
      while (!entry.done) {
        const [key, value] = entry.value;
        if (variables[key]) {
          if (!Array.isArray(variables[key])) {
            variables[key] = [variables[key]];
          }
          variables[key].push(value);
        } else {
          variables[key] = value;
        }
        entry = entries.next();
      }

      window.PROCEED_DATA.put('/tasklist/api/variable', variables, {
          instanceID,
          userTaskID,
      }).then(() => {
        window.PROCEED_DATA.post('/tasklist/api/userTask', variables, {
          instanceID,
          userTaskID,
        });
      });
    })

    function updateUploadInfo(input) {
      const parent = input.parentElement.parentElement;
      const selectedFileElements = parent.getElementsByClassName("selected-files");
      if (selectedFileElements.length) {
        const [selectedFileElement] = selectedFileElements;
        for (const child of selectedFileElement.childNodes) {
          selectedFileElement.removeChild(child);
        }
        for (const file of input.files) {
          const div = document.createElement('div');

          if (file.type.startsWith('image')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.alt = file.name;
            div.appendChild(img);
          } else {
            div.textContent = file.name;
          }
          selectedFileElement.appendChild(div);
        }
      }
    }

    window.addEventListener('DOMContentLoaded', () => {
      const milestoneInputs = document.querySelectorAll(
        'input[class^="milestone-"]'
      );
      Array.from(milestoneInputs).forEach((milestoneInput) => {
        milestoneInput.addEventListener('input', (event) => {
          milestoneInput.nextElementSibling.value = milestoneInput.value + '%'
        });

        milestoneInput.addEventListener('click', (event) => {
          const milestoneName = Array.from(event.target.classList)
          .find((className) => className.includes('milestone-'))
          .split('milestone-')
          .slice(1)
          .join('');

          window.PROCEED_DATA.put(
            '/tasklist/api/milestone',
            { [milestoneName]: parseInt(event.target.value) },
            {
              instanceID,
              userTaskID,
            }
          );
        });
      });

      const variableInputs = document.querySelectorAll(
        'input[class^="variable-"]'
      );
      Array.from(variableInputs).forEach((variableInput) => {
        let variableInputTimer;

        variableInput.addEventListener('input', (event) => {
          const variableName = Array.from(event.target.classList)
          .find((className) => className.includes('variable-'))
          .split('variable-')
          .slice(1)
          .join('');

          clearTimeout(variableInputTimer);

          if (event.target.type === 'file') {
            updateUploadInfo(event.target);
            return;
          }

          variableInputTimer = setTimeout(() => {
            window.PROCEED_DATA.put(
              '/tasklist/api/variable',
              { [variableName]: event.target.value },
              {
                instanceID,
                userTaskID,
              }
            );
          }, 5000)
        });
      });
    })
    `;

  const finalHtml = whiskers.render(html, {
    ...variables,
    milestones,
    script,
  });

  return finalHtml;
}

module.exports = {
  getCorrectVariableState,
  getCorrectMilestoneState,
  inlineUserTaskData,
};
