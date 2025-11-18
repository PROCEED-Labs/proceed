'use client';

import React from 'react';

import { useQuery } from '@tanstack/react-query';
import cn from 'classnames';

import { wrapServerCall } from '@/lib/wrap-server-call';

import { useEnvironment } from '@/components/auth-can';

import styles from './user-task-view.module.scss';

import { Skeleton } from 'antd';
import { ExtendedTaskListEntry } from '@/lib/user-task-schema';
import useUserTasks from '@/lib/use-user-tasks';

type UserTaskFormProps = {
  html?: string;
  isCompleted?: boolean;
  isPaused?: boolean;
  onMilestoneUpdate?: (milestones: { [key: string]: any }) => Promise<void>;
  onVariablesUpdate?: (variables: { [key: string]: any }) => Promise<void>;
  onFileSubmit?: (data: any, fileName: string, fileType: string) => Promise<{ path: string }>;
  onSubmit?: (variables: { [key: string]: any }) => Promise<void>;
};

export const UserTaskForm: React.FC<UserTaskFormProps> = ({
  html,
  isCompleted,
  isPaused,
  onMilestoneUpdate,
  onVariablesUpdate,
  onFileSubmit,
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
                post: async (
                  path: string,
                  body: { [key: string]: any },
                  fileInfo?: { type: string; name: string },
                ) => {
                  if (path === '/tasklist/api/userTask') await onSubmit?.(body);
                  if (path === '/tasklist/api/variable-file')
                    return await onFileSubmit?.(body, fileInfo!.name, fileInfo!.type);
                },
                put: async (path: string, body: { [key: string]: any }) => {
                  if (path === '/tasklist/api/milestone') await onMilestoneUpdate?.(body);
                  else if (path === '/tasklist/api/variable') await onVariablesUpdate?.(body);
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
  const space = useEnvironment();

  const {
    completeEntry,
    setMilestoneValues,
    setVariableValues,
    addOwner,
    getTaskListEntryHtml,
    submitFile,
  } = useUserTasks(space, 1000);

  const { data: html } = useQuery({
    queryFn: async () => {
      if (!task) return null;
      const html = await wrapServerCall({
        fn: async () => {
          const html = await getTaskListEntryHtml(task.id, task.fileName);

          return html || null;
        },
        onSuccess: false,
      });

      if (typeof html === 'string') return html;
    },
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [
      'user-task-html',
      space.spaceId,
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
        onSubmit={async (variables) => {
          await wrapServerCall({
            fn: async () => {
              if (!task?.actualOwner.some((owner) => owner.id === userId)) {
                const updatedOwners = await addOwner(task.id, userId);
                if ('error' in updatedOwners) return updatedOwners;
              }
              return await completeEntry(task.id, variables);
            },
          });
        }}
        onMilestoneUpdate={async (newValues) => {
          await wrapServerCall({
            fn: async () => {
              if (!task?.actualOwner.some((owner) => owner.id === userId)) {
                const updatedOwners = await addOwner(task.id, userId);
                if ('error' in updatedOwners) return updatedOwners;
              }
              return await setMilestoneValues(task.id, newValues);
            },
            onSuccess: () => {},
          });
        }}
        onVariablesUpdate={async (newValues) => {
          wrapServerCall({
            fn: async () => {
              if (!task?.actualOwner.some((owner) => owner.id === userId)) {
                const updatedOwners = await addOwner(task.id, userId);
                if ('error' in updatedOwners) return updatedOwners;
              }
              return await setVariableValues(task.id, newValues);
            },
            onSuccess: () => {},
          });
        }}
        onFileSubmit={async (file, fileName, fileType) => {
          const path = await submitFile(task.id, fileName, fileType, file);
          return { path };
        }}
      />
    )
  );
};

export default TaskListUserTaskForm;
