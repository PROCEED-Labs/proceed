import { z } from 'zod';
import { type InferSchema } from 'xmcp';
import prisma from '@/lib/data/db';

// Define the schema for tool parameters
export const schema = {};

// Define tool metadata
export const metadata = {
  name: 'get-processes',
  description: 'Get all processes with a short summary',
  annotations: {
    title: 'Get all processes',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

// Tool implementation
export default async function getProcesses({}: InferSchema<typeof schema>) {
  const result = await prisma.process.findMany({
    select: { id: true, name: true, description: true, lastEditedOn: true },
    take: 100,
  });

  return result ?? `Error: No processes found.`;
}
