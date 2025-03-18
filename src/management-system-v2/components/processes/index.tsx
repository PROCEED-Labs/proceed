'use client';

import styles from './processes.module.scss';
import { ComponentProps, useEffect, useRef, useState, useTransition } from 'react';
import { GrDocumentUser } from 'react-icons/gr';
import { PiNotePencil } from 'react-icons/pi';
import { IoOpenOutline } from 'react-icons/io5';
import { LuNotebookPen } from 'react-icons/lu';
import { BsFileEarmarkCheck } from 'react-icons/bs';
import { PiDownloadSimple } from 'react-icons/pi';
import { RiFolderTransferLine } from 'react-icons/ri';
import { IoMdCopy } from 'react-icons/io';
import { AiOutlinePartition } from 'react-icons/ai';
import { PiFolderOpen } from 'react-icons/pi';
import {
  Space,
  Button,
  Tooltip,
  Grid,
  App,
  Drawer,
  Dropdown,
  Card,
  Badge,
  Divider,
  MenuProps,
} from 'antd';
import {
  CopyOutlined,
  EditOutlined,
  ExportOutlined,
  DeleteOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  FolderOutlined,
  FileOutlined,
  FolderFilled,
  ShareAltOutlined,
} from '@ant-design/icons';
import BPMNModeler from 'bpmn-js/lib/Modeler';
import IconView from '@/components/process-icon-list';
import ProcessList from '@/components/process-list';
import MetaData from '@/components/process-info-card';
import Bar from '@/components/bar';
import { ProcessCreationModal } from '@/components/process-creation-button';
import { useUserPreferences } from '@/lib/user-preferences';
import { useAbilityStore } from '@/lib/abilityStore';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import { useRouter } from 'next/navigation';
import {
  copyProcesses,
  createVersion,
  deleteProcesses,
  updateProcesses,
} from '@/lib/data/processes';
import ProcessModal from '@/components/process-modal';
import ConfirmationButton from '@/components/confirmation-button';
import ProcessImportButton from '@/components/process-import';
import { ProcessMetadata } from '@/lib/data/process-schema';
import MetaDataContent from '@/components/process-info-card-content';
import { useEnvironment } from '@/components/auth-can';
import { Folder } from '@/lib/data/folder-schema';
import { FolderCreationModal } from '@/components/folder-creation';
import {
  deleteFolder,
  moveIntoFolder,
  updateFolder as updateFolderServer,
} from '@/lib/data/folders';

import AddUserControls from '@/components/add-user-controls';
import { toCaslResource } from '@/lib/ability/caslAbility';
import FolderModal from '@/components/folder-modal';
import { useAddControlCallback } from '@/lib/controls-store';
import useFavouritesStore, { useInitialiseFavourites } from '@/lib/useFavouriteProcesses';
import Ability from '@/lib/ability/abilityHelper';
import ContextMenuArea from './context-menu';
import { DraggableContext } from './draggable-element';
import SelectionActions from '../selection-actions';
import ProceedLoadingIndicator from '../loading-proceed';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { handleOpenDocumentation } from '@/app/(dashboard)/[environmentId]/processes/processes-helper';
import { spaceURL } from '@/lib/utils';
import VersionCreationButton, { VersionModal } from '../version-creation-button';

/* SHARE HERE */
// import ModelerShareModalButton from '@/app/(dashboard)/[environmentId]/processes/[processId]/modeler-share-modal';

import { getProcess } from '@/lib/data/DTOs';
import BPMNCanvas, { BPMNCanvasRef } from '../bpmn-canvas';
import { set } from 'zod';
import { ShareModal } from '../share-modal/share-modal';

export function canDoActionOnResource(
  items: ProcessListProcess[],
  action: Parameters<Ability['can']>[0],
  ability: Ability,
) {
  for (const item of items) {
    const resource = toCaslResource(item.type === 'folder' ? 'Folder' : 'Process', item);
    if (!ability.can(action, resource)) return false;
  }

  return true;
}

// TODO: improve ordering
export type ProcessActions = {
  deleteItems: (items: ProcessListProcess[]) => void;
  copyItem: (items: ProcessListProcess[]) => void;
  editItem: (item: ProcessListProcess) => void;
  moveItems: (...args: Parameters<typeof moveIntoFolder>) => void;
};

export type contextAcions = {
  // View Process Documentation,
  viewDocumentation: (item: ProcessListProcess) => void;
  // Change Meta Data,
  changeMetaData: (item: ProcessListProcess) => void;
  // Release Process,
  releaseProcess: (item: ProcessListProcess) => void;
  // Share,
  share: (item: ProcessListProcess) => void;
  // Download,
  exportProcess: (items: ProcessListProcess[]) => void;
  // Move to Folder,
  moveItems: (items: ProcessListProcess[]) => void;
  // Copy,
  copyItems: (items: ProcessListProcess[]) => void;
  // Delete,
  deleteItems: (items: ProcessListProcess[]) => void;
};

export type rowActions = {
  // View Process Documentation,
  viewDocumentation: (item: ProcessListProcess) => void;
  // Open Editor,
  openEditor: (item: ProcessListProcess) => void;
  // Change Meta Data,
  changeMetaData: (item: ProcessListProcess) => void;
  // Release Process,
  releaseProcess: (item: ProcessListProcess) => void;
  // Share
  share: (item: ProcessListProcess) => void;
};

type InputItem = ProcessMetadata | (Folder & { type: 'folder' });
export type ProcessListProcess = ReplaceKeysWithHighlighted<InputItem, 'name' | 'description'>;

const Processes = ({
  processes,
  favourites,
  idUsernameMapping = {},
  folder,
  readOnly = false,
}: {
  processes: InputItem[];
  favourites?: string[];
  idUsernameMapping?: Record<string, string>;
  folder: Folder;
  readOnly?: boolean;
}) => {
  if (folder.parentId)
    processes = [
      {
        name: '< Parent Folder >',
        parentId: null,
        type: 'folder',
        id: folder.parentId,
        createdOn: null,
        createdBy: '',
        lastEditedOn: null,
        environmentId: '',
      },
      ...processes,
    ];

  const app = App.useApp();
  const breakpoint = Grid.useBreakpoint();
  const ability = useAbilityStore((state) => state.ability);
  const space = useEnvironment();
  const router = useRouter();
  const environment = useEnvironment();

  const favs = favourites ?? [];
  useInitialiseFavourites(favs);
  const { removeIfPresent: removeFromFavouriteProcesses } = useFavouritesStore();

  const [selectedRowElements, setSelectedRowElements] = useState<ProcessListProcess[]>([]);
  const selectedRowKeys = selectedRowElements.map((element) => element.id);
  const canDeleteSelected =
    !!selectedRowElements.length &&
    canDoActionOnResource(selectedRowElements, 'delete', ability) &&
    !readOnly;
  const canCreateProcess = ability.can('create', 'Process') && !readOnly;
  const canEditSelected =
    canDoActionOnResource(selectedRowElements, 'update', ability) && !readOnly;

  const addPreferences = useUserPreferences.use.addPreferences();
  const iconView = useUserPreferences.use['icon-view-in-process-list']();
  const { open: metaPanelisOpened, width: metaPanelWidth } =
    useUserPreferences.use['process-meta-data']();

  const [openExportModal, setOpenExportModal] = useState(false);
  const exportModalTab = useRef<'bpmn' | 'share-public-link' | undefined>(undefined);
  const [openCopyModal, setOpenCopyModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const [showMobileMetaData, setShowMobileMetaData] = useState(false);
  const [updatingFolder, startUpdatingFolderTransition] = useTransition();
  const [updateFolderModal, setUpdateFolderModal] = useState<Folder | undefined>(undefined);
  const [movingItem, startMovingItemTransition] = useTransition();
  const [moveToFolderModalOpen, setMoveToFolderModalOpen] = useState(false);
  const [openCreateProcessModal, setOpenCreateProcessModal] = useState(
    typeof window !== 'undefined' &&
      new URLSearchParams(document.location.search).has('createprocess'),
  );
  const [openCreateFolderModal, setOpenCreateFolderModal] = useState(false);
  const [openVersionModal, setOpenVersionModal] = useState(false);
  const [rowClickedProcess, setRowClickedProcess] = useState<string | undefined>();

  const [copySelection, setCopySelection] = useState<ProcessListProcess[]>([]);

  const [shareXML, setShareXML] = useState<string | null>(null);

  useEffect(() => {
    if (selectedRowKeys.length === 1) {
      getProcess(selectedRowKeys[0], true).then(({ bpmn }) => {
        setShareXML(bpmn);
      });
    }
  }, [selectedRowKeys, setShareXML]);

  const modelerRef = useRef<BPMNCanvasRef>(null);

  const { filteredData, setSearchQuery: setSearchTerm } = useFuzySearch({
    data: processes ?? [],
    keys: ['name', 'description'],
    highlightedKeys: ['name', 'description'],
    transformData: (matches) => matches.map((match) => match.item),
  });

  // Folders on top
  filteredData.sort((a, b) => {
    if (a.type === 'folder' && b.type == 'folder') return 0;
    if (a.type === 'folder') return -1;
    if (b.type === 'folder') return 1;

    return 0;
  });

  // Folder dropdown
  const folderDropdDownItems: MenuProps['items'] = [
    ...filteredData
      .filter(({ type }) => type === 'folder')
      .filter(({ id }) => !selectedRowKeys.includes(id))
      .map((folder) => ({
        key: folder.id,
        label: folder.name.value,
        icon: <FolderOutlined />,
        onClick: () => {
          moveItems(
            selectedRowElements.map((element) => ({
              type: element.type,
              id: element.id,
            })),
            folder.id,
          );
        },
      })),
    {
      key: 'new-folder',
      label: 'Create New Folder',
      icon: <FolderFilled />,
      onClick: () => setOpenCreateFolderModal(true),
      style: {
        borderTop: '1px solid #f0f0f0',
      },
    },
  ];

  const selectableElements = useRef(filteredData);
  selectableElements.current = filteredData;

  useAddControlCallback('process-list', 'selectall', (e) => {
    e.preventDefault();
    setSelectedRowElements(selectableElements.current ?? []);
  });

  useAddControlCallback('process-list', 'esc', () => setSelectedRowElements([]));
  useAddControlCallback(
    'process-list',
    'del',
    () => {
      if (canDeleteSelected) {
        setOpenDeleteModal(true);
        /* Clear copy selection */
        setCopySelection([]);
      }
    },
    { dependencies: [canDeleteSelected] },
  );
  useAddControlCallback(
    'process-list',
    'copy',
    () => {
      setCopySelection(selectedRowElements);
    },
    { dependencies: [selectedRowElements] },
  );

  useAddControlCallback(
    'process-list',
    'paste',
    () => {
      if (copySelection.length) {
        setOpenCopyModal(true);
      }
    },
    { dependencies: [copySelection] },
  );
  useAddControlCallback(
    'process-list',
    'export',
    () => {
      if (selectedRowKeys.length) setOpenExportModal(true);
    },
    { dependencies: [selectedRowKeys.length] },
  );

  function deleteCreateProcessSearchParams() {
    const searchParams = new URLSearchParams(document.location.search);
    if (searchParams.has('createprocess')) {
      searchParams.delete('createprocess');
      router.replace(
        window.location.origin + window.location.pathname + '?' + searchParams.toString(),
      );
    }
  }

  const defaultDropdownItems = [];
  // Create Process,
  if (ability.can('create', 'Process'))
    defaultDropdownItems.push({
      key: 'create-process',
      label: 'Create Process',
      icon: <FileOutlined />,
      onClick: () => setOpenCreateProcessModal(true),
    });
  // Create Folder,
  if (ability.can('create', 'Folder'))
    defaultDropdownItems.push({
      key: 'create-folder',
      label: 'Create Folder',
      onClick: () => setOpenCreateFolderModal(true),
      icon: <FolderOutlined />,
    });
  // Import Process
  if (ability.can('create', 'Process'))
    defaultDropdownItems.push({
      key: 'import-process',
      label: (
        <>
          {/* This is a small workaround, because you cant trigger AntDesigns Upload other than a child button */}
          <ProcessImportButton type="default" className={styles['Process-Import-Context-Menu']}>
            Import Process
          </ProcessImportButton>
        </>
      ),
      icon: <PiFolderOpen />,
    });

  const updateFolder: ComponentProps<typeof FolderModal>['onSubmit'] = (values) => {
    if (!values) return;

    startUpdatingFolderTransition(async () => {
      await wrapServerCall({
        fn: () =>
          updateFolderServer(
            { name: values.name, description: values.description },
            updateFolderModal!.id,
          ),
        onSuccess: () => {
          app.message.open({ type: 'success', content: 'Folder updated' });
          setUpdateFolderModal(undefined);
          router.refresh();
        },
        app,
      });
    });
  };

  async function deleteItems(items: ProcessListProcess[]) {
    const promises = [];

    const folderIds = items.filter((item) => item.type === 'folder').map((item) => item.id);
    const folderPromise = folderIds.length > 0 ? deleteFolder(folderIds, space.spaceId) : undefined;
    if (folderPromise) promises.push(folderPromise);

    const processIds = items.filter((item) => item.type !== 'folder').map((item) => item.id);
    const processPromise = deleteProcesses(processIds, space.spaceId);
    if (processPromise) promises.push(processPromise);

    await Promise.allSettled(promises);

    const processesResult = await processPromise;
    const folderResult = await folderPromise;

    if (processesResult && !('error' in processesResult)) {
      removeFromFavouriteProcesses(selectedRowKeys as string[]);
    }

    if (
      (folderResult && 'error' in folderResult) ||
      (processesResult && 'error' in processesResult)
    ) {
      return app.message.open({
        type: 'error',
        content: 'Something went wrong',
      });
    }

    setSelectedRowElements([]);
    router.refresh();
  }

  function copyItem(items: ProcessListProcess[]) {
    setOpenCopyModal(true);
    setCopySelection(items);
  }

  function editItem(item: ProcessListProcess) {
    if (item.type === 'folder') {
      const folder = processes.find((process) => process.id === item.id) as Folder;
      setUpdateFolderModal(folder);
    } else {
      setOpenEditModal(true);
      setSelectedRowElements([item]);
    }
  }

  const moveItems = (...[items, folderId]: Parameters<typeof moveIntoFolder>) => {
    startMovingItemTransition(async () => {
      await wrapServerCall({
        fn: () => moveIntoFolder(items, folderId),
        onSuccess: router.refresh,
        app,
      });
    });
  };

  const viewDocumentation = (item: ProcessListProcess) => {
    handleOpenDocumentation(item.id);
  };

  const openEditor = (item: ProcessListProcess) => {
    const url = spaceURL(space, `/processes/${item.id}`);
    router.push(url);
  };

  const changeMetaData = (item: ProcessListProcess) => {
    editItem(item);
  };

  const releaseProcess = (item: ProcessListProcess) => {
    setRowClickedProcess(item.id);
    setOpenVersionModal(true);
  };

  const createVersionFromList = async (values: {
    versionName: string;
    versionDescription: string;
    processId?: string;
  }) => {
    await createVersion(
      values.versionName,
      values.versionDescription,
      values.processId ?? selectedRowKeys[0],
      environment.spaceId,
    );
  };

  const share = (item: ProcessListProcess) => {
    setOpenExportModal(true);
  };

  const openFolderMoveModal = (items: ProcessListProcess[]) => {
    /* TODO: */
  };

  const processActions: ProcessActions = {
    deleteItems,
    copyItem,
    editItem,
    moveItems,
  };

  const rowActions: rowActions = {
    viewDocumentation,
    openEditor,
    changeMetaData,
    releaseProcess,
    share,
  };

  const contextActions: contextAcions = {
    viewDocumentation,
    changeMetaData,
    releaseProcess,
    share,
    exportProcess: (items) => {
      setSelectedRowElements(items);
      setOpenExportModal(true);
    },
    moveItems: openFolderMoveModal,
    copyItems: copyItem,
    deleteItems: (items) => {
      setSelectedRowElements(items);
      setOpenDeleteModal(true);
    },
  };

  // Here all the loading states should be ORed together
  const loading = movingItem;

  return (
    <>
      <ContextMenuArea
        processActions={contextActions}
        folder={folder}
        suffix={defaultDropdownItems}
      >
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
                    {!breakpoint.xs && !readOnly && (
                      <Space>
                        <Dropdown.Button
                          menu={{
                            items: defaultDropdownItems.filter(
                              (item) => item.key !== 'create-process',
                            ),
                            mode: 'inline',
                          }}
                          type="primary"
                          onClick={() => setOpenCreateProcessModal(true)}
                          trigger={['click']}
                        >
                          Create Process
                        </Dropdown.Button>
                        <ProcessImportButton type="default">Import</ProcessImportButton>
                      </Space>
                    )}

                    {/* DIVIDER BLOCK */}
                    <SelectionActions count={selectedRowKeys.length} readOnly={readOnly}>
                      <Space split={<Divider type="vertical" />}>
                        {selectedRowKeys.length === 1 &&
                          selectedRowElements[0].type == 'process' && (
                            <div>
                              {selectedRowElements[0].type == 'process' && (
                                <>
                                  {/* View Process Documentation, */}
                                  <Tooltip placement="top" title={'View Process Documentation'}>
                                    <Button
                                      // className={classNames(styles.ActionButton)}
                                      type="text"
                                      icon={<GrDocumentUser className={styles.Icon} />}
                                      onClick={() => {
                                        handleOpenDocumentation(selectedRowKeys[0]);
                                      }}
                                    />
                                  </Tooltip>
                                </>
                              )}
                              {/* // Open Editor */}
                              <Tooltip placement="top" title={'Open Editor'}>
                                <Button
                                  // className={classNames(styles.ActionButton)}
                                  type="text"
                                  icon={<PiNotePencil className={styles.Icon} />}
                                  onClick={() => {
                                    const url = spaceURL(space, `/processes/${selectedRowKeys[0]}`);
                                    router.push(url);
                                  }}
                                />
                              </Tooltip>
                              {/* // Open Editor in new Tab */}
                              <Tooltip placement="top" title={'Open Editor in new Tab'}>
                                <Button
                                  // className={classNames(styles.ActionButton)}
                                  type="text"
                                  icon={<IoOpenOutline className={styles.Icon} />}
                                  onClick={() => {
                                    const url = spaceURL(space, `/processes/${selectedRowKeys[0]}`);
                                    window.open(url, '_blank');
                                  }}
                                />
                              </Tooltip>
                              {/* // Change Meta Data */}
                              {canEditSelected && (
                                <Tooltip placement="top" title={'Change Meta Data'}>
                                  <Button
                                    // className={classNames(styles.ActionButton)}
                                    type="text"
                                    icon={<LuNotebookPen className={styles.Icon} />}
                                    onClick={() => {
                                      editItem(selectedRowElements[0]);
                                    }}
                                  />
                                </Tooltip>
                              )}
                              {/* // Release Process */}
                              {canCreateProcess && (
                                <Tooltip placement="top" title={'Release Process'}>
                                  <VersionCreationButton
                                    type="text"
                                    icon={<BsFileEarmarkCheck />}
                                    createVersion={createVersionFromList}
                                  ></VersionCreationButton>
                                </Tooltip>
                              )}
                            </div>
                          )}
                        {/* 
                            Vertical Bar | ,
                          */}
                        {!readOnly && (
                          <div>
                            {/* // Move to Folder */}
                            {/* TODO: edit ~= move? (ability wise)*/}
                            {canEditSelected && (
                              <>
                                <Dropdown menu={{ items: folderDropdDownItems }}>
                                  <Tooltip placement="top" title={'Move to Folder'}>
                                    <Button
                                      // className={classNames(styles.ActionButton)}
                                      type="text"
                                      icon={<RiFolderTransferLine className={styles.Icon} />}
                                    />
                                  </Tooltip>
                                </Dropdown>
                              </>
                            )}
                            {/* // Copy */}
                            {canCreateProcess && (
                              <Tooltip placement="top" title={'Copy'}>
                                <Button
                                  // className={classNames(styles.ActionButton)}
                                  type="text"
                                  icon={<IoMdCopy className={styles.Icon} />}
                                  onClick={() => {
                                    setCopySelection(selectedRowElements);
                                    setOpenCopyModal(true);
                                  }}
                                />
                              </Tooltip>
                            )}
                            {/* // Delete */}
                            {canDeleteSelected && (
                              // <Tooltip placement="top" title={'Delete'}>
                              <ConfirmationButton
                                tooltip="Delete"
                                title="Delete Processes"
                                externalOpen={openDeleteModal}
                                onExternalClose={() => setOpenDeleteModal(false)}
                                description="Are you sure you want to delete the selected processes?"
                                onConfirm={() => deleteItems(selectedRowElements)}
                                buttonProps={{
                                  icon: <DeleteOutlined className={styles.Icon} />,
                                  type: 'text',
                                }}
                              />
                              // </Tooltip>
                            )}
                          </div>
                        )}
                        {/* 
                            Vertical Bar | ,
                          */}
                        <div>
                          {/* // Share */}
                          {selectedRowKeys.length === 1 &&
                            selectedRowElements[0].type == 'process' && (
                              <>
                                <Tooltip placement="top" title={'Share'}>
                                  <Button
                                    type="text"
                                    onClick={() => {
                                      exportModalTab.current = 'share-public-link';
                                      setOpenExportModal(true);
                                    }}
                                    icon={<ShareAltOutlined className={styles.Icon} />}
                                  ></Button>
                                </Tooltip>
                              </>
                            )}
                          {/* // Download */}
                          <Tooltip placement="top" title={'Download'}>
                            <Button
                              type="text"
                              onClick={() => {
                                exportModalTab.current = 'bpmn';
                                setOpenExportModal(true);
                              }}
                              icon={<PiDownloadSimple className={styles.Icon} />}
                            ></Button>
                          </Tooltip>
                        </div>
                      </Space>
                    </SelectionActions>
                  </span>

                  <span>
                    <Space.Compact className={breakpoint.xs ? styles.MobileToggleView : undefined}>
                      <Button
                        style={!iconView ? { color: '#3e93de', borderColor: '#3e93de' } : {}}
                        onClick={() => addPreferences({ 'icon-view-in-process-list': false })}
                      >
                        <UnorderedListOutlined />
                      </Button>
                      <Button
                        style={!iconView ? {} : { color: '#3e93de', borderColor: '#3e93de' }}
                        onClick={() => addPreferences({ 'icon-view-in-process-list': true })}
                      >
                        <AppstoreOutlined />
                      </Button>
                    </Space.Compact>
                  </span>
                </span>
              }
              searchProps={{
                onChange: (e) => setSearchTerm(e.target.value),
                onPressEnter: (e) => setSearchTerm(e.currentTarget.value),
                placeholder: 'Search Processes ...',
              }}
            />

            <DraggableContext
              dragOverlay={(itemId) => {
                const item = processes.find(({ id }) => id === itemId);
                const icon = item?.type === 'folder' ? <FolderOutlined /> : <FileOutlined />;
                return (
                  <Badge
                    count={selectedRowElements.length > 1 ? selectedRowElements.length : undefined}
                  >
                    <Card
                      style={{
                        cursor: 'move',
                      }}
                    >
                      <span
                        style={{
                          width: 'fit-content',
                          display: 'block',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          maxWidth: '40ch',
                        }}
                      >
                        {icon} {item?.name}
                      </span>
                    </Card>
                  </Badge>
                );
              }}
              onItemDropped={(itemId: string, droppedOnId: string) => {
                const active = processes.find(({ id }) => id === itemId);
                const over = processes.find(({ id }) => id === droppedOnId);

                if (!active || !over || over.type !== 'folder') return;

                // don't allow to move selected items into themselves
                if (selectedRowKeys.length > 0 && selectedRowKeys.includes(over.id)) return;

                const items =
                  selectedRowKeys.length > 0
                    ? selectedRowElements.map((element) => ({
                        type: element.type,
                        id: element.id,
                      }))
                    : [{ type: active.type, id: active.id }];

                moveItems(items, over.id);
              }}
            >
              {/* <Spin spinning={loading}> */}
              <ProceedLoadingIndicator
                width={'100%'}
                scale="60%"
                // position={{ x: '25%', y: '20%' }}
                loading={loading}
                small={true}
              >
                {iconView ? (
                  <IconView
                    data={filteredData}
                    elementSelection={{
                      selectedElements: selectedRowElements,
                      setSelectionElements: setSelectedRowElements,
                    }}
                    setShowMobileMetaData={setShowMobileMetaData}
                  />
                ) : (
                  <div
                    style={{
                      maxWidth: breakpoint.xl
                        ? metaPanelisOpened
                          ? `calc(87vw - ${metaPanelWidth}px)`
                          : '85.5vw'
                        : '100%',
                    }}
                  >
                    <ProcessList
                      data={filteredData}
                      idUsernameMapping={idUsernameMapping}
                      folder={folder}
                      selection={selectedRowKeys}
                      setSelectionElements={setSelectedRowElements}
                      selectedElements={selectedRowElements}
                      // TODO: Replace with server component loading state
                      //isLoading={isLoading}
                      onExportProcess={(id) => {
                        setSelectedRowElements([id]);
                        setOpenExportModal(true);
                      }}
                      setShowMobileMetaData={setShowMobileMetaData}
                      processActions={/* processActions */ rowActions}
                    />
                  </div>
                )}
              </ProceedLoadingIndicator>
              {/* </Spin> */}
            </DraggableContext>
          </div>

          {/*Meta Data Panel*/}
          {breakpoint.xl ? (
            <MetaData selectedElement={selectedRowElements.at(-1)} />
          ) : (
            <Drawer
              onClose={() => setShowMobileMetaData(false)}
              title={
                <span>
                  {filteredData?.find((item) => item.id === selectedRowKeys[0])?.name.value!}
                </span>
              }
              open={showMobileMetaData}
            >
              <MetaDataContent selectedElement={selectedRowElements.at(-1)} />
            </Drawer>
          )}
        </div>
      </ContextMenuArea>

      <ShareModal
        open={openExportModal}
        setOpen={setOpenExportModal}
        processes={(
          selectedRowElements.filter((e) => e.type !== 'folder') as Exclude<
            ProcessListProcess,
            { type: 'folder' }
          >[]
        ).map((e) => ({
          ...e,
          name: e.name.value,
        }))}
        defaultOpenTab={exportModalTab.current}
      />
      <ProcessModal
        open={openCopyModal}
        title={`Copy Process${selectedRowKeys.length > 1 ? 'es' : ''}`}
        onCancel={() => setOpenCopyModal(false)}
        initialData={copySelection
          .filter((item) => item.type !== 'folder')
          .map((process) => ({
            name: `${process.name.value} (Copy)`,
            description: process.description.value ?? '',
            originalId: process.id,
            folderId: folder.id,
          }))}
        onSubmit={async (values) => {
          const res = await copyProcesses(values, space.spaceId);
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
        title={'Process Meta Data' /* `Edit Process${selectedRowKeys.length > 1 ? 'es' : ''}` */}
        onCancel={() => setOpenEditModal(false)}
        initialData={filteredData
          .filter((process) => selectedRowKeys.includes(process.id))
          .map((process) => ({
            id: process.id,
            name: process.name.value ?? '',
            description: process.description.value ?? '',
          }))}
        onSubmit={async (values) => {
          const res = await updateProcesses(values, space.spaceId);
          // Errors are handled in the modal.
          if (res && 'error' in res) {
            return res;
          }
          setOpenEditModal(false);
          router.refresh();
        }}
      />
      <FolderModal
        open={!!updateFolderModal}
        close={() => setUpdateFolderModal(undefined)}
        spaceId={space.spaceId}
        parentId={folder.id}
        onSubmit={updateFolder}
        modalProps={{ title: 'Edit folder', okButtonProps: { loading: updatingFolder } }}
        initialValues={updateFolderModal}
      />
      <ProcessCreationModal
        open={openCreateProcessModal}
        setOpen={setOpenCreateProcessModal}
        modalProps={{
          onCancel: deleteCreateProcessSearchParams,
          onOk: deleteCreateProcessSearchParams,
        }}
      />
      <VersionModal
        close={(values) => {
          setOpenVersionModal(false);

          if (values) {
            createVersionFromList({ ...values, processId: rowClickedProcess });
          }
        }}
        show={openVersionModal}
      />
      <FolderCreationModal
        open={openCreateFolderModal}
        close={() => setOpenCreateFolderModal(false)}
      />

      <AddUserControls name={'process-list'} />
    </>
  );
};

export default Processes;
