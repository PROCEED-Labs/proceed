import { z } from 'zod';
import { type InferSchema } from 'xmcp';
import prisma from '@/lib/data/db';
import { toAuthorizationSchema, verifyCode } from '@/lib/mcp-utils';
import { isUserErrorResponse } from '@/lib/user-error';
import { createVersion } from '@/lib/data/processes';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { getCorrectTargetEngines } from '@/lib/engines/server-actions';
import { deployProcess } from '@/lib/engines/deployment';
import { startInstanceOnMachine } from '@/lib/engines/instances';

// Define the schema for tool parameters
export const schema = toAuthorizationSchema({
  processId: z.string().describe('The ID of the process'),
  startParameters: z
    .record(z.string(), z.any())
    .optional()
    .describe(
      'The start parameters expected from the user at startup. The parameters can be found in the bpmn of the process.',
    ),
});

// Define tool metadata
export const metadata = {
  name: 'start-process',
  description: 'Starts executing a process.',
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
    console.log(startParameters);
    const verification = await verifyCode(userCode);
    if (isUserErrorResponse(verification)) return `Error: ${verification.error.message}`;

    const { environmentId, ability } = verification;

    const info = await prisma.process.findUnique({
      where: {
        id: processId,
        environmentId,
      },
      include: {
        versions: true,
      },
    });

    if (!info) return 'Error: Not found';

    if (!ability.can('view', 'Process', toCaslResource('Process', info)))
      return 'Error: Not allowed';

    if (!info?.executable) return 'Error: This process is not executable';

    // const { versions } = info;
    // if (!versions.length) return 'Error: There is no version to deploy!';
    //
    // versions.sort((a, b) => a.createdOn.getTime() - b.createdOn.getTime());

    const version = await createVersion(
      'Automatic MCP deployment version',
      'This version was automatically created to allow a MCP server to start an instance of the latest version.',
      processId,
      environmentId,
      true,
    );

    if (isUserErrorResponse(version)) return `Error: ${version.error.message}`;

    if (!version) return 'Error: Failed to create a version of the process';

    const engines = await getCorrectTargetEngines(environmentId, false, undefined, ability);

    if (!engines.length) return 'Error: No fitting engine found';

    const [engine] = engines;

    const deployment = await deployProcess(
      processId,
      version,
      environmentId,
      'dynamic',
      [engine],
      ability,
    );

    if (isUserErrorResponse(deployment)) return deployment.error.message;

    const instanceId = await startInstanceOnMachine(
      processId,
      version,
      engine,
      startParameters &&
        Object.fromEntries(Object.entries(startParameters).map(([key, value]) => [key, { value }])),
    );

    if (isUserErrorResponse(instanceId)) {
      console.log(instanceId);
      return instanceId.error.message;
    }

    return `Started the process with instance id ${instanceId}. Please check the PROCEED website to inspect the execution state.`;
  } catch (err) {
    if (err instanceof Error) return err.message;
    else return 'Error: Something went wrong';
  }
}
