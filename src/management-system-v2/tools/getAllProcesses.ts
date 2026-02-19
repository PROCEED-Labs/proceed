import { type InferSchema } from 'xmcp';
import prisma from '@/lib/data/db';
import { toAuthorizationSchema, verifyToken } from '@/lib/mcp-utils';

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
export default async function getProcesses({ token }: InferSchema<typeof schema>) {
  try {
    const { environmentId, ability } = await verifyToken(token);

    let result = await prisma.process.findMany({
      where: {
        environmentId,
      },
      select: { id: true, name: true, description: true, lastEditedOn: true },
      take: 100,
    });

    result = ability ? ability.filter('view', 'Process', result) : result;

    if (!result) return `Error: No processes found.`;

    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  } catch (err) {
    if (err instanceof Error) return err.message;
    else return 'Error: Something went wrong';
  }
}
