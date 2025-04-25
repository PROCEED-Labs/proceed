'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import cn from 'classnames';

import { wrapServerCall } from '@/lib/wrap-server-call';

import {
  completeTasklistEntry,
  getTasklistEntryHTML,
  setTasklistEntryVariableValues,
  setTasklistMilestoneValues,
} from '@/lib/engines/server-actions';
import { useEnvironment } from '@/components/auth-can';

import styles from './tasklist.module.scss';
import { TaskListEntry } from '@/lib/engines/tasklist';
import { useQuery } from '@tanstack/react-query';

import { Skeleton } from 'antd';

type UserTaskFormProps = {
  task?: TaskListEntry;
};

const UserTaskForm: React.FC<UserTaskFormProps> = ({ task }) => {
  const router = useRouter();
  const { spaceId } = useEnvironment();

  const { data: html } = useQuery({
    queryFn: async () => {
      if (!task) return null;
      return wrapServerCall({
        fn: async () => {
          const html = await getTasklistEntryHTML(
            spaceId,
            task.instanceID,
            task.taskId,
            task.attrs['proceed:fileName'],
            task.startTime,
          );

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
      task?.attrs['proceed:fileName'],
      task?.startTime,
    ],
  });

  if (task && !html) return <Skeleton active style={{ alignSelf: 'baseline' }} />;

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
            srcDoc={html}
            style={{ width: '100%', height: '100%', border: 0 }}
            onLoad={(ev) => {
              const iframe = ev.currentTarget;
              if (!iframe.contentWindow) return;

              (iframe.contentWindow as any).PROCEED_DATA = {
                post: async (
                  path: string,
                  body: { [key: string]: any },
                  query: { instanceID: string; userTaskID: string },
                ) => {
                  if (path === '/tasklist/api/userTask') {
                    wrapServerCall({
                      fn: () =>
                        completeTasklistEntry(spaceId, query.instanceID, query.userTaskID, body),
                      onSuccess: () => router.refresh(),
                    });
                  }
                },
                put: async (
                  path: string,
                  body: { [key: string]: any },
                  query: { instanceID: string; userTaskID: string },
                ) => {
                  if (path === '/tasklist/api/milestone') {
                    wrapServerCall({
                      fn: () =>
                        setTasklistMilestoneValues(
                          spaceId,
                          query.instanceID,
                          query.userTaskID,
                          body,
                        ),
                      onSuccess: () => {},
                    });
                  }
                  if (path === '/tasklist/api/variable') {
                    wrapServerCall({
                      fn: () =>
                        setTasklistEntryVariableValues(
                          spaceId,
                          query.instanceID,
                          query.userTaskID,
                          body,
                        ),
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
