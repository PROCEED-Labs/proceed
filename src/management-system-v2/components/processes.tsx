'use client';

import styles from './processes.module.scss';
import React, { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { Space, Button, Tooltip, Grid, App, Drawer, FloatButton } from 'antd';
import { ApiData, usePostAsset } from '@/lib/fetch-data';
import cn from 'classnames';
import {
  ExportOutlined,
  DeleteOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  ImportOutlined,
} from '@ant-design/icons';
import IconView from './process-icon-list';
import ProcessList from './process-list';
import MetaData, { MetaPanelRefType } from './process-info-card';
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
import MetaDataContent from './process-info-card-content';
import ResizableElement, { ResizableElementRefType } from './ResizableElement';

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
  const showInfo = useUserPreferences((store) => store.preferences['process-meta-data'].open);
  const getWidth = () => useUserPreferences.getState().preferences['process-meta-data'].width;

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
  const [showMobileMetaData, setShowMobileMetaData] = useState(false);

  const closeMobileMetaData = () => {
    setShowMobileMetaData(false);
  };

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

  const CollapsePannelRef = useRef<MetaPanelRefType>(null);

  const collapseCard = CollapsePannelRef.current;
  // () => {
  //   addPreferences({
  //     'process-meta-data': {
  //       open: !showInfo,
  //       width: getWidth(),
  //     },
  //   });
  // };

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
      <div
        className={breakpoint.xs ? styles.MobileView : ''}
        style={{ display: 'flex', justifyContent: 'space-between', height: '100%' }}
      >
        {/* 73% for list / icon view, 27% for meta data panel (if active) */}
        <div style={{ flex: '1' }}>
          <Bar
            leftNode={
              <span style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  {breakpoint.xs ? null : (
                    <>
                      <ProcessCreationButton style={{ marginRight: '10px' }} type="primary">
                        {breakpoint.xl ? 'New Process' : 'New'}
                      </ProcessCreationButton>
                      <ProcessImportButton style={{ marginRight: '10px' }} type="default">
                        {breakpoint.xl ? 'Import Process' : 'Import'}
                      </ProcessImportButton>
                    </>
                  )}

                  {selectedRowKeys.length ? (
                    <span className={styles.SelectedRow}>
                      {selectedRowKeys.length} selected:
                      <span className={styles.Icons}>{actionBar}</span>
                    </span>
                  ) : undefined}
                </span>

                {
                  <span>
                    <Space.Compact className={cn(breakpoint.xs ? styles.MobileToggleView : '')}>
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
                    {breakpoint.xl ? (
                      <Button
                        type="text"
                        onClick={() => {
                          if (collapseCard) collapseCard();
                        }}
                      >
                        <InfoCircleOutlined />
                      </Button>
                    ) : undefined}
                  </span>
                }

                {/* <!-- FloatButtonGroup needs a z-index of 101
              since BPMN Logo of the viewer has an z-index of 100 --> */}
                {breakpoint.xl ? undefined : (
                  <FloatButton.Group
                    className={styles.FloatButton}
                    trigger="click"
                    type="primary"
                    style={{ marginBottom: '60px', marginRight: '10px', zIndex: '101' }}
                    icon={<PlusOutlined />}
                  >
                    <Tooltip trigger="hover" placement="left" title="Create a process">
                      <FloatButton
                        icon={
                          <ProcessCreationButton
                            type="text"
                            icon={<PlusOutlined style={{ marginLeft: '-0.81rem' }} />}
                          />
                        }
                      />
                    </Tooltip>
                    <Tooltip trigger="hover" placement="left" title="Import a process">
                      <FloatButton
                        icon={
                          <ProcessImportButton
                            type="text"
                            icon={<ImportOutlined style={{ marginLeft: '-0.81rem' }} />}
                          />
                        }
                      />
                    </Tooltip>
                  </FloatButton.Group>
                )}
              </span>
            }
            searchProps={{
              onChange: (e) => setSearchTerm(e.target.value),
              onPressEnter: (e) => setSearchTerm(e.currentTarget.value),
              placeholder: 'Search Processes ...',
            }}
          />

          {iconView ? (
            <IconView
              data={filteredData}
              selection={selectedRowKeys}
              setSelection={setSelectedRowKeys}
              setShowMobileMetaData={setShowMobileMetaData}
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
              setShowMobileMetaData={setShowMobileMetaData}
            />
          )}
        </div>

        {/*Meta Data Panel*/}
        {breakpoint.xl ? (
          <MetaData data={filteredData} selection={selectedRowKeys} ref={CollapsePannelRef} />
        ) : (
          <Drawer
            onClose={closeMobileMetaData}
            title={
              <span>
                {
                  filteredData?.find((item) => item.definitionId === selectedRowKeys[0])
                    ?.definitionName.value!
                }
              </span>
            }
            open={showMobileMetaData}
          >
            <MetaDataContent data={filteredData} selection={selectedRowKeys} />
          </Drawer>
        )}
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
