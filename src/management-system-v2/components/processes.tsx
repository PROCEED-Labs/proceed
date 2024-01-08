'use client';

import styles from './processes.module.scss';
import React, { useCallback, useEffect, useState } from 'react';
import { Space, Button, Tooltip, Grid, App } from 'antd';
import { ApiData } from '@/lib/fetch-data';
import {
  ExportOutlined,
  DeleteOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import IconView from './process-icon-list';
import ProcessList from './process-list';
import MetaData from './process-info-card';
import ProcessExportModal from './process-export';
import Bar from './bar';
import ProcessCreationButton from './process-creation-button';
import { useUserPreferences } from '@/lib/user-preferences';
import {
  setDefinitionsId,
  setDefinitionsName,
  generateDefinitionsId,
  setTargetNamespace,
  setDefinitionsVersionInformation,
} from '@proceed/bpmn-helper';
import { useAbilityStore } from '@/lib/abilityStore';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import { useRouter } from 'next/navigation';
import { copyProcesses, deleteProcesses, updateProcesses } from '@/lib/data/processes';
import ProcessModal from './process-modal';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { AuthCan } from './auth-can';
import ConfirmationButton from './confirmation-button';
import ProcessImportButton from './process-import';

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
  const router = useRouter();
  const { message } = App.useApp();

  const addPreferences = useUserPreferences.use.addPreferences();
  const iconView = useUserPreferences.use['icon-view-in-process-list']();

  const ability = useAbilityStore((state) => state.ability);

  const deleteSelectedProcesses = useCallback(async () => {
    try {
      const res = await deleteProcesses(selectedRowKeys as string[]);
      // UserError
      if (res && 'error' in res) {
        return message.open({
          type: 'error',
          content: res.error.message,
        });
      }
    } catch (e) {
      // Unkown server error or was not sent from server (e.g. network error)
      return message.open({
        type: 'error',
        content: 'Someting went wrong while submitting the data',
      });
    }
    setSelectedRowKeys([]);
    router.refresh();
  }, [message, router, selectedRowKeys]);

  const breakpoint = Grid.useBreakpoint();

  const [openExportModal, setOpenExportModal] = useState(false);
  const [openCopyModal, setOpenCopyModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const actionBar = (
    <>
      <Tooltip placement="top" title={'Export'}>
        <ExportOutlined
          className={styles.Icon}
          onClick={() => {
            setOpenExportModal(true);
          }}
        />
      </Tooltip>

      <AuthCan action="delete" resource={toCaslResource('Process', process)}>
        <Tooltip placement="top" title={'Delete'}>
          <ConfirmationButton
            title="Delete Processes"
            externalOpen={openDeleteModal}
            onExternalClose={() => setOpenDeleteModal(false)}
            description="Are you sure you want to delete the selected processes?"
            onConfirm={() => deleteSelectedProcesses()}
            buttonProps={{
              icon: <DeleteOutlined />,
              type: 'text',
            }}
          />
        </Tooltip>
      </AuthCan>
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
      if (openCopyModal || openExportModal || openEditModal) {
        return;
      }

      /* CTRL + A */
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        setSelectedRowKeys(filteredData?.map((item) => item.definitionId) ?? []);
        /* DEL */
      } else if (e.key === 'Delete' && selectedRowKeys.length) {
        if (ability.can('delete', 'Process')) {
          setOpenDeleteModal(true);
        }
        /* ESC */
      } else if (e.key === 'Escape') {
        deselectAll();
        /* CTRL + C */
      } else if (e.ctrlKey && e.key === 'c') {
        if (ability.can('create', 'Process')) {
          setCopySelection(selectedRowKeys);
        }
        /* CTRL + V */
      } else if (e.ctrlKey && e.key === 'v' && copySelection.length) {
        if (ability.can('create', 'Process')) {
          setOpenCopyModal(true);
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
    ability,
    openCopyModal,
    openExportModal,
    openEditModal,
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
                <Button type="default">
                  <ProcessImportButton></ProcessImportButton>
                </Button>
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
                setOpenExportModal(true);
                setSelectedRowKeys([id]);
              }}
              onDeleteProcess={async (id) => {
                await deleteProcesses([id]);
                setSelectedRowKeys([]);
                router.refresh();
              }}
              onCopyProcess={(id) => {
                setOpenCopyModal(true);
                setSelectedRowKeys([id]);
              }}
              onEditProcess={(id) => {
                setOpenEditModal(true);
                setSelectedRowKeys([id]);
              }}
            />
          )}
        </div>
        {/* Meta Data Panel */}
        {breakpoint.sm ? <MetaData data={filteredData} selection={selectedRowKeys} /> : null}
      </div>
      <ProcessExportModal
        processes={selectedRowKeys.map((definitionId) => ({
          definitionId: definitionId as string,
        }))}
        open={openExportModal}
        onClose={() => setOpenExportModal(false)}
      />
      <ProcessModal
        open={openCopyModal}
        title={`Copy Process${selectedRowKeys.length > 1 ? 'es' : ''}`}
        onCancel={() => setOpenCopyModal(false)}
        initialData={filteredData
          .filter((process) => selectedRowKeys.includes(process.definitionId))
          .map((process) => ({
            definitionName: `${process.definitionName.value} (Copy)`,
            description: process.description.value,
            originalId: process.definitionId,
          }))}
        onSubmit={async (values) => {
          const res = await copyProcesses(values);
          // Errors are handled in the modal.
          if ('error' in res) {
            return res;
          }
          setOpenCopyModal(false);
          router.refresh();
        }}
      />
      <ProcessModal
        open={openEditModal}
        title={`Edit Process${selectedRowKeys.length > 1 ? 'es' : ''}`}
        onCancel={() => setOpenEditModal(false)}
        initialData={filteredData
          .filter((process) => selectedRowKeys.includes(process.definitionId))
          .map((process) => ({
            definitionId: process.definitionId,
            definitionName: process.definitionName.value,
            description: process.description.value,
          }))}
        onSubmit={async (values) => {
          const res = await updateProcesses(values);
          // Errors are handled in the modal.
          if (res && 'error' in res) {
            return res;
          }
          setOpenEditModal(false);
          router.refresh();
        }}
      />
    </>
  );
};

export default Processes;
