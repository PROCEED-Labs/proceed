import { z } from 'zod';
import { type InferSchema } from 'xmcp';
import { getProcessBpmn } from '@/lib/data/db/process';
import { toAuthorizationSchema, verifyCode } from '@/lib/mcp-utils';
import { isUserErrorResponse } from '@/lib/user-error';

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
    openWorldHint: false,
  },
};

// Tool implementation
export default async function getProcessInfo({
  processId,
  accessCode,
}: InferSchema<typeof schema>) {
  const verification = await verifyCode(accessCode);

  if (isUserErrorResponse(verification)) return `Error: ${verification.error.message}`;

  try {
    const bpmn = await getProcessBpmn(processId);
    return bpmn;
  } catch (err) {
    return `Error: Process with ID ${processId} not found.`;
  }
}
