import { z } from 'zod';
import { type InferSchema } from 'xmcp';
import { isAccessible, toAuthorizationSchema, verifyCode } from '@/lib/mcp-utils';
import { isUserErrorResponse } from '@/lib/user-error';
import { getCorrectTargetEngines, getDeployment } from '@/lib/engines/server-actions';
import { deployProcess } from '@/lib/engines/deployment';
import { startInstanceOnMachine } from '@/lib/engines/instances';
import { getProcess, getProcessLatestVersion } from '@/lib/data/db/process';
import { toCaslResource } from '@/lib/ability/caslAbility';

// Define the schema for tool parameters
export const schema = toAuthorizationSchema({
  instanceId: z.string().describe('The id of the process execution to inspect.'),
});

// Define tool metadata
export const metadata = {
  name: 'get-execution-info',
  description:
    "Returns information about the current state of a process' execution in the form of a json file.",
  annotations: {
    title: 'Get execution info',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

// Tool implementation
export default async function startProcess({ userCode, instanceId }: InferSchema<typeof schema>) {
  try {
    const verification = await verifyCode(userCode);
    if (isUserErrorResponse(verification)) return `Error: ${verification.error.message}`;

    const { userId, environmentId, ability } = verification;

    let accessible = await isAccessible(
      userId,
      environmentId,
      ['PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE'],
      ['process-automation.executions'],
      [['view', 'Execution']],
    );

    const [definitionId] = instanceId.split('-_');

    const deployment = await getDeployment(environmentId, definitionId, ability);

    if (!deployment) return 'Could not find an execution with the given id.';

    const instance = deployment.instances.find((i) => i.processInstanceId === instanceId);

    if (!instance) return 'Could not find an execution with the given id.';

    console.log(instance);

    return {
      content: [{ type: 'text', text: JSON.stringify(instance) }],
    };
  } catch (err) {
    if (err instanceof Error) return err.message;
    else return 'Error: Something went wrong';
  }
}
