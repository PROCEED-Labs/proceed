import { type InferSchema } from 'xmcp';
import { isAccessible, toAuthorizationSchema, verifyCode } from '@/lib/mcp-utils';
import { isUserErrorResponse } from '@/lib/user-error';
import { getAvailableTaskListEntries, getCorrectTargetEngines } from '@/lib/engines/server-actions';

// Define the schema for tool parameters
export const schema = toAuthorizationSchema({});

// Define tool metadata
export const metadata = {
  name: 'get-tasks',
  description: 'Get all tasks the user can still work on.',
  annotations: {
    title: 'Get all tasks',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

// Tool implementation
export default async function getTasks({ userCode }: InferSchema<typeof schema>) {
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

    const engines = await getCorrectTargetEngines(environmentId, false, undefined, ability);

    const tasks = await getAvailableTaskListEntries(environmentId, engines);

    if (isUserErrorResponse(tasks)) return `Error: ${tasks.error.message}`;

    const result = tasks
      .filter((task) => !task.endTime)
      .map((task) => ({
        alreadyWorkedOnBy: task.actualOwner.map((o) => ({ name: o.name, username: o.username })),
        id: task.id,
        instanceId: task.instanceID,
        name: task.name,
        state: task.state,
        progress: task.progress,
        priority: task.priority,
        startTime: task.startTime,
        machineId: task.machineId,
      }));

    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  } catch (err) {
    if (err instanceof Error) return err.message;
    else return 'Error: Something went wrong';
  }
}
