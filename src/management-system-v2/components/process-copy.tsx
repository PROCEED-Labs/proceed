import { Button, Checkbox, Collapse, Input, Modal, Spin, Switch, Tooltip } from 'antd';
import React, { Dispatch, FC, Key, SetStateAction, useCallback, useEffect, useState } from 'react';
import styles from './process-copy.module.scss';
import TextArea from 'antd/es/input/TextArea';
import { useUserPreferences } from '@/lib/user-preferences';
import { addUserPreference } from '@/lib/utils';
import { useGetAsset, usePostAsset } from '@/lib/fetch-data';
import type { CollapseProps } from 'antd';
import {
  generateDefinitionsId,
  setDefinitionsId,
  setDefinitionsName,
  setDefinitionsVersionInformation,
  setTargetNamespace,
  addDocumentation,
  getDefinitionsId,
} from '@proceed/bpmn-helper';
import { fetchProcessVersionBpmn } from '@/lib/process-queries';
import { LoadingOutlined } from '@ant-design/icons';

type ProcessCopyModalType = {
  setCopyProcessIds: Dispatch<SetStateAction<string[]>> | Dispatch<SetStateAction<Key[]>>;
  processKeys: React.Key[] | String[];
  setSelection: Dispatch<SetStateAction<string[]>> | Dispatch<SetStateAction<Key[]>>;
};
type CopyProcessType = {
  bpmn: string;
  newName?: string;
  newDescription?: string;
  oldId: string | Key;
};

const sliceTitleLength = (title: String) => {
  return title.length > 50 ? `${title.slice(0, 51)} ...` : title;
};

const ProcessCopyModal: FC<ProcessCopyModalType> = ({
  setCopyProcessIds,
  processKeys,
  setSelection,
}) => {
  const { mutateAsync: addProcess } = usePostAsset('/process', {
    onError: async (error, variables) => {
      // TODO: add id to failed
      const id = await getDefinitionsId(variables.body.bpmn);
      setFailed((prev) => [...prev, id as string]);
      console.log(error);
      console.log('variables', variables);
    },
    onSuccess: (data) => {
      if (data) {
        setSelection((prev) => [...prev, data.definitionId as string]);
        setSuccessful((prev) => [...prev, data.definitionId as string]);
      }
    },
  });

  const [successful, setSuccessful] = useState<string[]>([]);
  const [failed, setFailed] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);

  const { preferences, addPreferences } = useUserPreferences();

  const { 'process-copy-modal-accordion': isAccordion, 'ask-before-copying': copyModalPreference } =
    preferences;

  const { data, refetch: refreshData } = useGetAsset('/process', {
    params: {
      query: { noBpmn: true },
    },
  });

  const [bluePrintForProcesses, setBluePrintForProcesses] = useState(
    data
      ?.filter((process) => processKeys.includes(process.definitionId))
      .map((process) => {
        return {
          id: process.definitionId,
          copyId: undefined,
          name: process.definitionName,
          copyName: undefined,
          description: process.description,
        };
      }),
  );

  useEffect(() => {
    setBluePrintForProcesses(
      data
        ?.filter((process) => processKeys.includes(process.definitionId))
        .map((process) => {
          return {
            id: process.definitionId,
            name: process.definitionName,
            description: process.description,
            copyId: undefined,
            copyName: undefined,
          };
        }),
    );
  }, [data, processKeys]);

  useEffect(() => {
    /* Some Failed */
    if (processKeys.length && successful.length + failed.length === processKeys.length) {
      setLoading(false);
    }
    /* All Successful */
    if (processKeys.length && successful.length === processKeys.length) {
      setTimeout(() => {
        setCopyProcessIds([]);
        setFailed([]);
        setSuccessful([]);
        refreshData();
      }, 2_000);
    }
  }, [successful, failed, processKeys, setSelection, setCopyProcessIds, refreshData]);

  const copyProcess = useCallback(
    async ({ bpmn, newName, newDescription, oldId }: CopyProcessType) => {
      const newDefinitionsId = await generateDefinitionsId();
      let newBPMN = await setDefinitionsId(bpmn, newDefinitionsId);
      setBluePrintForProcesses((prev) => {
        return prev?.map((item) => {
          if (item.id === oldId) {
            return { ...item, copyId: newDefinitionsId, copyName: newName };
          }
          return item;
        });
      });

      newBPMN = await setDefinitionsName(newBPMN, newName || 'Copy of Process');
      newBPMN = await addDocumentation(newBPMN, newDescription || '');
      newBPMN = await setTargetNamespace(newBPMN, newDefinitionsId);

      newBPMN = await setDefinitionsVersionInformation(newBPMN, {
        version: undefined,
        versionName: undefined,
        versionDescription: undefined,
        versionBasedOn: undefined,
      });

      return newBPMN;
    },
    [],
  );

  const copyProcesses = useCallback(() => {
    // setLoading(true);
    processKeys.forEach(async (id) => {
      const process = data?.find((item) => item.definitionId === id);
      const processBpmn = await fetchProcessVersionBpmn(id as string);

      const processBluePrint = bluePrintForProcesses?.find((item) => item.id === id);

      const newBPMN = await copyProcess({
        bpmn: processBpmn as string,
        newName: processBluePrint?.name || `${process?.definitionName} (Copy)`,
        newDescription: processBluePrint?.description || process?.description,
        oldId: id as string,
      });

      addProcess({
        body: {
          bpmn: newBPMN as string,
          departments: [],
          variables: [],
        },
      }).then(() => {
        setSelection((prev) => prev.filter((key: string) => key !== id));
      });
    });
  }, [addProcess, bluePrintForProcesses, copyProcess, data, processKeys, setSelection]);

  const handleCopy = useCallback(() => {
    if (failed.length) {
      setSelection(failed);
      setCopyProcessIds(failed);
      setFailed([]);
      setSuccessful([]);
      refreshData();
    }

    setLoading(true);
    copyProcesses();
  }, [copyProcesses, failed, refreshData, setCopyProcessIds, setSelection]);

  const handleCancel = useCallback(() => {
    setCopyProcessIds([]);
    setFailed([]);
    setSuccessful([]);
    setBluePrintForProcesses([]);
  }, [setCopyProcessIds]);

  const items: CollapseProps['items'] = processKeys.map((id) => {
    /* Initial */
    return {
      key: id,
      label: (
        <span className={styles.ClippedProcessTitle}>
          {bluePrintForProcesses?.find((e) => e.id == id)?.name}
        </span>
      ),
      children: (
        <>
          <h5>Process-Name:</h5>
          <Input
            placeholder="Give your process a name"
            required
            value={bluePrintForProcesses?.find((e) => e.id == id)?.name}
            onChange={(e) => {
              setBluePrintForProcesses((prev) => {
                return prev?.map((item) => {
                  if (item.id === id) {
                    return { ...item, name: e.target.value };
                  }
                  return item;
                });
              });
            }}
          />
          <h5 style={{ marginTop: '8px' }}>Process-Description:</h5>

          <TextArea
            rows={4}
            placeholder="Add a description here"
            value={bluePrintForProcesses?.find((e) => e.id == id)?.description}
            onChange={(e) => {
              setBluePrintForProcesses((prev) => {
                return prev?.map((item) => {
                  if (item.id === id) {
                    return { ...item, description: e.target.value };
                  }
                  return item;
                });
              });
            }}
          />
        </>
      ),
    };
  });

  return (
    <>
      <Modal
        width={600}
        title={
          <div style={{ display: 'flex' }}>
            <span>{processKeys.length > 1 ? 'Copy Processes' : 'Copy Process'}</span>
            <div style={{ flex: 19 }}></div>
            <Tooltip
              placement="left"
              title={
                <>
                  <div>Auto-Close: Only one panel open</div>
                  <div>Keep-Open: Close panels manually</div>
                </>
              }
            >
              <Switch
                checkedChildren="Auto-Close"
                unCheckedChildren="Keep-Open"
                defaultChecked
                onChange={(checked) => {
                  addPreferences({ 'process-copy-modal-accordion': checked });
                }}
              />
            </Tooltip>
            <div style={{ flex: 1 }}></div>
          </div>
        }
        centered
        open={processKeys.length > 0}
        onCancel={handleCancel}
        footer={[
          <Tooltip
            key={'tooltip-copy-modal'}
            placement="top"
            title={<>Copy processes without editing</>}
          >
            <Checkbox
              key="checkbox"
              className={styles.Checkbox}
              onChange={(e) => {
                addPreferences({ 'ask-before-copying': !e.target.checked });
              }}
            >
              Don&apos;t show again
            </Checkbox>
          </Tooltip>,
          <span style={{ display: 'inline-block', width: '34%' }} key={'filler'}></span>,
          <Button loading={loading} key="back" onClick={handleCancel}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" loading={loading} onClick={handleCopy}>
            {failed.length ? 'Retry' : 'Copy'}
          </Button>,
        ]}
      >
        {!successful.length && !failed.length && !loading ? (
          <Collapse
            style={{ maxHeight: '60vh', overflowY: 'scroll' }}
            accordion={isAccordion}
            items={items}
          ></Collapse>
        ) : (
          <ul>
            {bluePrintForProcesses?.map(({ id, copyId, name }) => {
              let symbol = '';
              let indicator = null;

              if (successful.includes(copyId || ' ')) {
                symbol = '✔';
                console.log('successful', name);
              } else if (failed.includes(copyId || ' ')) {
                symbol = '✖';
                console.log('failed', name);
              } else if (loading) {
                indicator = <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />;
                console.log('loading', name);
              }

              return (
                //TODO:
                // Checkmarks get removed after success
                <li key={id as Key}>
                  {symbol}
                  {indicator}
                  <span className={styles.ClippedProcessTitle}> {name}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </>
  );
};

export default ProcessCopyModal;
