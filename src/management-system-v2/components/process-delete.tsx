import React, { FC, useCallback, Dispatch, SetStateAction, Key, useTransition } from 'react';
import { Button, Checkbox, Modal } from 'antd';
import { useUserPreferences } from '@/lib/user-preferences';
import styles from './process-delete.module.scss';
import { deleteProcesses } from '@/lib/data/processes';
import { useRouter } from 'next/navigation';

type ProcessDeleteModalType = {
  onClose: () => void;
  open: boolean;
  processKeys: React.Key[];
  setSelection: Dispatch<SetStateAction<Key[]>>;
  processes: { definitionId: string; definitionName: string }[];
};

const ProcessDeleteModal: FC<ProcessDeleteModalType> = ({
  onClose,
  open,
  processKeys,
  setSelection,
  processes,
}) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const addPreferences = useUserPreferences.use.addPreferences();

  const deleteSelectedProcesses = useCallback(() => {
    startTransition(async () => {
      await deleteProcesses(processKeys as string[]);
      setSelection([]);
      onClose();
      router.refresh();
    });
  }, [onClose, processKeys, router, setSelection]);

  return (
    <>
      <Modal
        title="Delete selected processes?"
        centered
        open={open}
        onCancel={onClose}
        footer={[
          <Checkbox
            key="checkbox"
            className={styles.Checkbox}
            onChange={(e) => {
              addPreferences({ 'ask-before-deleting-multiple': !e.target.checked });
            }}
          >
            Don&apos;t show again
          </Checkbox>,
          <Button loading={isPending} key="back" onClick={onClose}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            danger
            loading={isPending}
            onClick={deleteSelectedProcesses}
          >
            Delete
          </Button>,
        ]}
      >
        <div>
          <ul>
            {processes
              ?.filter((process) => processKeys.includes(process.definitionId))
              .sort((a, b) => a.definitionName.localeCompare(b.definitionName))
              .map((process) => {
                return (
                  <li key={process.definitionId}>
                    <span className={styles.ClippedProcessTitle}>{process.definitionName}</span>
                  </li>
                );
              })}
          </ul>
        </div>
      </Modal>
    </>
  );
};

export default ProcessDeleteModal;
