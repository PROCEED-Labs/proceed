import { type InferSchema } from 'xmcp';
import prisma from '@/lib/data/db';
import { isAccessible, toAuthorizationSchema, verifyCode } from '@/lib/mcp-utils';
import { isUserErrorResponse } from '@/lib/user-error';
import { getProcessLatestVersion } from '@/lib/data/db/process';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';

// Define the schema for tool parameters
export const schema = toAuthorizationSchema({});

// Define tool metadata
export const metadata = {
  name: 'get-processes',
  description: 'Get all processes of the user with a short summary',
  annotations: {
    title: 'Get all processes',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

// Tool implementation
export default async function getProcesses({ userCode }: InferSchema<typeof schema>) {
  try {
    const verification = await verifyCode(userCode);

    if (isUserErrorResponse(verification)) return `Error: ${verification.error.message}`;

    const { userId, environmentId, ability } = verification;

    const accessible = await isAccessible(
      userId,
      environmentId,
      ['PROCEED_PUBLIC_PROCESS_DOCUMENTATION_ACTIVE'],
      ['process-documentation'],
      [['view', 'Process']],
    );

    if (!accessible)
      return 'Error: The user cannot access processes in this space. This might be due to a space wide setting or due to the user not having the permission to view processes.';

    let result = await prisma.process.findMany({
      where: {
        environmentId,
      },
      select: {
        id: true,
        versions: true,
        folderId: true,
      },
      take: 100,
    });

    result = ability ? ability.filter('view', 'Process', result) : result;
    result = result.filter((process) => !!process.versions.length);

    if (!result) return `Error: No processes found.`;

    const processesWithLatestVersion = await asyncMap(result, async (process) => {
      const p: Omit<Awaited<ReturnType<typeof getProcessLatestVersion>>, 'processIds'> & {
        processIds?: any[];
      } = await getProcessLatestVersion(process.id, false);
      delete p.processIds;
      return p;
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(processesWithLatestVersion) }],
    };
  } catch (err) {
    if (err instanceof Error) return err.message;
    else return 'Error: Something went wrong';
  }
}
