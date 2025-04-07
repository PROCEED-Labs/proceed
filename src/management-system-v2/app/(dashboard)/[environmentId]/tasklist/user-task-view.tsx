'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import cn from 'classnames';

import { wrapServerCall } from '@/lib/wrap-server-call';

import {
  addOwnerToTaskListEntry,
  completeTasklistEntry,
  getTasklistEntryHTML,
  setTasklistEntryVariableValues,
} from '@/lib/engines/server-actions';
import { useEnvironment } from '@/components/auth-can';

import styles from './tasklist.module.scss';
import { TaskListEntry } from '@/lib/engines/tasklist';

export type ExtendedTaskListEntry = Omit<TaskListEntry, 'actualOwner'> & {
  actualOwner: { id: string; name: string; userName?: string }[];
};

type UserTaskFormProps = {
  userId: string;
  task?: ExtendedTaskListEntry;
};

const UserTaskForm: React.FC<UserTaskFormProps> = ({ task, userId }) => {
  const router = useRouter();
  const { spaceId } = useEnvironment();

  const [html, setHtml] = useState<string | undefined>();

  useEffect(() => {
    if (task) {
      wrapServerCall({
        fn: () => getTasklistEntryHTML(spaceId, task.instanceID, task.taskId, task.startTime),
        onSuccess: (html) => {
          setHtml(html);
        },
      });

      return () => setHtml(undefined);
    }
  }, [spaceId, task]);

  const isCompleted = task?.state === 'COMPLETED';
  const isPaused = task?.state === 'PAUSED';

  return (
    <div
      className={cn(styles.taskView, {
        [styles.completed]: isCompleted,
        [styles.paused]: isPaused,
      })}
    >
      {html && (
        <>
          <iframe
            ref={(r) => {
              if (r?.contentWindow) {
                (r.contentWindow as any).PROCEED_DATA = {
                  post: async (
                    path: string,
                    body: { [key: string]: any },
                    query: { instanceID: string; userTaskID: string },
                  ) => {
                    if (path === '/tasklist/api/userTask') {
                      wrapServerCall({
                        fn: async () => {
                          if (!task?.actualOwner.some((owner) => owner.id === userId)) {
                            const updatedOwners = await addOwnerToTaskListEntry(
                              spaceId,
                              query.instanceID,
                              query.userTaskID,
                              userId,
                            );
                            if ('error' in updatedOwners) return updatedOwners;
                          }
                          return await completeTasklistEntry(
                            spaceId,
                            query.instanceID,
                            query.userTaskID,
                            body,
                          );
                        },
                        onSuccess: () => router.refresh(),
                      });
                    }
                  },
                  put: async (
                    path: string,
                    body: { [key: string]: any },
                    query: { instanceID: string; userTaskID: string },
                  ) => {
                    // if (path === '/tasklist/api/milestone') {
                    // TODO: implement milestone handling
                    // }
                    if (path === '/tasklist/api/variable') {
                      wrapServerCall({
                        fn: async () => {
                          if (!task?.actualOwner.some((owner) => owner.id === userId)) {
                            const updatedOwners = await addOwnerToTaskListEntry(
                              spaceId,
                              query.instanceID,
                              query.userTaskID,
                              userId,
                            );
                            if ('error' in updatedOwners) return updatedOwners;
                          }
                          return await setTasklistEntryVariableValues(
                            spaceId,
                            query.instanceID,
                            query.userTaskID,
                            body,
                          );
                        },
                        onSuccess: () => router.refresh(),
                      });
                    }
                  },
                };
              }
            }}
            srcDoc={html}
            style={{ width: '100%', height: '100%', border: 0 }}
          ></iframe>
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
