'use client';

import React, { useEffect, useState } from 'react';
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
import { Skeleton } from 'antd';

type UserTaskViewProps = {
  task?: TaskListEntry;
};

const UserTaskForm: React.FC<{ task: TaskListEntry }> = ({ task }) => {
  const router = useRouter();
  const { spaceId } = useEnvironment();

  const [html, setHtml] = useState<string | undefined>();

  useEffect(() => {
    if (task) {
      wrapServerCall({
        fn: () =>
          getTasklistEntryHTML(
            spaceId,
            task.instanceID,
            task.id,
            task.attrs['proceed:fileName'],
            task.startTime,
          ),
        onSuccess: (html) => {
          setHtml(html);
        },
      });

      return () => setHtml(undefined);
    }
  }, [spaceId, task]);

  if (!html) return <Skeleton active style={{ alignSelf: 'baseline' }} />;

  return (
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
                    setTasklistMilestoneValues(spaceId, query.instanceID, query.userTaskID, body),
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
        }
      }}
      srcDoc={html}
      style={{ width: '100%', height: '100%', border: 0 }}
    ></iframe>
  );
};

const UserTaskView: React.FC<UserTaskViewProps> = ({ task }) => {
  const isCompleted = task?.state === 'COMPLETED';
  const isPaused = task?.state === 'PAUSED';

  return (
    <div
      className={cn(styles.taskView, {
        [styles.completed]: isCompleted,
        [styles.paused]: isPaused,
      })}
    >
      {task ? <UserTaskForm task={task} /> : <></>}
      {(isCompleted || isPaused) && (
        <div className={styles.overlay}>
          {isCompleted && <h1>This task is completed!</h1>}
          {isPaused && <h1>This task is paused!</h1>}
        </div>
      )}
    </div>
  );
};

export default UserTaskView;
