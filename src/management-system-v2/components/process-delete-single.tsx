import { Button, Checkbox, Modal } from 'antd';
import React, {
  Dispatch,
  FC,
  Key,
  SetStateAction,
  startTransition,
  useCallback,
  useState,
  useTransition,
} from 'react';
import styles from './process-delete.module.scss';
import { useUserPreferences } from '@/lib/user-preferences';
import { useDeleteAsset, useInvalidateAsset } from '@/lib/fetch-data';
import { deleteProcesses } from '@/lib/data/processes';
import { useRouter } from 'next/navigation';

type ProcessDeleteModalType = {
  onClose: () => void;
  open: boolean;
  processKeys: React.Key[];
  setSelection: Dispatch<SetStateAction<string[]>> | Dispatch<SetStateAction<Key[]>>;
};

const ProcessDeleteSingleModal: FC<ProcessDeleteModalType> = ({
  onClose,
  open,
  processKeys,
  setSelection,
}) => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const addPreferences = useUserPreferences.use.addPreferences();

  const deleteSelectedProcesses = () => {
    startTransition(async () => {
      await deleteProcesses(processKeys as string[]);
      onClose();
      setSelection([]);
      router.refresh();
    });
  };

  return (
    <>
      <Modal
        title="Delete this process?"
        centered
        open={open}
        onCancel={onClose}
        footer={[
          <Checkbox
            key="checkbox"
            className={styles.Checkbox}
            onChange={(e) => {
              addPreferences({ 'ask-before-deleting-single': !e.target.checked });
            }}
          >
            Don&apos;t warn me again
          </Checkbox>,
          <Button loading={isPending} key="back" onClick={onClose}>
            Cancel
          </Button>,
          <Button
            key="submit"
            danger
            type="primary"
            loading={isPending}
            onClick={deleteSelectedProcesses}
          >
            Delete
          </Button>,
        ]}
      >
        {/* <div>Delete this process?</div> */}
      </Modal>
    </>
  );
};

export default ProcessDeleteSingleModal;
