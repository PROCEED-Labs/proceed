import { type InferSchema } from 'xmcp';
import { isAccessible, toAuthorizationSchema, verifyCode } from '@/lib/mcp-utils';
import { isUserErrorResponse } from '@/lib/user-error';

// Define the schema for tool parameters
export const schema = toAuthorizationSchema({});

// Define tool metadata
export const metadata = {
  name: 'get-accessible-tools',
  description:
    'Get all of the available tools that the current user can access in the current space. Some of the tools that are exposed through MCP might be blocked due to the configuration of the space or the permissions of the user in the space.',
  annotations: {
    title: 'Get Available Tools',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

// Tool implementation
export default async function getAvailableTools({ userCode }: InferSchema<typeof schema>) {
  try {
    const verification = await verifyCode(userCode);

    if (isUserErrorResponse(verification)) return `Error: ${verification.error.message}`;

    const { userId, environmentId } = verification;

    const canAccessProcesses = await isAccessible(
      userId,
      environmentId,
      ['PROCEED_PUBLIC_PROCESS_DOCUMENTATION_ACTIVE'],
      ['process-documentation'],
      [['view', 'Process']],
    );

    let canAccessTasks = await isAccessible(
      userId,
      environmentId,
      ['PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE'],
      ['process-automation.tasklist'],
      [['view', 'Task']],
    );

    let canAccessInstances = await isAccessible(
      userId,
      environmentId,
      ['PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE'],
      ['process-automation.executions'],
      [['view', 'Execution']],
    );

    let canCreateInstances = await isAccessible(
      userId,
      environmentId,
      ['PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE'],
      ['process-automation.executions'],
      [['create', 'Execution']],
    );

    const tools = {
      'get-organization-data': true,
      'get-user-data': true,
      'get-processes': canAccessProcesses,
      'get-process-info': canAccessProcesses,
      'start-process': canCreateInstances,
      'get-executions': canAccessInstances,
      'get-execution-info': canAccessInstances,
    };

    const result = Object.entries(tools)
      .filter(([_, accessible]) => accessible)
      .map(([name]) => name);

    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  } catch (err) {
    if (err instanceof Error) return err.message;
    else return 'Error: Something went wrong';
  }
}
