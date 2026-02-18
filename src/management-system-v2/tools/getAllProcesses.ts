import { z } from 'zod';
import { ToolExtraArguments, type InferSchema } from 'xmcp';
import prisma from '@/lib/data/db';
import Ability from '@/lib/ability/abilityHelper';

// Define the schema for tool parameters
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
  },
};

// Tool implementation
export default async function getProcesses(
  {}: InferSchema<typeof schema>,
  opts: ToolExtraArguments,
) {
  const { authInfo } = opts;
  if (!authInfo || !authInfo.extra) return 'Error: Missing authentication';

  if (!authInfo.scopes.includes('read:processes')) return 'Error: Missing authorization';

  const { spaceId, ability } = authInfo.extra as {
    spaceId: string;
    userId: string;
    ability: Ability;
  };

  let result = await prisma.process.findMany({
    where: {
      environmentId: spaceId,
    },
    select: { id: true, name: true, description: true, lastEditedOn: true },
    take: 100,
  });

  result = ability ? ability.filter('view', 'Process', result) : result;

  if (!result) return `Error: No processes found.`;

  return {
    content: [{ type: 'text', text: JSON.stringify(result) }],
  };
}
