import { Button, Checkbox, Modal } from 'antd';
import React, { Dispatch, FC, Key, SetStateAction, useCallback, useState } from 'react';
import styles from './process-delete.module.scss';
import { useUserPreferences } from '@/lib/user-preferences';
import { useDeleteAsset } from '@/lib/fetch-data';

type ProcessDeleteModalType = {
  setDeleteProcessIds: Dispatch<SetStateAction<string[]>> | Dispatch<SetStateAction<Key[]>>;
  processKeys: React.Key[];
  setSelection: Dispatch<SetStateAction<string[]>> | Dispatch<SetStateAction<Key[]>>;
  pullNewProcessData: () => void;
};

const ProcessDeleteSingleModal: FC<ProcessDeleteModalType> = ({
  setDeleteProcessIds,
  processKeys,
  setSelection,
  pullNewProcessData,
}) => {
  const [loading, setLoading] = useState(false);

  const { addPreferences } = useUserPreferences();

  const { mutateAsync: deleteProcess } = useDeleteAsset('/process/{definitionId}', {
    onSettled: pullNewProcessData,
    onSuccess: () => {
      setDeleteProcessIds([]);
      setSelection([]);
    },
  });

  const deleteSelectedProcesses = useCallback(() => {
    processKeys.forEach((key: React.Key) => {
      deleteProcess({
        params: {
          path: {
            definitionId: key as string,
          },
        },
        parseAs: 'text',
      });
    });
  }, [deleteProcess, processKeys]);

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
