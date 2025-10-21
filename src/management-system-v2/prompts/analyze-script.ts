import { z } from 'zod';
import { type InferSchema, type PromptMetadata } from 'xmcp';

// Define the schema for prompt parameters
export const schema = {
  code: z.string().describe('The code to review'),
};

// Define prompt metadata
export const metadata: PromptMetadata = {
  name: 'analyze-script',
  title: 'Review Script',
  description: 'Review script for best practices and potential issues',
  role: 'user',
};

export default function reviewScript({ code }: InferSchema<typeof schema>) {
  return `Please review this script for:
    - Code quality and best practices
    - Potential bugs or security issues
    - Performance optimizations
    - Readability and maintainability

    Code to review:
    \`\`\`
    ${code}
    \`\`\`
  `;
}
