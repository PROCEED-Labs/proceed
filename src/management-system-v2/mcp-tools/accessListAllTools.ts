import { type InferSchema } from 'xmcp';
import { isAccessible, toAuthorizationSchema, verifyCode } from '@/lib/mcp-utils';
import { isUserErrorResponse } from '@/lib/user-error';

// Define the schema for tool parameters
export const schema = toAuthorizationSchema({});

// Define tool metadata
export const metadata = {
  name: 'get-accessible-tools',
  description:
    "List all tools that are available and accessable to the current user in the current space. (Some of the tools listed by the standard MCP query may be blocked due to the space's configuration or the user's permissions. This query only lists the tools to which the user actually has access.)",
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
      // 'get-space-data': false, // TODO: currently bug in implementation
      // 'get-user-data': false, // TODO: currently bug in implementation
      'list-all-processes': canAccessProcesses,
      'get-process-info': canAccessProcesses,
      'start-new-process-execution': canCreateInstances,
      'list-all-process-executions': canAccessInstances,
      'get-process-execution-info': canAccessInstances,
      'list-all-open-user-tasks': canAccessTasks,
      'get-specific-open-user-task': canAccessTasks,
      'submit-open-user-task': canAccessTasks,
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
