import { z } from 'zod';
import { type InferSchema } from 'xmcp';
import prisma from '@/lib/data/db';

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
export default async function getProcessInfo({ processId }: InferSchema<typeof schema>) {
  const result = await prisma.process.findUnique({
    where: { id: processId },
    select: { bpmn: true },
  });

  return result?.bpmn ?? `Error: Process with ID ${processId} not found.`;
}
