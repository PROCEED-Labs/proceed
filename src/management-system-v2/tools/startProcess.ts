import { z } from 'zod';
import { type InferSchema } from 'xmcp';
import { isAccessible, toAuthorizationSchema, verifyCode } from '@/lib/mcp-utils';
import { isUserErrorResponse } from '@/lib/user-error';
import { getCorrectTargetEngines } from '@/lib/engines/server-actions';
import { deployProcess } from '@/lib/engines/deployment';
import { startInstanceOnMachine } from '@/lib/engines/instances';
import { getProcess, getProcessLatestVersion } from '@/lib/data/db/process';
import { toCaslResource } from '@/lib/ability/caslAbility';

// Define the schema for tool parameters
export const schema = toAuthorizationSchema({
  processId: z.string().describe('The ID of the process'),
  startParameters: z
    .record(z.string(), z.any())
    .optional()
    .describe(
      'The start parameters required from the user at startup. The parameters can be found in the bpmn of the process.',
    ),
});

// Define tool metadata
export const metadata = {
  name: 'start-process',
  description:
    "Starts executing a process if that process is executable. Might require specific start variables to work which can be found in the process' bpmn.",
  annotations: {
    title: 'Start a process',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

// Tool implementation
export default async function startProcess({
  userCode,
  processId,
  startParameters,
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
        ['create', 'Execution'],
        ['view', 'Machine'],
      ],
    );

    // check if the user can access the specified process
    // (the process might be in a directory that the user cannot access)
    const internalProcess = await getProcess(processId);
    accessible = accessible && ability.can('view', toCaslResource('Process', internalProcess));

    if (!accessible) {
      return 'Error: The user cannot start processes in this space. This might be due to a space wide setting or due to the user not having the permission to start processes.';
    }

    const process = await getProcessLatestVersion(processId, false);

    if (!process.executable) return 'Error: This process is not executable';

    // we don't need to check if the variables that are required at startup are set since the engine
    // will do that for us and return an error if they aren't

    const engines = await getCorrectTargetEngines(environmentId, false, undefined, ability);

    if (!engines.length) return 'Error: No fitting engine found';

    const [engine] = engines;

    const deployment = await deployProcess(
      processId,
      process.version.id,
      environmentId,
      'dynamic',
      [engine],
      ability,
    );

    if (isUserErrorResponse(deployment)) return deployment.error.message;

    const instanceId = await startInstanceOnMachine(
      processId,
      process.version.id,
      engine,
      startParameters &&
        Object.fromEntries(Object.entries(startParameters).map(([key, value]) => [key, { value }])),
    );

    if (isUserErrorResponse(instanceId)) {
      return instanceId.error.message;
    }

    return `Started the process with instance id ${instanceId}. Please check the PROCEED website to inspect the execution state.`;
  } catch (err) {
    if (err instanceof Error) return err.message;
    else return 'Error: Something went wrong';
  }
}
