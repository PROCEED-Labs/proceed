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
 * @param {{ name: string; type: string; enum?: string; }[]} [variableDefinitions=[]] meta data about the variables expected in the instance
 * containing the user task
 * @returns {string} the html with the placeholders replaced by the correct values
 */
function inlineUserTaskData(
  html,
  instanceId,
  userTaskId,
  variables,
  milestones,
  variableDefinitions = [],
) {
  const variableDefinitionsMap = Object.fromEntries(
    variableDefinitions.map((def) => [def.name, def]),
  );
  const script = `
    const instanceID = '${instanceId}';
    const userTaskID = '${userTaskId}';

    const variableDefinitions = ${JSON.stringify(variableDefinitionsMap)};

    function getValueFromCheckbox(checkbox) {
      if (!checkbox.defaultValue) {
        return !!checkbox.checked;
      } else {
        return checkbox.checked ? checkbox.defaultValue : undefined;
      }
    }

    function getValueFromVariableElement(element) {
      let value;
      if (element.tagName === 'INPUT') {
        if (element.type === 'number') {
          value = element.value && parseFloat(element.value);
          if (value && Number.isNaN(value)) throw new Error('The given value is not a valid number.');
        } else {
          value = element.value;
        }
      } else {
        const classes = Array.from(element.classList.values());
        if (classes.includes('user-task-form-input-group')) {
          const checkboxes = Array.from(element.querySelectorAll("input[type='checkbox']"));
          const radios = Array.from(element.querySelectorAll("input[type='radio']"));
          if (checkboxes.length) {
            if (checkboxes.length === 1) {
              const [checkbox] = checkboxes;
              value = getValueFromCheckbox(checkbox);
            } else {
              value = checkboxes.map(getValueFromCheckbox).filter(v => v !== undefined);
            }
          } else if (radios.length) {
            const checked = radios.find(r => r.checked === true);
            value = checked.value;
          }
        }
      }

      return value;
    }

    function validateValue(key, value) {
      if (!value) return;

      const definition = variableDefinitions[key];
      if (!definition) return;

      if (definition.enum) {
        const allowedValues = definition.enum.split(';');
        if (!allowedValues.includes((typeof value === 'string') ? value : JSON.stringify(value))) {
          throw new Error(\`Invalid value. Expected one of \${allowedValues.join(', ')}\`);
        }
      }
    }

    function updateValidationErrorMessage(key, message) {
      const elements = Array.from(document.getElementsByClassName(\`input-for-\${key}\`));
      if (!elements.length) return;
      const [element] = elements;
      element.classList.remove('invalid');
      const messageEl = element.getElementsByClassName('validation-error');
      if (messageEl.length) messageEl[0].textContent = '';
      if (message) {
        element.classList.add('invalid');
        if (messageEl.length) messageEl[0].textContent = message;
      }
    }

    window.addEventListener('submit', (event) => {
      event.preventDefault();

      const variableElements = Array.from(document.querySelectorAll('[class*=\"variable-\"]'));

      const variables = {};
      let validationErrors = 0;
      variableElements.forEach(el => {
        const key = Array.from(el.classList.values()).find(c => c.startsWith('variable-')).split('variable-')[1];
        try {
          const value = getValueFromVariableElement(el);
          validateValue(key, value);
          updateValidationErrorMessage(key);
          variables[key] = value;
        } catch (err) {
          ++validationErrors;
          updateValidationErrorMessage(key, err.message);
        }
      });

      if (validationErrors) return;

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
      Array.from(variableInputs).filter(input => input.tagName === 'INPUT').forEach((variableInput) => {
        let variableInputTimer;

        variableInput.addEventListener('input', (event) => {
          const variableName = Array.from(event.target.classList)
          .find((className) => className.includes('variable-'))
          .split('variable-')
          .slice(1)
          .join('');

          clearTimeout(variableInputTimer);

          variableInputTimer = setTimeout(() => {
            try {
              console.log(event.target);
              const value = getValueFromVariableElement(event.target);

              validateValue(variableName, value);
              updateValidationErrorMessage(variableName);

              window.PROCEED_DATA.put(
                '/tasklist/api/variable',
                { [variableName]: value },
                {
                  instanceID,
                  userTaskID,
                }
              );
            } catch (err) {
              updateValidationErrorMessage(variableName, err.message);
            }
          }, 2000)
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
