import { z } from 'zod';
import { type InferSchema } from 'xmcp';
import { isAccessible, toAuthorizationSchema, verifyCode } from '@/lib/mcp-utils';
import { isUserErrorResponse } from '@/lib/user-error';
import { getCorrectTargetEngines, getDeployment } from '@/lib/engines/server-actions';
import { getDeployments } from '@/lib/engines/deployment';

// Define the schema for tool parameters
export const schema = toAuthorizationSchema({});

// Define tool metadata
export const metadata = {
  name: 'get-executions',
  description: 'Get all process executions that are accessible to the current user.',
  annotations: {
    title: 'Get executions',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

// Tool implementation
export default async function getExecutions({ userCode }: InferSchema<typeof schema>) {
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

    const engines = await getCorrectTargetEngines(environmentId, undefined, undefined, ability);

    const deployments = await getDeployments(engines, 'instances');

    const instanceIds = new Set<string>();

    deployments.forEach((d) => d.instances.forEach((i) => instanceIds.add(i.processInstanceId)));

    return {
      content: [{ type: 'text', text: JSON.stringify([...instanceIds]) }],
    };
  } catch (err) {
    if (err instanceof Error) return err.message;
    else return 'Error: Something went wrong';
  }
}
