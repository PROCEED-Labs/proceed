import { type InferSchema } from 'xmcp';
import prisma from '@/lib/data/db';
import { toAuthorizationSchema, verifyCode } from '@/lib/mcp-utils';
import { isUserErrorResponse } from '@/lib/user-error';

// Define the schema for tool parameters
// export const schema = toAuthorizationSchema({});
export const schema = {};

// Define tool metadata
export const metadata = {
  name: 'get-processes',
  description: 'Get all processes of the user with a short summary',
  annotations: {
    title: 'Get all processes',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};

// Tool implementation
export default async function getProcesses({}: InferSchema<typeof schema>) {
  try {
    // const verification = await verifyCode(accessCode);
    //
    // if (isUserErrorResponse(verification)) return `Error: ${verification.error.message}`;
    //
    // const { environmentId, ability } = verification;
    //
    // let result = await prisma.process.findMany({
    //   where: {
    //     environmentId,
    //   },
    //   select: { id: true, name: true, description: true, lastEditedOn: true },
    //   take: 100,
    // });
    //
    // result = ability ? ability.filter('view', 'Process', result) : result;
    //
    // if (!result) return `Error: No processes found.`;
    //
    // return {
    //   content: [{ type: 'text', text: JSON.stringify(result) }],
    // };

    const processes = prisma.process.findMany({
      select: { id: true, name: true, description: true, lastEditedOn: true },
      take: 100,
    });

    if (!processes) return 'Error: No processes found.';

    return {
      content: [{ type: 'text', text: JSON.stringify(processes) }],
    };
  } catch (err) {
    if (err instanceof Error) return err.message;
    else return 'Error: Something went wrong';
  }
}
