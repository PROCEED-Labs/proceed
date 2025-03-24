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
import { Button, Modal, Skeleton } from 'antd';
import { UserTask } from '@/lib/user-task-schema';

type UserTaskViewProps = {
  task?: UserTask;
};

const UserTaskForm: React.FC<{ task: UserTask; onSubmitFailure: () => void }> = ({
  task,
  onSubmitFailure,
}) => {
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
                  fn: async () => await completeTasklistEntry(spaceId, task.id, body),
                  onSuccess: () => router.refresh(),
                  onError: () => {
                    onSubmitFailure();
                    if (task.state !== 'UNREACHABLE') router.refresh();
                  },
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

  const [failedToSubmit, setFailedToSubmit] = useState(false);

  return (
    <div
      className={cn(styles.taskView, {
        [styles.completed]: isCompleted,
        [styles.paused]: isPaused,
      })}
    >
      {task && (
        <Modal
          open={failedToSubmit && task.state === 'UNREACHABLE'}
          title="The engine is offline!"
          onCancel={() => setFailedToSubmit(false)}
          footer={() => [
            <Button type="primary" key="ok" onClick={() => setFailedToSubmit(false)}>
              Ok
            </Button>,
          ]}
        >
          The engine this user task is running on is currently not reachable. Changes you make to
          the task are saved and can be submitted once the engine is reachable again!
        </Modal>
      )}
      {task ? <UserTaskForm task={task} onSubmitFailure={() => setFailedToSubmit(true)} /> : <></>}
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
