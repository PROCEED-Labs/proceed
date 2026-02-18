import { z } from 'zod';
import { ToolExtraArguments, type InferSchema } from 'xmcp';
import prisma from '@/lib/data/db';
import Ability from '@/lib/ability/abilityHelper';
import { getProcessBpmn } from '@/lib/data/db/process';

// Define the schema for tool parameters
export const schema = {
  processId: z.string().describe('The ID of the process'),
};

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
export default async function getProcessInfo(
  { processId }: InferSchema<typeof schema>,
  opts: ToolExtraArguments,
) {
  const { authInfo } = opts;
  if (!authInfo) return 'Error: Missing authentication';

  if (!authInfo.scopes.includes('read:processes')) return 'Error: Missing authorization';

  // TODO: maybe check if the user can access the specific process

  try {
    const bpmn = await getProcessBpmn(processId);
    return bpmn;
  } catch (err) {
    return `Error: Process with ID ${processId} not found.`;
  }
}
