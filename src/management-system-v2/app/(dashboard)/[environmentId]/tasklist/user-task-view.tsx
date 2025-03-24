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
import { Skeleton } from 'antd';
import { UserTask } from '@/lib/user-task-schema';

type UserTaskViewProps = {
  task?: UserTask;
};

const UserTaskForm: React.FC<{ task: UserTask }> = ({ task }) => {
  const router = useRouter();
  const { spaceId } = useEnvironment();

  const [html, setHtml] = useState<string | undefined>();

  useEffect(() => {
    if (task) {
      wrapServerCall({
        fn: () => getTasklistEntryHTML(spaceId, task.id, task.fileName),
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
            post: async (path: string, body: { [key: string]: any }) => {
              if (path === '/tasklist/api/userTask') {
                await wrapServerCall({
                  fn: () => completeTasklistEntry(spaceId, task.id, body),
                  onSuccess: () => router.refresh(),
                });
              }
            },
            put: async (path: string, body: { [key: string]: any }) => {
              if (path === '/tasklist/api/milestone') {
                await wrapServerCall({
                  fn: () => setTasklistMilestoneValues(spaceId, task.id, body),
                  onSuccess: () => {},
                });
              }
              if (path === '/tasklist/api/variable') {
                await wrapServerCall({
                  fn: () => setTasklistEntryVariableValues(spaceId, task.id, body),
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
  const isCompleted = !!task?.endTime;
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
