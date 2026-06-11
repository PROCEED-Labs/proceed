import { type InferSchema } from 'xmcp';
import { isAccessible, toAuthorizationSchema, verifyCode } from '@/lib/mcp-utils';
import { isUserErrorResponse } from '@/lib/user-error';
import { z } from 'zod';
import prisma from '@/lib/data/db';
import { getAllAvailableEngines } from '@/lib/data/engines';
import { getTasklistEntryHTML } from '@/lib/tasks/server-actions';

// Define the schema for tool parameters
export const schema = toAuthorizationSchema({
  id: z.string().describe('The id of the task for which the user tries to get information.'),
});

// Define tool metadata
export const metadata = {
  name: 'get-task',
  description:
    'Get the html file that represents the requested task. This file contains information about what the user has to do to complete the task.',
  annotations: {
    title: 'Get task',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

// Tool implementation
export default async function getTask({ userCode, id }: InferSchema<typeof schema>) {
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

    const task = await prisma.userTask.findUnique({ where: { id } });

    if (!task) return 'Error: Task not found';

    const engines = await getAllAvailableEngines(environmentId, ability);
    if (isUserErrorResponse(engines)) return `Error: ${engines.error.message}`;

    const engine = engines.find((engine) => engine.id === task.machineId);

    if (!engine) return 'Error: Could not find the engine that triggered the task';

    const html = await getTasklistEntryHTML(environmentId, id, task.fileName, engine, ability);

    if (isUserErrorResponse(html)) return `Error: ${html.error.message}`;

    return html;
  } catch (err) {
    if (err instanceof Error) return err.message;
    else return 'Error: Something went wrong';
  }
}
