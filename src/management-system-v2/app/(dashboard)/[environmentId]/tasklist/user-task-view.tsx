'use client';

import React from 'react';

import { useQuery } from '@tanstack/react-query';
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
import { ExtendedTaskListEntry } from '@/lib/user-task-schema';

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
  userId: string;
  task?: ExtendedTaskListEntry;
};

const TaskListUserTaskForm: React.FC<TaskListUserTaskFormProps> = ({ task, userId }) => {
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
            fn: async () => {
              if (!task?.actualOwner.some((owner) => owner.id === userId)) {
                const updatedOwners = await addOwnerToTaskListEntry(spaceId, task.id, userId);
                if ('error' in updatedOwners) return updatedOwners;
              }
              return await completeTasklistEntry(spaceId, task.id, variables);
            },
          });
        }}
        onMilestoneUpdate={(newValues) =>
          wrapServerCall({
            fn: async () => {
              if (!task?.actualOwner.some((owner) => owner.id === userId)) {
                const updatedOwners = await addOwnerToTaskListEntry(spaceId, task.id, userId);
                if ('error' in updatedOwners) return updatedOwners;
              }
              return await setTasklistMilestoneValues(spaceId, task.id, newValues);
            },
            onSuccess: () => {},
          })
        }
        onVariablesUpdate={(newValues) => {
          wrapServerCall({
            fn: async () => {
              if (!task?.actualOwner.some((owner) => owner.id === userId)) {
                const updatedOwners = await addOwnerToTaskListEntry(spaceId, task.id, userId);
                if ('error' in updatedOwners) return updatedOwners;
              }
              return await setTasklistEntryVariableValues(spaceId, task.id, newValues);
            },
            onSuccess: () => {},
          });
        }}
      />
    )
  );
};

export default TaskListUserTaskForm;
