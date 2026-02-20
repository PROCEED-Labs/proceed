import { z } from 'zod';
import { type InferSchema } from 'xmcp';
import { getProcessBpmn } from '@/lib/data/db/process';
import { toAuthorizationSchema, verifyToken } from '@/lib/mcp-utils';

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
export default async function getProcessInfo({ processId, token }: InferSchema<typeof schema>) {
  try {
    await verifyToken(token);
  } catch (err) {
    if (err instanceof Error) return err.message;
    else return 'Error: Something went wrong';
  }
  // TODO: maybe check if the user can access the specific process

  try {
    const bpmn = await getProcessBpmn(processId);
    return bpmn;
  } catch (err) {
    return `Error: Process with ID ${processId} not found.`;
  }
}
