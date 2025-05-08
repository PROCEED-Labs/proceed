'use client';

import React from 'react';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import cn from 'classnames';

import { wrapServerCall } from '@/lib/wrap-server-call';

import {
  addOwnerToTaskListEntry,
  completeTasklistEntry,
  getTasklistEntryHTML,
  setTasklistEntryVariableValues,
  setTasklistMilestoneValues,
} from '@/lib/engines/server-actions';
import { useEnvironment } from '@/components/auth-can';

import styles from './user-task-view.module.scss';

import { Skeleton } from 'antd';
import { UserTask } from '@/lib/user-task-schema';

export type ExtendedTaskListEntry = Omit<UserTask, 'actualOwner'> & {
  actualOwner: { id: string; name: string; userName?: string }[];
};

type UserTaskFormProps = {
  userId: string;
  task?: ExtendedTaskListEntry;
};

const UserTaskForm: React.FC<UserTaskFormProps> = ({ task, userId }) => {
  const router = useRouter();
  const { spaceId } = useEnvironment();

  const { data: html } = useQuery({
    queryFn: async () => {
      if (!task) return null;
      return wrapServerCall({
        fn: async () => {
          const html = await getTasklistEntryHTML(spaceId, task.id, task.fileName);

          return html || null;
        },
        onSuccess: false,
      });
    },
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [
      'user-task-html',
      spaceId,
      task?.instanceID,
      task?.taskId,
      task?.fileName,
      task?.startTime,
    ],
  });

  if (task && !html) return <Skeleton active style={{ alignSelf: 'baseline' }} />;

  const isCompleted = task?.state === 'COMPLETED';
  const isPaused = task?.state === 'PAUSED';

  return (
    <div
      className={cn(styles.TaskView, {
        [styles.Completed]: isCompleted,
        [styles.Paused]: isPaused,
      })}
    >
      {task && html && (
        <>
          <iframe
            srcDoc={html}
            style={{ width: '100%', height: '100%', border: 0 }}
            onLoad={(ev) => {
              const iframe = ev.currentTarget;
              if (!iframe.contentWindow) return;

              // block the user from interacting with paused or completed user tasks while allowing scrolling of
              // the form itself
              if (isCompleted || isPaused) {
                Array.from(iframe.contentWindow.document.body.getElementsByTagName('form')).forEach(
                  (form) => {
                    form.style.pointerEvents = 'none';
                  },
                );
              }

              (iframe.contentWindow as any).PROCEED_DATA = {
                post: async (path: string, body: { [key: string]: any }) => {
                  if (path === '/tasklist/api/userTask') {
                    wrapServerCall({
                      fn: async () => {
                        if (!task?.actualOwner.some((owner) => owner.id === userId)) {
                          const updatedOwners = await addOwnerToTaskListEntry(
                            spaceId,
                            task.id,
                            userId,
                          );
                          if ('error' in updatedOwners) return updatedOwners;
                        }
                        await completeTasklistEntry(spaceId, task.id, body);
                      },
                      onSuccess: () => router.refresh(),
                    });
                  }
                },
                put: async (path: string, body: { [key: string]: any }) => {
                  if (path === '/tasklist/api/milestone') {
                    wrapServerCall({
                      fn: async () => {
                        if (!task?.actualOwner.some((owner) => owner.id === userId)) {
                          const updatedOwners = await addOwnerToTaskListEntry(
                            spaceId,
                            task.id,
                            userId,
                          );
                          if ('error' in updatedOwners) return updatedOwners;
                        }
                        await setTasklistMilestoneValues(spaceId, task.id, body);
                      },
                      onSuccess: () => {},
                    });
                  }
                  if (path === '/tasklist/api/variable') {
                    wrapServerCall({
                      fn: async () => {
                        if (!task?.actualOwner.some((owner) => owner.id === userId)) {
                          const updatedOwners = await addOwnerToTaskListEntry(
                            spaceId,
                            task.id,
                            userId,
                          );
                          if ('error' in updatedOwners) return updatedOwners;
                        }
                        await setTasklistEntryVariableValues(spaceId, task.id, body);
                      },
                      onSuccess: () => {},
                    });
                  }
                },
              };
            }}
          />
          {(isCompleted || isPaused) && (
            <div className={styles.overlay}>
              {isCompleted && <h1>This task is completed!</h1>}
              {isPaused && <h1>This task is paused!</h1>}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserTaskForm;
