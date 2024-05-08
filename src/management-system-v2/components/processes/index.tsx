'use client';

import styles from './processes.module.scss';
import { ComponentProps, useState, useTransition } from 'react';
import { Space, Button, Tooltip, Grid, App, Drawer, Dropdown, Card, Badge, Spin } from 'antd';
import {
  ExportOutlined,
  DeleteOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  PlusOutlined,
  FolderOutlined,
  FileOutlined,
} from '@ant-design/icons';
import IconView from '@/components/process-icon-list';
import ProcessList from '@/components/process-list';
import MetaData from '@/components/process-info-card';
import ProcessExportModal from '@/components/process-export';
import Bar from '@/components/bar';
import ProcessCreationButton from '@/components/process-creation-button';
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
import FolderCreationButton from '@/components/folder-creation-button';
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

export function canDeleteItems(
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
  const originalProcesses = processes;
  if (folder.parentId)
    processes = [
      {
        name: '< Parent Folder >',
        parentId: null,
        type: 'folder',
        id: folder.parentId,
        createdAt: '',
        createdBy: '',
        updatedAt: '',
        environmentId: '',
      },
      ...processes,
    ];

  const { message } = App.useApp();
  const breakpoint = Grid.useBreakpoint();
  const ability = useAbilityStore((state) => state.ability);
  const space = useEnvironment();
  const router = useRouter();

  const favs = favourites ?? [];
  useInitialiseFavourites(favs);
  const { removeIfPresent: removeFromFavouriteProcesses } = useFavouritesStore();

  const [selectedRowElements, setSelectedRowElements] = useState<ProcessListProcess[]>([]);
  const selectedRowKeys = selectedRowElements.map((element) => element.id);
  const canDeleteSelected = canDeleteItems(selectedRowElements, 'delete', ability);

  const addPreferences = useUserPreferences.use.addPreferences();
  const iconView = useUserPreferences.use['icon-view-in-process-list']();

  const [openExportModal, setOpenExportModal] = useState(false);
  const [openCopyModal, setOpenCopyModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [showMobileMetaData, setShowMobileMetaData] = useState(false);
  const [updatingFolder, startUpdatingFolderTransition] = useTransition();
  const [updateFolderModal, setUpdateFolderModal] = useState<Folder | undefined>(undefined);
  const [movingItem, startMovingItemTransition] = useTransition();

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

  useAddControlCallback(
    'process-list',
    'selectall',
    (e) => {
      e.preventDefault();
      setSelectedRowElements(filteredData ?? []);
    },
    { dependencies: [originalProcesses] },
  );
  useAddControlCallback('process-list', 'esc', () => setSelectedRowElements([]));
  useAddControlCallback('process-list', 'del', () => setOpenDeleteModal(true));
  useAddControlCallback('process-list', 'copy', () => setCopySelection(selectedRowElements));
  useAddControlCallback('process-list', 'paste', () => setOpenCopyModal(true));
  useAddControlCallback(
    'process-list',
    'export',
    () => {
      if (selectedRowKeys.length) setOpenExportModal(true);
    },
    { dependencies: [selectedRowKeys.length] },
  );

  const defaultDropdownItems = [];
  if (ability.can('create', 'Process'))
    defaultDropdownItems.push({
      key: 'create-process',
      label: <ProcessCreationButton wrapperElement="create process" />,
      icon: <FileOutlined />,
    });

  if (ability.can('create', 'Folder'))
    defaultDropdownItems.push({
      key: 'create-folder',
      label: <FolderCreationButton wrapperElement="Create Folder" />,
      icon: <FolderOutlined />,
    });

  const updateFolder: ComponentProps<typeof FolderModal>['onSubmit'] = (values) => {
    if (!folder) return;

    startUpdatingFolderTransition(async () => {
      try {
        const response = updateFolderServer(
          { name: values.name, description: values.description },
          folder.id,
        );

        if (response && 'error' in response) throw new Error();

        message.open({ type: 'success', content: 'Folder updated successfully' });
        setUpdateFolderModal(undefined);
        router.refresh();
      } catch (e) {
        message.open({ type: 'error', content: 'Someting went wrong while updating the folder' });
      }
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
      return message.open({
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
      try {
        const response = await moveIntoFolder(items, folderId);

        if (response && 'error' in response) throw new Error();

        router.refresh();
      } catch (e) {
        message.open({
          type: 'error',
          content: `Someting went wrong`,
        });
      }
    });
  };

  const processActions: ProcessActions = {
    deleteItems,
    copyItem,
    editItem,
    moveItems,
  };

  // Here all the loading states shoud be ORed together
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
                        <Dropdown
                          trigger={['click']}
                          menu={{
                            items: defaultDropdownItems,
                          }}
                        >
                          <Button type="primary" icon={<PlusOutlined />}>
                            New
                          </Button>
                        </Dropdown>
                        <ProcessImportButton type="default">
                          {breakpoint.xl ? 'Import Process' : 'Import'}
                        </ProcessImportButton>
                      </Space>
                    )}

                    {selectedRowKeys.length ? (
                      <span className={styles.SelectedRow}>
                        {selectedRowKeys.length} selected:
                        <span className={styles.Icons}>
                          <Tooltip placement="top" title={'Export'}>
                            <ExportOutlined
                              className={styles.Icon}
                              onClick={() => {
                                setOpenExportModal(true);
                              }}
                            />
                          </Tooltip>

                          {canDeleteSelected && (
                            <Tooltip placement="top" title={'Delete'}>
                              <ConfirmationButton
                                title="Delete Processes"
                                externalOpen={openDeleteModal}
                                onExternalClose={() => setOpenDeleteModal(false)}
                                description="Are you sure you want to delete the selected processes?"
                                onConfirm={() => deleteItems(selectedRowElements)}
                                buttonProps={{
                                  icon: <DeleteOutlined />,
                                  type: 'text',
                                }}
                              />
                            </Tooltip>
                          )}
                        </span>
                      </span>
                    ) : undefined}
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
                        width: 'fit-content',
                        cursor: 'move',
                      }}
                    >
                      {icon} {item?.name}
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
              <Spin spinning={loading}>
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
                  <ProcessList
                    data={filteredData}
                    folder={folder}
                    selection={selectedRowKeys}
                    setSelectionElements={setSelectedRowElements}
                    selectedElements={selectedRowElements}
                    // TODO: Replace with server component loading state
                    //isLoading={isLoading}
                    onExportProcess={(id) => setOpenExportModal(true)}
                    setShowMobileMetaData={setShowMobileMetaData}
                    processActions={processActions}
                  />
                )}
              </Spin>
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
        initialData={copySelection
          .filter((item) => item.type !== 'folder')
          .map((process) => ({
            name: `${process.name.value} (Copy)`,
            description: process.description.value,
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
            name: process.name.value,
            description: process.description.value,
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
      <AddUserControls name={'process-list'} />
      <FolderModal
        open={!!updateFolderModal}
        close={() => setUpdateFolderModal(undefined)}
        spaceId={space.spaceId}
        parentId={folder.id}
        onSubmit={updateFolder}
        modalProps={{ title: 'Edit folder', okButtonProps: { loading: updatingFolder } }}
        initialValues={updateFolderModal}
      />
    </>
  );
};

export default Processes;
