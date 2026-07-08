import { type InferSchema } from 'xmcp';
import { isAccessible, toAuthorizationSchema, verifyCode } from '@/lib/mcp-utils';
import { isUserErrorResponse } from '@/lib/user-error';
import { z } from 'zod';
import { getTasklistEntryHTML } from '@/lib/tasks/server-actions';
import { getUserTaskById } from '@/lib/data/user-tasks';
import { refetchDeployments } from '@/lib/executions/deployment-server-actions';

// Define the schema for tool parameters
export const schema = toAuthorizationSchema({
  id: z.string().describe('The unique id of a specific open user task.'),
});

// Define tool metadata
export const metadata = {
  name: 'get-specific-open-user-task',
  description:
    'Retrieve the description for a specific open user task which is part of a running process instance. The return value contains a self-contained HTML representation of the requested task, including CSS, JavaScript, and HTML code. The `<body>` section contains the semantic information describing what the user must do to complete the task.',
  annotations: {
    title: 'Get one specific open user task',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

// Tool implementation
export default async function getSpecificOpenUserTask({
  userCode,
  id,
}: InferSchema<typeof schema>) {
  try {
    const verification = await verifyCode(userCode);

    if (isUserErrorResponse(verification)) return `Error: ${verification.error.message}`;

    const { userId, environmentId, ability } = verification;

    let accessible = await isAccessible(
      userId,
      environmentId,
      ['PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE'],
      ['process-automation.tasklist'],
      [['view', 'Task']],
    );

    if (!accessible)
      return 'Error: The user cannot access tasks in this space. This might be due to a space wide setting or due to the user not having the permission to view tasks.';

    await refetchDeployments();
    const task = await getUserTaskById(id);
    if (isUserErrorResponse(task)) return `Error: ${task.error.message}`;
    if (!task) return 'Error: Task not found';

    const html = await getTasklistEntryHTML(environmentId, id, ability);

    if (isUserErrorResponse(html)) return `Error: ${html.error.message}`;

    return html;
  } catch (err) {
    if (err instanceof Error) return err.message;
    else return 'Error: Something went wrong';
  }
}
