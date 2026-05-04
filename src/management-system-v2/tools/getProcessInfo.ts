import { z } from 'zod';
import { type InferSchema } from 'xmcp';
import { getProcess, getProcessLatestVersion } from '@/lib/data/db/process';
import { isAccessible, toAuthorizationSchema, verifyCode } from '@/lib/mcp-utils';
import { isUserErrorResponse } from '@/lib/user-error';
import { toCaslResource } from '@/lib/ability/caslAbility';

// Define the schema for tool parameters
export const schema = toAuthorizationSchema({
  processId: z.string().describe('The ID of the process'),
});

// Define tool metadata
export const metadata = {
  name: 'get-process-info',
  description: 'Get the BPMN representation of a process',
  annotations: {
    title: 'Get process info',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

// Tool implementation
export default async function getProcessInfo({ processId, userCode }: InferSchema<typeof schema>) {
  try {
    const verification = await verifyCode(userCode);

    if (isUserErrorResponse(verification)) return `Error: ${verification.error.message}`;

    const { userId, environmentId, ability } = verification;

    // check if the user can access processes in this space
    let accessible = await isAccessible(
      userId,
      environmentId,
      ['PROCEED_PUBLIC_PROCESS_DOCUMENTATION_ACTIVE'],
      ['process-documentation'],
      [['view', 'Process']],
    );

    // check if the user can access the specified process
    // (the process might be in a directory that the user cannot access)
    const internalProcess = await getProcess(processId);
    accessible = accessible && ability.can('view', toCaslResource('Process', internalProcess));

    if (!accessible) {
      return 'Error: The user cannot access processes in this space. This might be due to a space wide setting or due to the user not having the permission to view processes or this specific process.';
    }

    const process = await getProcessLatestVersion(processId, true);

    return process.bpmn;
  } catch (err) {
    return `Error: Process with ID ${processId} not found.`;
  }
}
