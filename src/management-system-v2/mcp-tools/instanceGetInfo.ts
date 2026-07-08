import { z } from 'zod';
import { type InferSchema } from 'xmcp';
import { isAccessible, toAuthorizationSchema, verifyCode } from '@/lib/mcp-utils';
import { isUserErrorResponse } from '@/lib/user-error';
import { omit } from '@/lib/helpers/javascriptHelpers';
import {
  getDefinitionsVersionInformation,
  getElementById,
  toBpmnObject,
} from '@proceed/bpmn-helper';
import { getInstance } from '@/lib/data/instance';
import { getProcessBPMN } from '@/lib/data/processes';
import { refetchDeployments } from '@/lib/executions/deployment-server-actions';

// Define the schema for tool parameters
export const schema = toAuthorizationSchema({
  instanceId: z.string().describe('The unique id of the process instance to be inspected.'),
});

// Define tool metadata
export const metadata = {
  name: 'get-process-execution-info',
  description:
    'Retrieve information about the current status of a specific process execution, also known as a process instance. The returned JSON contains several important sections; among others, `processId` and `processVersion.versionId` provide a clear reference to the executed business process, `instanceState` describes the overall state of the process instance, `processInstanceInitiator` identifies the user who started the execution, the `tokens[]` array lists the process paths and elements currently being executed, and the `log[]` array lists the process elements that have already been executed.\n' +
    'The exact definition of the returned properties can be found here: https://github.com/PROCEED-Labs/proceed/wiki/PROCEED-Engine-%E2%80%90-Process-Instance,-Tokens,-Datastructure-and-REST-Endpoint#the-instance',
  annotations: {
    title: 'Get process execution info',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

// Tool implementation
export default async function getProcessExecutionInfo({
  userCode,
  instanceId,
}: InferSchema<typeof schema>) {
  try {
    const verification = await verifyCode(userCode);
    if (isUserErrorResponse(verification)) return `Error: ${verification.error.message}`;

    const { userId, environmentId, ability } = verification;

    let accessible = await isAccessible(
      userId,
      environmentId,
      ['PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE'],
      ['process-automation.executions'],
      [
        ['view', 'Execution'],
        ['view', 'Machine'],
      ],
    );

    if (!accessible)
      return 'Error: The user cannot access execution information in this space. This might be due to a space wide setting or due to the user not having the permission to view execution information.';

    // make sure that the data for the instance is not stale
    await refetchDeployments();
    const storedInstance = await getInstance(environmentId, instanceId, ability);
    if (isUserErrorResponse(storedInstance)) return storedInstance;
    if (!storedInstance) return 'Could not find an execution with the given id.';

    const instance = storedInstance.state;

    const versionBpmn = await getProcessBPMN(
      instance.processId,
      environmentId,
      instance.processVersion,
      ability,
    );

    if (isUserErrorResponse(versionBpmn)) return versionBpmn;

    const bpmnObj = await toBpmnObject(versionBpmn);
    const idToName = (id: string) => {
      if (bpmnObj) {
        return (getElementById(bpmnObj, id) as any)?.name;
      }
    };

    const versionInfo = await getDefinitionsVersionInformation(bpmnObj);
    // extend the instance information object with data that might be useful to the user and the LLM
    // the most significant changes are mapping from user/role ids to actual user/role information
    // insertions of process element names alongside process element ids
    const mappedInstance = {
      // this information is not needed by/already known to the LLM
      ...omit(instance, [
        'managementSystemLocation',
        'processInstanceInitiatorSpaceId',
        'userTasks',
      ]),
      tokens: instance.tokens.map((t) => ({
        ...omit(t, ['actualOwner', 'performers', 'costsRealSetByOwner']),
        actualPerformers: t.actualOwner,
        potentialPerformers: t.performers,
        // extend with user readable information
        currentFlowElementName: idToName(t.currentFlowElementId),
        stepExecutionCosts: t.costsRealSetByOwner,
      })),
      variables: Object.fromEntries(
        Object.entries(instance.variables).map(([key, info]) => [
          key,
          {
            ...info,
            // add the name so the llm can show it instead of the id
            log: info.log.map((l) => ({
              ...l,
              changedByElementName: l.changedBy && idToName(l.changedBy),
            })),
          },
        ]),
      ),
      log: instance.log.map((l) => ({
        ...omit(l, ['actualOwner', 'performers', 'costsRealSetByOwner']),
        actualPerformers: l.actualOwner,
        potentialPerformers: l.performers,
        // add the name so the llm can show it instead of the id
        flowElementName: idToName(l.flowElementId),
        stepExecutionCosts: l.costsRealSetByOwner,
      })),
      // remove execution information needed by the engine
      processVersion: versionInfo,
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(mappedInstance) }],
    };
  } catch (err) {
    if (err instanceof Error) return err.message;
    else return 'Error: Something went wrong';
  }
}
