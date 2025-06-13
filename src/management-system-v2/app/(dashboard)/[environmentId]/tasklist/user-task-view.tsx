'use client';

import React from 'react';

import { useQuery } from '@tanstack/react-query';
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

import styles from './user-task-view.module.scss';

import { Skeleton } from 'antd';
import { UserTask } from '@/lib/user-task-schema';

type UserTaskFormProps = {
  html?: string;
  isCompleted?: boolean;
  isPaused?: boolean;
  onMilestoneUpdate?: (milestones: { [key: string]: any }) => void;
  onVariablesUpdate?: (variables: { [key: string]: any }) => void;
  onSubmit?: (variables: { [key: string]: any }) => void;
};

export const UserTaskForm: React.FC<UserTaskFormProps> = ({
  html,
  isCompleted,
  isPaused,
  onMilestoneUpdate,
  onVariablesUpdate,
  onSubmit,
}) => {
  return (
    <div
      className={cn(styles.TaskView, {
        [styles.Completed]: isCompleted,
        [styles.Paused]: isPaused,
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
                  if (path === '/tasklist/api/userTask') onSubmit?.(body);
                },
                put: async (path: string, body: { [key: string]: any }) => {
                  if (path === '/tasklist/api/milestone') onMilestoneUpdate?.(body);
                  else if (path === '/tasklist/api/variable') onVariablesUpdate?.(body);
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

type TaskListUserTaskFormProps = {
  task?: UserTask;
};

const TaskListUserTaskForm: React.FC<TaskListUserTaskFormProps> = ({ task }) => {
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
    task && (
      <UserTaskForm
        html={html || undefined}
        isCompleted={isCompleted}
        isPaused={isPaused}
        onSubmit={(variables) => {
          wrapServerCall({
            fn: () => completeTasklistEntry(spaceId, task.id, variables),
            onSuccess: () => router.refresh(),
          });
        }}
        onMilestoneUpdate={(newValues) =>
          wrapServerCall({
            fn: () => setTasklistMilestoneValues(spaceId, task.id, newValues),
            onSuccess: () => {},
          })
        }
        onVariablesUpdate={(newValues) => {
          wrapServerCall({
            fn: () => setTasklistEntryVariableValues(spaceId, task.id, newValues),
            onSuccess: () => {},
          });
        }}
      />
    )
  );
};

export default TaskListUserTaskForm;
