'use client';

import styles from './processes.module.scss';
import { ComponentProps, useRef, useState, useTransition } from 'react';
import { Space, Button, Tooltip, Grid, App, Drawer, Dropdown, Card, Badge } from 'antd';
import {
  CopyOutlined,
  EditOutlined,
  ExportOutlined,
  DeleteOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  FolderOutlined,
  FileOutlined,
} from '@ant-design/icons';
import IconView from '@/components/process-icon-list';
import ProcessList from '@/components/process-list';
import MetaData from '@/components/process-info-card';
import Bar from '@/components/bar';
import { ProcessCreationModal } from '@/components/process-creation-button';
import { useUserPreferences } from '@/lib/user-preferences';
import { useAbilityStore } from '@/lib/abilityStore';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import { useRouter } from 'next/navigation';
import { copyProcesses, deleteProcesses, updateProcesses } from '@/lib/data/processes';
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

type InputItem = ProcessMetadata | (Folder & { type: 'folder' });
export type ProcessListProcess = ReplaceKeysWithHighlighted<InputItem, 'name' | 'description'>;

const Processes = ({
  processes,
  favourites,
  folder,
}: {
  processes: InputItem[];
  favourites?: string[];
  folder: Folder;
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

  const favs = favourites ?? [];
  useInitialiseFavourites(favs);
  const { removeIfPresent: removeFromFavouriteProcesses } = useFavouritesStore();

  const [selectedRowElements, setSelectedRowElements] = useState<ProcessListProcess[]>([]);
  const selectedRowKeys = selectedRowElements.map((element) => element.id);
  const canDeleteSelected =
    !!selectedRowElements.length && canDoActionOnResource(selectedRowElements, 'delete', ability);
  const canCreateProcess = ability.can('create', 'Process');
  const canEditSelected = canDoActionOnResource(selectedRowElements, 'update', ability);

  const addPreferences = useUserPreferences.use.addPreferences();
  const iconView = useUserPreferences.use['icon-view-in-process-list']();
  const { open: metaPanelisOpened, width: metaPanelWidth } =
    useUserPreferences.use['process-meta-data']();

  const [openExportModal, setOpenExportModal] = useState(false);
  const [openCopyModal, setOpenCopyModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const [showMobileMetaData, setShowMobileMetaData] = useState(false);
  const [updatingFolder, startUpdatingFolderTransition] = useTransition();
  const [updateFolderModal, setUpdateFolderModal] = useState<Folder | undefined>(undefined);
  const [movingItem, startMovingItemTransition] = useTransition();
  const [openCreateProcessModal, setOpenCreateProcessModal] = useState(
    typeof window !== 'undefined' &&
      new URLSearchParams(document.location.search).has('createprocess'),
  );
  const [openCreateFolderModal, setOpenCreateFolderModal] = useState(false);

  const [copySelection, setCopySelection] = useState<ProcessListProcess[]>([]);

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
  if (ability.can('create', 'Process'))
    defaultDropdownItems.push({
      key: 'create-process',
      label: 'Create Process',
      icon: <FileOutlined />,
      onClick: () => setOpenCreateProcessModal(true),
    });

  if (ability.can('create', 'Folder'))
    defaultDropdownItems.push({
      key: 'create-folder',
      label: 'Create Folder',
      onClick: () => setOpenCreateFolderModal(true),
      icon: <FolderOutlined />,
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

  const processActions: ProcessActions = {
    deleteItems,
    copyItem,
    editItem,
    moveItems,
  };

  // Here all the loading states should be ORed together
  const loading = movingItem;

  return (
    <>
      <ContextMenuArea
        processActions={processActions}
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
                    {!breakpoint.xs && (
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
                        >
                          Create Process
                        </Dropdown.Button>
                        <ProcessImportButton type="default">
                          {breakpoint.xl ? 'Import Process' : 'Import'}
                        </ProcessImportButton>
                      </Space>
                    )}

                    <SelectionActions count={selectedRowKeys.length}>
                      {/* Copy */}
                      {canCreateProcess && (
                        <Tooltip placement="top" title={'Copy'}>
                          <Button
                            // className={classNames(styles.ActionButton)}
                            type="text"
                            icon={<CopyOutlined className={styles.Icon} />}
                            onClick={() => {
                              setCopySelection(selectedRowElements);
                              setOpenCopyModal(true);
                            }}
                          />
                        </Tooltip>
                      )}

                      {/* Export */}
                      <Tooltip placement="top" title={'Export'}>
                        <Button
                          type="text"
                          onClick={() => {
                            setOpenExportModal(true);
                          }}
                          icon={<ExportOutlined className={styles.Icon} />}
                        ></Button>
                      </Tooltip>
                      {/* Edit (only if one selected) */}

                      {selectedRowKeys.length === 1 && canEditSelected && (
                        <Tooltip placement="top" title={'Edit'}>
                          <Button
                            // className={classNames(styles.ActionButton)}
                            type="text"
                            icon={<EditOutlined className={styles.Icon} />}
                            onClick={() => {
                              editItem(selectedRowElements[0]);
                            }}
                          />
                        </Tooltip>
                      )}
                      {/* Delete */}
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
                          ? `calc(100vw - ${metaPanelWidth}px - 200px - 20px - 10px - 10px)`
                          : 'calc(100vw - 30px - 200px - 20px - 10px - 10px)'
                        : 'calc(100vw - 75px - 10px - 10px)',
                    }}
                  >
                    <ProcessList
                      data={filteredData}
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
                      processActions={processActions}
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
        title={`Edit Process${selectedRowKeys.length > 1 ? 'es' : ''}`}
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
      <FolderCreationModal
        open={openCreateFolderModal}
        close={() => setOpenCreateFolderModal(false)}
      />
      <AddUserControls name={'process-list'} />
    </>
  );
};

export default Processes;
