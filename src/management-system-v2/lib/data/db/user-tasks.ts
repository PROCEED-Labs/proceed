import db from '@/lib/data/db';
import { z } from 'zod';
import { UserTask, UserTaskInput, UserTaskInputSchema } from '@/lib/user-task-schema';

export async function getUserTasks() {
  const userTasks = await db.userTask.findMany();

  return userTasks as unknown as UserTask[];
}

export async function getUserTaskById(userTaskId: string) {
  const userTask = await db.userTask.findUnique({
    where: {
      id: userTaskId,
    },
  });

  if (!userTask) return undefined;

  // TODO: maybe handle view capability for specific user tasks

  return userTask as unknown as UserTask;
}

const UserTaskArraySchema = UserTaskInputSchema.array();
export async function addUserTasks(userTaskInput: UserTaskInput[]) {
  const newUserTasks = UserTaskArraySchema.parse(userTaskInput);

  // TODO: maybe check if the user can work on/add user tasks

  return await db.userTask.createMany({
    data: newUserTasks.map((task) => ({
      ...task,
      startTime: new Date(task.startTime),
      endTime: typeof task.endTime !== 'number' ? undefined : new Date(task.endTime),
    })),
  });
}

const PartialUserTaskInputSchema = UserTaskInputSchema.partial();
type PartialDatabaseUserTaskInput = Omit<
  z.infer<typeof PartialUserTaskInputSchema>,
  'startTime' | 'endTime'
> & {
  startTime?: Date;
  endTime?: Date;
};
export async function updateUserTask(userTaskId: string, userTaskInput: Partial<UserTaskInput>) {
  const newUserTaskData = PartialUserTaskInputSchema.parse(userTaskInput);

  const updateData: PartialDatabaseUserTaskInput = {
    ...newUserTaskData,
    startTime: undefined,
    endTime: undefined,
  };

  if (newUserTaskData.startTime) {
    updateData.startTime = new Date(newUserTaskData.startTime);
  }

  if ('endTime' in newUserTaskData) {
    updateData.endTime =
      typeof newUserTaskData.endTime !== 'number' ? undefined : new Date(newUserTaskData.endTime);
  }

  // TODO: maybe check if a user is allowed to edit a user task

  return await db.userTask.update({
    data: updateData,
    where: {
      id: userTaskId,
    },
  });
}

export async function deleteUserTask(userTaskId: string) {
  // TODO: check if a user is allowed to delete a user task
  return await db.userTask.delete({
    where: {
      id: userTaskId,
    },
  });
}
