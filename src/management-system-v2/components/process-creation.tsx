import React, { Key, use, useEffect, useMemo, useState } from 'react';

import { produce } from 'immer';

import {
  Modal,
  Button,
  Tooltip,
  Switch,
  Checkbox,
  Collapse,
  Spin,
  CollapseProps,
  Input,
} from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { LoadingOutlined } from '@ant-design/icons';

import styles from './process-creation.module.scss';

import { useUserPreferences } from '@/lib/user-preferences';

import {
  toBpmnObject,
  toBpmnXml,
  setDefinitionsId,
  setDefinitionsName,
  setDefinitionsVersionInformation,
  setTargetNamespace,
  addDocumentation,
  getDefinitionsId,
} from '@proceed/bpmn-helper';
import { asyncForEach } from '@/lib/helpers/javascriptHelpers';
import { useGetAsset, usePostAsset } from '@/lib/fetch-data';

export type ProcessData = {
  definitionId: string;
  definitionName: string;
  description: string;
  bpmn: string;
};

type ProcessDataOverwrite = {
  definitionName?: string;
  description?: string;
  successful?: boolean;
  failed?: boolean;
};

type ProcessCreationProps = {
  creationType: string;
  title: string;
  processesData: ProcessData[];
  onCancel: () => void;
  onCreated?: (definitionId: string) => void;
};

// TODO: check the validity of the process data and maybe show hints if data is missing

const ProcessCreationModal: React.FC<ProcessCreationProps> = ({
  creationType,
  title,
  processesData,
  onCancel,
  onCreated,
}) => {
  const [loading, setLoading] = useState(false);

  // the data that is overwritten by the user before the processes are created (e.g. the user wants a different definition name that provided in the processesData)
  const [dataChanges, setDataChanges] = useState<{ [definitionId: string]: ProcessDataOverwrite }>(
    {},
  );

  const { refetch: refreshData } = useGetAsset('/process', {
    params: {
      query: { noBpmn: true },
    },
  });

  const { mutateAsync: addProcess } = usePostAsset('/process', {
    onError: async (error, variables) => {
      const id = (await getDefinitionsId(variables.body.bpmn)) as string;
      setDataChanges(
        produce((draft) => {
          if (draft[id]) draft[id].failed = true;
          else draft[id] = { failed: true };
        }),
      );
    },
    onSuccess: (data) => {
      if (onCreated) onCreated(data.definitionId as string);

      setDataChanges(
        produce((draft) => {
          if (draft[data.definitionId as string]) {
            draft[data.definitionId as string].successful = true;
          } else {
            draft[data.definitionId as string] = { successful: true };
          }
        }),
      );
    },
  });

  const numSuccesses = useMemo(() => {
    return Object.values(dataChanges).reduce((acc, { successful }) => {
      if (successful) return acc + 1;
      else return acc;
    }, 0);
  }, [dataChanges]);

  const numFails = useMemo(() => {
    return Object.values(dataChanges).reduce((acc, { failed }) => {
      if (failed) return acc + 1;
      else return acc;
    }, 0);
  }, [dataChanges]);

  const handleCancel = () => {
    setDataChanges({});
    onCancel();
  };

  useEffect(() => {
    /* All done */
    if (processesData.length && numSuccesses + numFails === processesData.length) {
      setLoading(false);

      /* All Successful */
      if (numSuccesses === processesData.length) {
        setTimeout(() => {
          handleCancel();
          refreshData();
        }, 2_000);
      }
    }
  }, [dataChanges, processesData, refreshData]);

  const { preferences, addPreferences } = useUserPreferences();
  const { [`${creationType.toLowerCase()}-modal-accordion`]: isAccordion } = preferences;

  const getFinalBpmn = async ({ definitionId, definitionName, description, bpmn }: ProcessData) => {
    // write the necessary meta info into the bpmn to create the final bpmn that is sent to the backend
    const bpmnObj = await toBpmnObject(bpmn);
    await setDefinitionsId(bpmnObj, definitionId);
    await setDefinitionsName(bpmnObj, dataChanges[definitionId]?.definitionName || definitionName);
    await addDocumentation(bpmnObj, dataChanges[definitionId]?.description || description);
    await setTargetNamespace(bpmnObj, definitionId);

    await setDefinitionsVersionInformation(bpmnObj, {
      version: undefined,
      versionName: undefined,
      versionDescription: undefined,
      versionBasedOn: undefined,
    });

    return await toBpmnXml(bpmnObj);
  };

  const handleSubmit = () => {
    setLoading(true);

    asyncForEach(processesData, async (processData) => {
      // only (re-)submit processes that were not yet submitted succesfully
      if (dataChanges[processData.definitionId]?.successful) return;
      // remove potential failed flags from previous runs
      setDataChanges(
        produce((draft) => {
          if (draft[processData.definitionId]) draft[processData.definitionId].failed = false;
        }),
      );

      const bpmn = await getFinalBpmn(processData);

      addProcess({
        body: {
          bpmn,
          departments: [],
          variables: [],
        },
      });
    });
  };

  // create the ui that allows users to change some of the meta data (e.g. definitionName,description) of the process
  const items: CollapseProps['items'] = processesData.map(
    ({ definitionId, definitionName, description }) => {
      /* Initial */
      return {
        key: definitionId,
        label: <span className={styles.ClippedProcessTitle}>{definitionName}</span>,
        children: (
          <>
            <h5>
              <b>Process-Name:</b>
            </h5>
            <Input
              placeholder="Give your process a name"
              required
              value={dataChanges[definitionId]?.definitionName ?? definitionName}
              onChange={(e) => {
                setDataChanges({
                  ...dataChanges,
                  [definitionId]: {
                    ...(dataChanges[definitionId] || {}),
                    definitionName: e.target.value,
                  },
                });
              }}
            />
            <h5 style={{ marginTop: '8px' }}>
              <b>Process-Description:</b>
            </h5>

            <TextArea
              rows={4}
              placeholder="Add a description here"
              value={dataChanges[definitionId]?.description ?? description}
              onChange={(e) => {
                setDataChanges({
                  ...dataChanges,
                  [definitionId]: {
                    ...(dataChanges[definitionId] || {}),
                    description: e.target.value,
                  },
                });
              }}
            />
          </>
        ),
      };
    },
  );

  return (
    <>
      <Modal
        width={600}
        title={
          <div style={{ display: 'flex' }}>
            <span>{title}</span>
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
                checked={isAccordion}
                onChange={(checked) => {
                  addPreferences({ [`${creationType.toLowerCase()}-modal-accordion`]: checked });
                }}
              />
            </Tooltip>
            <div style={{ flex: 1 }}></div>
          </div>
        }
        centered
        open={processesData.length > 0}
        onCancel={handleCancel}
        footer={[
          <Tooltip
            key={`tooltip-${creationType}-modal`}
            placement="top"
            title={<>{`${creationType}`} processes without editing</>}
          >
            <Checkbox
              key="checkbox"
              className={styles.Checkbox}
              onChange={(e) => {
                addPreferences({ [`${creationType.toLowerCase()}-ask-before`]: !e.target.checked });
              }}
            >
              Don&apos;t show again
            </Checkbox>
          </Tooltip>,
          <span style={{ display: 'inline-block', width: '34%' }} key={'filler'}></span>,
          <Button loading={loading} key="back" onClick={handleCancel}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
            {numFails ? 'Retry' : 'Ok'}
          </Button>,
        ]}
      >
        {!numSuccesses && !numFails && !loading ? (
          // before submit => show the different processes to create with the option to edit some meta data
          <Collapse
            style={{ maxHeight: '60vh', overflowY: 'scroll' }}
            accordion={isAccordion}
            items={items}
          ></Collapse>
        ) : (
          // after submit => show a list of processes with symbols showing the state of their creation
          <ul>
            {processesData.map(({ definitionId, definitionName }) => {
              let symbol = '';
              let indicator = null;

              if (dataChanges[definitionId]?.successful) {
                symbol = '✔';
              } else if (dataChanges[definitionId]?.failed) {
                symbol = '✖';
              } else if (loading) {
                indicator = <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />;
              }

              return (
                <li key={definitionId as Key}>
                  {symbol}
                  {indicator}
                  <span className={styles.ClippedProcessTitle}>
                    {' '}
                    {dataChanges[definitionId]?.definitionName || definitionName}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </>
  );
};

export default ProcessCreationModal;
