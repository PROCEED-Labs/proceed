'use client';

import React, { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import cn from 'classnames';

import { wrapServerCall } from '@/lib/wrap-server-call';

import { useEnvironment } from '@/components/auth-can';

import styles from './user-task-view.module.scss';

import { App, Skeleton, Spin } from 'antd';
import { ExtendedTaskListEntry } from '@/lib/user-task-schema';
import {
  addOwnerToTaskListEntry,
  completeTasklistEntry,
  getTasklistEntryHTML,
  setTasklistEntryVariableValues,
  setTasklistMilestoneValues,
  submitFile,
} from '@/lib/tasks/server-actions';

type UserTaskFormProps = {
  html?: string;
  isCompleted?: boolean;
  isPaused?: boolean;
  onMilestoneUpdate?: (milestones: { [key: string]: any }) => Promise<void>;
  onVariablesUpdate?: (variables: { [key: string]: any }) => Promise<void>;
  onFileSubmit?: (data: File) => Promise<{ path: string }>;
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div
      className={cn(styles.TaskView, {
        [styles.Completed]: isCompleted,
        [styles.Paused]: isPaused,
        [styles.Submitting]: isSubmitting,
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
              if (isSubmitting || isCompleted || isPaused) {
                Array.from(iframe.contentWindow.document.body.getElementsByTagName('form')).forEach(
                  (form) => {
                    form.style.pointerEvents = 'none';
                  },
                );
              }

              (iframe.contentWindow as any).PROCEED_DATA = {
                post: async (path: string, body: { [key: string]: any }) => {
                  if (path === '/tasklist/api/userTask') {
                    setIsSubmitting(true);
                    try {
                      await onSubmit?.(body);
                      // in case of the start form the modal takes a moment to close
                      // this delay ensures that the overlay is not removed before the modal has
                      // closed
                      await new Promise((res) => setTimeout(res, 1000));
                    } finally {
                      setIsSubmitting(false);
                    }
                  }
                },
                put: async (path: string, body: { [key: string]: any }) => {
                  if (path === '/tasklist/api/milestone') await onMilestoneUpdate?.(body);
                  else if (path === '/tasklist/api/variable') await onVariablesUpdate?.(body);
                },
                submit: async (path: string, body: File) => {
                  if (path === '/tasklist/api/variable-file') {
                    setIsSubmitting(true);
                    let res;
                    try {
                      res = await onFileSubmit?.(body);
                    } finally {
                      setIsSubmitting(false);
                    }
                    return res;
                  }
                },
              };
            }}
          />
          {(isSubmitting || isCompleted || isPaused) && (
            <div className={styles.overlay}>
              {isSubmitting && (
                <>
                  <h1>Submitting</h1>
                  <Spin size="large" />
                </>
              )}
              {!isSubmitting && isCompleted && <h1>This task is completed!</h1>}
              {!isSubmitting && isPaused && <h1>This task is paused!</h1>}
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

  const { message } = App.useApp();

  const { data: html } = useQuery({
    queryFn: async () => {
      if (!task) return null;
      const html = await wrapServerCall({
        fn: async () => {
          const html = await getTasklistEntryHTML(space.spaceId, task.id);

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
                const updatedOwners = await addOwnerToTaskListEntry(space.spaceId, task.id, userId);
                if ('error' in updatedOwners) return updatedOwners;
              }
              return await completeTasklistEntry(space.spaceId, task.id, variables);
            },
          });
        }}
        onMilestoneUpdate={async (newValues) => {
          await wrapServerCall({
            fn: async () => {
              if (!task?.actualOwner.some((owner) => owner.id === userId)) {
                const updatedOwners = await addOwnerToTaskListEntry(space.spaceId, task.id, userId);
                if ('error' in updatedOwners) return updatedOwners;
              }
              return await setTasklistMilestoneValues(space.spaceId, task.id, newValues);
            },
            onSuccess: () => {},
          });
        }}
        onVariablesUpdate={async (newValues) => {
          wrapServerCall({
            fn: async () => {
              if (!task?.actualOwner.some((owner) => owner.id === userId)) {
                const updatedOwners = await addOwnerToTaskListEntry(space.spaceId, task.id, userId);
                if ('error' in updatedOwners) return updatedOwners;
              }
              return await setTasklistEntryVariableValues(space.spaceId, task.id, newValues);
            },
            onSuccess: () => {},
          });
        }}
        onFileSubmit={async (file) => {
          const path = await wrapServerCall({
            fn: async () => {
              const formData = new FormData();
              formData.append('file', file);
              return submitFile(space.spaceId, task.id, formData);
            },
            onSuccess: false,
            onError: () =>
              message.error(
                `Failed to upload a file (${file.name}). Check that it is not too large.`,
              ),
          });

          if (!path) throw new Error(`Failed to upload a file (${file.name})`);

          return { path };
        }}
      />
    )
  );
};

export default TaskListUserTaskForm;
