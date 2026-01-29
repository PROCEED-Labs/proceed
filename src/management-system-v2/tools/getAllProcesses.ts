import { z } from 'zod';
import { type InferSchema } from 'xmcp';

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
  return `[{id: "74393", name: "Vacation Application", versions: 5, lastModified: "2025-01-15T10:23:45Z"}, {id: "83920", name: "Expense Reimbursement", versions: 3, lastModified: "2025-02-20T14:12:30Z"}]`;
}
