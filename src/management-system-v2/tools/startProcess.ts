import { z } from 'zod';
import { type InferSchema } from 'xmcp';
import { toAuthorizationSchema, verifyCode } from '@/lib/mcp-utils';
import { isUserErrorResponse } from '@/lib/user-error';
import { getCorrectTargetEngines } from '@/lib/engines/server-actions';
import { deployProcess } from '@/lib/engines/deployment';
import { startInstanceOnMachine } from '@/lib/engines/instances';
import { getProcessLatestVersion } from '@/lib/data/db/process';

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

    const { environmentId, ability } = verification;

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
