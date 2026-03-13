import { z } from 'zod';
import prisma from '@/lib/data/db';
import { type InferSchema } from 'xmcp';
import { toAuthorizationSchema, verifyCode } from '@/lib/mcp-utils';
import { isUserErrorResponse } from '@/lib/user-error';
import {
  completeTasklistEntry,
  getCorrectTargetEngines,
  getTasklistEntryHTML,
  setTasklistEntryVariableValues,
} from '@/lib/engines/server-actions';
import { getDeployment } from '@/lib/engines/deployment';
import { getProcessIds, getVariablesFromElementById } from '@proceed/bpmn-helper';
import { truthyFilter } from '@/lib/typescript-utils';

const variableSchema = z
  .array(z.object({ name: z.string(), value: z.any() }))
  .describe(
    'A list of variables with values. The format of the entries should be { name, value }. Where name is the name of the variable and value is the value provided by the user.',
  );

// Define the schema for tool parameters
export const schema = toAuthorizationSchema({
  id: z.string().describe('The id of the task for which the user tries to get information.'),
  variables: variableSchema,
});

// Define tool metadata
export const metadata = {
  name: 'submit-task',
  description:
    'Submit a task for the user.\n' +
    'The call should provide the data that would normally be sent when the user submits the associated form after having filled out all inputs.',
  annotations: {
    title: 'Submit task',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

// Tool implementation
export default async function submitTask({ userCode, id, variables }: InferSchema<typeof schema>) {
  try {
    const verification = await verifyCode(userCode);

    if (isUserErrorResponse(verification)) return `Error: ${verification.error.message}`;

    const { environmentId, ability } = verification;

    const validate = variableSchema.safeParse(variables);

    if (!validate.success) {
      console.error(`LLM sent wrong variable format for task submission: ${validate.error}`);
      return 'Error: The given variables are not in the required format';
    }

    const task = await prisma.userTask.findUnique({ where: { id } });

    if (!task) return 'Error: Task not found';

    const engines = await getCorrectTargetEngines(environmentId, false, undefined, ability);
    const engine = engines.find((engine) => engine.id === task.machineId);
    if (!engine) return 'Error: Could not find the engine that triggered the task';

    const html = await getTasklistEntryHTML(environmentId, id, task.fileName, engine);
    if (isUserErrorResponse(html)) return `Error: ${html.error.message}`;

    const [taskId, instanceId, startTimeString] = id.split('|');
    const [definitionId] = instanceId.split('-_');
    const deployment = await getDeployment(engine, definitionId);
    const instance = deployment.instances.find((i) => i.processInstanceId === instanceId);

    // map the input variables to the submission format expected by the engine
    let mappedVariables: Record<string, any> = {};
    variables.forEach((variable) => (mappedVariables[variable.name] = variable.value));

    // check the variables that are to be set by the inputs of the task form
    const matches = [
      ...new Set([...html.matchAll(/<input [^>]*name="([^"]*)"[^>]*>/g)].map((entry) => entry[1])),
    ];

    // check if there are variables which would be settable through the form that were not sent by
    // the LLM
    const missingVariables = matches.filter((varName) => !(varName in mappedVariables));
    if (missingVariables.length) {
      return `Error: Information for the following variables is missing but has to be provided: ${missingVariables.join(', ')}`;
    }

    // check if there are variables that were sent by the LLM which are not mentioned in the form
    const invalidVariables = Object.keys(mappedVariables).filter(
      (varName) => !matches.includes(varName),
    );
    if (invalidVariables.length) {
      let error = `Error: The following variables were sent even though they are not included in the variables this task should affect: ${invalidVariables.join(', ')}.`;
      if (!matches.length) error += ' This task should not submit any variables.';
      else error += ` This task should only submit the following variables: ${matches.join(', ')}.`;
      return error;
    }

    if (instance) {
      const version = deployment.versions.find((v) => v.versionId === instance.processVersion)!;

      if (!version) return 'Error: Unable to access required data';

      const processIds = await getProcessIds(version.bpmn);
      if (processIds.length) {
        const [processId] = processIds;
        const variableDefinitions = await getVariablesFromElementById(version.bpmn, processId);

        const invalidTypedVariables = matches
          .map((varName) => {
            const definition = variableDefinitions.find((v) => v.name === varName);

            const stringTypes = ['string', 'data'];

            if (definition) {
              switch (typeof mappedVariables[varName]) {
                case 'string':
                  if (!stringTypes.includes(definition.dataType))
                    return [varName, 'string', definition.dataType];
                  break;
                case 'number':
                  if (definition.dataType !== 'number')
                    return [varName, 'number', definition.dataType];
                  break;
                case 'boolean':
                  if (definition.dataType !== 'boolean')
                    return [varName, 'boolean', definition.dataType];
                  break;
                case 'object':
                  {
                    if (Array.isArray(mappedVariables[varName])) {
                      if (definition.dataType !== 'array')
                        return [varName, 'array', definition.dataType];
                    } else if (definition.dataType !== 'object')
                      return [varName, 'object', definition.dataType];
                  }
                  break;
                default:
                  return `The data type ${definition.dataType} of variable ${varName} is currently not supported by this tool. The task can therefore not be submitted by the tool.`;
              }
            }
          })
          .filter(truthyFilter);

        if (invalidTypedVariables.length)
          return `Error: The following variables have invalid types\n${invalidTypedVariables.map((v) => `"${v[0]}" was ${v[1]} but expected ${v[2]}`).join('\n')}`;
      }
    }

    const variableUpdate = await setTasklistEntryVariableValues(id, mappedVariables, engine);

    if (isUserErrorResponse(variableUpdate)) return `Error: ${variableUpdate.error.message}`;

    const result = await completeTasklistEntry(id, mappedVariables, engine);

    if (isUserErrorResponse(result)) return `Error: ${result.error.message} `;

    return 'Success';
  } catch (err) {
    if (err instanceof Error) return err.message;
    else return 'Error: Something went wrong';
  }
}
