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
  setDeleteProcessIds: Dispatch<SetStateAction<string[]>> | Dispatch<SetStateAction<Key[]>>;
  processKeys: React.Key[];
  setSelection: Dispatch<SetStateAction<string[]>> | Dispatch<SetStateAction<Key[]>>;
};

const ProcessDeleteSingleModal: FC<ProcessDeleteModalType> = ({
  setDeleteProcessIds,
  processKeys,
  setSelection,
}) => {
  const refreshData = useInvalidateAsset('/process');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const addPreferences = useUserPreferences.use.addPreferences();

  const { mutateAsync: deleteProcess } = useDeleteAsset('/process/{definitionId}', {
    onSettled: refreshData,
    onSuccess: () => {
      setDeleteProcessIds([]);
      setSelection([]);
    },
  });

  const deleteSelectedProcesses = () => {
    startTransition(async () => {
      await deleteProcesses(processKeys as string[]);
      setDeleteProcessIds([]);
      setSelection([]);
      router.refresh();
    });
  };

  return (
    <>
      <Modal
        title="Delete this process?"
        centered
        open={processKeys.length == 1}
        onCancel={() => setDeleteProcessIds([])}
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
          <Button loading={loading} key="back" onClick={() => setDeleteProcessIds([])}>
            Cancel
          </Button>,
          <Button
            key="submit"
            danger
            type="primary"
            loading={loading}
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
