'use client';

import styles from './processes.module.scss';
import React, { useCallback, useEffect, useState, useTransition } from 'react';
import { Space, Button, Tooltip } from 'antd';
import { ApiData, del, useDeleteAsset, useGetAsset, usePostAsset } from '@/lib/fetch-data';
import {
  ExportOutlined,
  DeleteOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import Fuse from 'fuse.js';
import IconView from './process-icon-list';
import ProcessList from './process-list';
import MetaData from './process-info-card';
import ProcessExportModal from './process-export';
import Bar from './bar';
import ProcessCreationButton from './process-creation-button';
import { useUserPreferences } from '@/lib/user-preferences';
import { fetchProcessVersionBpmn } from '@/lib/process-queries';
import {
  setDefinitionsId,
  setDefinitionsName,
  generateDefinitionsId,
  setTargetNamespace,
  setDefinitionsVersionInformation,
} from '@proceed/bpmn-helper';
import ProcessDeleteModal from './process-delete';
import ProcessDeleteSingleModal from './process-delete-single';
import ProcessCopyModal from './process-copy';
import { useAbilityStore } from '@/lib/abilityStore';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import { useRouter } from 'next/navigation';
import { deleteProcesses } from '@/lib/data/processes';

type Processes = ApiData<'/process', 'get'>;
export type ProcessListProcess = ReplaceKeysWithHighlighted<
  Processes[number],
  'definitionName' | 'description'
>;

type CopyProcessType = {
  bpmn: string;
  newName?: string;
};

const copyProcess = async ({ bpmn, newName }: CopyProcessType) => {
  const newDefinitionsId = await generateDefinitionsId();
  let newBPMN = await setDefinitionsId(bpmn, newDefinitionsId);
  newBPMN = await setDefinitionsName(newBPMN, newName || 'Copy of Process');
  newBPMN = await setTargetNamespace(newBPMN, newDefinitionsId);

  newBPMN = await setDefinitionsVersionInformation(newBPMN, {
    version: undefined,
    versionName: undefined,
    versionDescription: undefined,
    versionBasedOn: undefined,
  });
  // newBPMN = await manipulateElementsByTagName(newBPMN, 'bpmn:Definitions', (definitions: any) => {
  //   delete definitions.version;
  //   delete definitions.versionName;
  //   delete definitions.versionDescription;
  //   delete definitions.versionBasedOn;
  // });

  return newBPMN;
};

type ProcessesProps = {
  processes: Processes;
};

const Processes = ({ processes }: ProcessesProps) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const addPreferences = useUserPreferences.use.addPreferences();
  const iconView = useUserPreferences.use['icon-view-in-process-list']();
  const openModalWhenDeleteMultiple = useUserPreferences.use['ask-before-deleting-multiple']();
  const openModalWhenDeleteSingle = useUserPreferences.use['ask-before-deleting-single']();
  const openModalWhenCopy = useUserPreferences.use['ask-before-copying']();

  const ability = useAbilityStore((state) => state.ability);

  const { mutateAsync: addProcess } = usePostAsset('/process', {});

  const deleteSelectedProcesses = useCallback(() => {
    startTransition(async () => {
      await deleteProcesses(selectedRowKeys as string[]);
      setSelectedRowKeys([]);
      router.refresh();
    });
  }, [router, selectedRowKeys]);

  const [openExportModal, setOpenExportModal] = useState(false);
  const [openCopyModal, setOpenCopyModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const actionBar = (
    <>
      {/* <Tooltip placement="top" title={'Preview'}>
        <EyeOutlined />
      </Tooltip> */}
      {/* <Tooltip placement="top" title={'Copy'}>
        <CopyOutlined />
      </Tooltip> */}
      <Tooltip placement="top" title={'Export'}>
        <ExportOutlined
          className={styles.Icon}
          onClick={() => {
            setOpenExportModal(true);
          }}
        />
      </Tooltip>
      {ability.can('delete', 'Process') && (
        <Tooltip placement="top" title={'Delete'}>
          <DeleteOutlined
            className={styles.Icon}
            onClick={() => {
              if (
                (openModalWhenDeleteMultiple && selectedRowKeys.length > 1) ||
                (openModalWhenDeleteSingle && selectedRowKeys.length == 1)
              ) {
                setOpenDeleteModal(true);
              } else {
                deleteSelectedProcesses();
              }
            }}
          />
        </Tooltip>
      )}
    </>
  );

  const {
    filteredData,
    searchQuery: searchTerm,
    setSearchQuery: setSearchTerm,
  } = useFuzySearch({
    data: processes ?? [],
    keys: ['definitionName', 'description'],
    highlightedKeys: ['definitionName', 'description'],
    transformData: (matches) => matches.map((match) => match.item),
  });

  const deselectAll = () => {
    setSelectedRowKeys([]);
  };
  const [copySelection, setCopySelection] = useState<React.Key[]>(selectedRowKeys);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      /* CTRL + A */
      if (e.ctrlKey && e.key === 'a' && !openCopyModal && !openDeleteModal && !openExportModal) {
        e.preventDefault();
        setSelectedRowKeys(filteredData?.map((item) => item.definitionId) ?? []);
        /* DEL */
      } else if (e.key === 'Delete') {
        if (ability.can('delete', 'Process')) {
          if (
            (openModalWhenDeleteMultiple && selectedRowKeys.length > 1) ||
            (openModalWhenDeleteSingle && selectedRowKeys.length == 1)
          ) {
            setOpenDeleteModal(true);
          } else {
            deleteSelectedProcesses();
          }
        }
        /* ESC */
      } else if (e.key === 'Escape') {
        deselectAll();
        /* CTRL + C */
      } else if (e.ctrlKey && e.key === 'c' && !openCopyModal) {
        if (ability.can('create', 'Process')) {
          setCopySelection(selectedRowKeys);
        }
        /* CTRL + V */
      } else if (e.ctrlKey && e.key === 'v' && copySelection.length) {
        if (ability.can('create', 'Process')) {
          if (openModalWhenCopy) {
            setOpenCopyModal(true);
          } else {
            copySelection.forEach(async (key) => {
              const process = processes?.find((item) => item.definitionId === key);
              const processBpmn = await fetchProcessVersionBpmn(key as string);

              const newBPMN = await copyProcess({
                bpmn: processBpmn as string,
                newName: `${process?.definitionName} (Copy)`,
              });

              addProcess({
                body: {
                  bpmn: newBPMN as string,
                  departments: [],
                  variables: [],
                },
              });
            });
          }
        }
      }
    };
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Remove event listener on cleanup
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    copySelection,
    filteredData,
    selectedRowKeys,
    deleteSelectedProcesses,
    processes,
    addProcess,
    openModalWhenDeleteMultiple,
    openModalWhenDeleteSingle,
    openModalWhenCopy,
    ability,
    openCopyModal,
    openDeleteModal,
    openExportModal,
  ]);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', height: '100%' }}>
        {/* 73% for list / icon view, 27% for meta data panel (if active) */}
        <div
          style={{
            /* width: '75%', */
            flex: 1,
          }}
        >
          <Bar
            leftNode={
              selectedRowKeys.length ? (
                <Space size={20}>
                  <Button onClick={deselectAll} type="text">
                    <CloseOutlined />
                  </Button>
                  {selectedRowKeys.length} selected:
                  <span className={styles.Icons}>{actionBar}</span>
                </Space>
              ) : undefined
            }
            searchProps={{
              onChange: (e) => setSearchTerm(e.target.value),
              onPressEnter: (e) => setSearchTerm(e.currentTarget.value),
              placeholder: 'Search Processes ...',
            }}
            rightNode={
              <Space size={16} style={{ paddingLeft: 8 }}>
                <Space.Compact>
                  <Button
                    style={!iconView ? { color: '#3e93de', borderColor: '#3e93de' } : {}}
                    onClick={() => {
                      addPreferences({ 'icon-view-in-process-list': false });
                    }}
                  >
                    <UnorderedListOutlined />
                  </Button>
                  <Button
                    style={!iconView ? {} : { color: '#3e93de', borderColor: '#3e93de' }}
                    onClick={() => {
                      addPreferences({ 'icon-view-in-process-list': true });
                    }}
                  >
                    <AppstoreOutlined />
                  </Button>
                </Space.Compact>
                <ProcessCreationButton type="primary">New Process</ProcessCreationButton>
              </Space>
            }
          />

          {iconView ? (
            <IconView
              data={filteredData}
              selection={selectedRowKeys}
              setSelection={setSelectedRowKeys}
            />
          ) : (
            <ProcessList
              data={filteredData}
              selection={selectedRowKeys}
              setSelection={setSelectedRowKeys}
              // TODO: Replace with server component loading state
              //isLoading={isLoading}
              onExportProcess={(id) => {
                // TODO: If id is already selected, consider doing the batch
                // operation on all selected instead of overwriting the
                // selection with a single id.
                setOpenExportModal(true);
                setSelectedRowKeys([id]);
              }}
              onDeleteProcess={(id) => {
                setOpenDeleteModal(true);
                setSelectedRowKeys([id]);
              }}
            />
          )}
        </div>
        {/* Meta Data Panel */}
        <MetaData data={filteredData} selection={selectedRowKeys} />
      </div>
      <ProcessExportModal
        processes={selectedRowKeys.map((definitionId) => ({
          definitionId: definitionId as string,
        }))}
        open={openExportModal}
        onClose={() => setOpenExportModal(false)}
      />
      <ProcessDeleteModal
        onClose={() => setOpenDeleteModal(false)}
        processKeys={selectedRowKeys}
        setSelection={setSelectedRowKeys}
        processes={processes}
        open={openDeleteModal && selectedRowKeys.length > 1}
      />
      <ProcessDeleteSingleModal
        onClose={() => setOpenDeleteModal(false)}
        processKeys={selectedRowKeys}
        setSelection={setSelectedRowKeys}
        open={openDeleteModal && selectedRowKeys.length === 1}
      />
      <ProcessCopyModal
        onClose={() => setOpenCopyModal(false)}
        setSelection={setSelectedRowKeys}
        processKeys={selectedRowKeys}
        open={openCopyModal}
      ></ProcessCopyModal>
    </>
  );
};

export default Processes;
