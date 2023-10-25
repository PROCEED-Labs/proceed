import React, { useState, FC, useCallback, Dispatch, SetStateAction, useEffect, Key } from 'react';
import { Button, Checkbox, Modal, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useDeleteAsset, useGetAsset } from '@/lib/fetch-data';
import { useUserPreferences } from '@/lib/user-preferences';
import styles from './process-delete.module.scss';

type ProcessDeleteModalType = {
  setDeleteProcessIds: Dispatch<SetStateAction<string[]>> | Dispatch<SetStateAction<Key[]>>;
  processKeys: React.Key[];
  setSelection: Dispatch<SetStateAction<string[]>> | Dispatch<SetStateAction<Key[]>>;
};

const ProcessDeleteModal: FC<ProcessDeleteModalType> = ({
  setDeleteProcessIds,
  processKeys,
  setSelection,
}) => {
  const { data, refetch: pullNewProcessData } = useGetAsset('/process', {
    params: {
      query: { noBpmn: true },
    },
  });

  const [successful, setSuccessful] = useState<string[]>([]);
  const [failed, setFailed] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { addPreferences } = useUserPreferences();

  const { mutateAsync: deleteProcess } = useDeleteAsset('/process/{definitionId}', {
    //onSettled: pullNewProcessData,
    onError: (error, variables) => {
      setFailed((prev) => [...prev, variables.params.path.definitionId]);
    },
    onSuccess: (data, variables) => {
      setSuccessful((prev) => [...prev, variables.params.path.definitionId]);
      setSelection((prev) => prev.filter((key) => key !== variables.params.path.definitionId));
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
      });
    });
  }, [deleteProcess, processKeys]);

  const handleDelete = useCallback(() => {
    if (failed.length) {
      setSelection(failed);
      setDeleteProcessIds(failed);
      setFailed([]);
      setSuccessful([]);
      pullNewProcessData();
    }

    setLoading(true);
    deleteSelectedProcesses();
  }, [deleteSelectedProcesses, failed, pullNewProcessData, setDeleteProcessIds, setSelection]);

  const handleCancel = useCallback(() => {
    setDeleteProcessIds([]);
    setFailed([]);
    setSuccessful([]);
  }, [setDeleteProcessIds])

  useEffect(() => {
    /* Some Failed */
    if (processKeys.length && successful.length + failed.length === processKeys.length) {
      setLoading(false);
    }
    /* All Successful */
    if (processKeys.length && successful.length === processKeys.length) {
      setTimeout(() => {
        setSelection([]);
        setDeleteProcessIds([]);
        setFailed([]);
        setSuccessful([]);
        pullNewProcessData();
      }, 2_000);
    }
  }, [successful, failed, processKeys, setSelection, setDeleteProcessIds, pullNewProcessData]);

  return (
    <>
      <Modal
        title="Delete selected processes?"
        centered
        open={processKeys.length > 1}
        onCancel={handleCancel}
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
          <Button loading={loading} key="back" onClick={handleCancel}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" danger loading={loading} onClick={handleDelete}>
            {failed.length ? 'Retry' : 'Delete'}
          </Button>,
        ]}
      >
        <div>
          <ul>
            {data
              ?.filter((process) => processKeys.includes(process.definitionId))
              .sort((a, b) => a.definitionName.localeCompare(b.definitionName))
              .map((process) => {
                // if (loading) {
                /* Success */
                if (successful.includes(process.definitionId)) {
                  return (
                    <li key={process.definitionId}>
                      ✔
                      <span
                        className={styles.ClippedProcessTitle}
                        style={{
                          textDecoration: 'line-through',
                        }}
                      >
                        {process.definitionName}
                      </span>
                    </li>
                  );
                  /*  Fail */
                } else if (failed.includes(process.definitionId)) {
                  return (
                    <li key={process.definitionId}>
                      ✖<span className={styles.ClippedProcessTitle}>{process.definitionName}</span>
                    </li>
                  );
                  /*  Loading */
                } else if (loading) {
                  return (
                    <li key={process.definitionId}>
                      <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
                      <span className={styles.ClippedProcessTitle}>{process.definitionName}</span>
                    </li>
                  );
                  /* Inital */
                } else {
                  return (
                    <li key={process.definitionId}>
                      <span className={styles.ClippedProcessTitle}>{process.definitionName}</span>
                    </li>
                  );
                }
              })}
          </ul>
        </div>
      </Modal>
    </>
  );
};

export default ProcessDeleteModal;
