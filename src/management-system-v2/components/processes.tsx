'use client';

import styles from './processes.module.scss';
import React, {
  ComponentProps,
  HTMLAttributes,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  ClassAttributes,
  ReactHTML,
  useMemo,
} from 'react';
import {
  Space,
  Button,
  Tooltip,
  Grid,
  App,
  Drawer,
  FloatButton,
  Dropdown,
  Card,
  Badge,
  MenuProps,
} from 'antd';
import cn from 'classnames';
import {
  ExportOutlined,
  DeleteOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  PlusOutlined,
  ImportOutlined,
  ScissorOutlined,
  CopyOutlined,
  FolderAddOutlined,
  FolderOutlined,
  FileOutlined,
} from '@ant-design/icons';
import IconView from './process-icon-list';
import ProcessList from './process-list';
import MetaData, { MetaPanelRefType } from './process-info-card';
import ProcessExportModal from './process-export';
import Bar from './bar';
import ProcessCreationButton from './process-creation-button';
import { useUserPreferences } from '@/lib/user-preferences';
import { useAbilityStore } from '@/lib/abilityStore';
import useFuzySearch, { ReplaceKeysWithHighlighted } from '@/lib/useFuzySearch';
import { useRouter } from 'next/navigation';
import { copyProcesses, deleteProcesses, updateProcesses } from '@/lib/data/processes';
import ProcessModal from './process-modal';
import ConfirmationButton from './confirmation-button';
import ProcessImportButton from './process-import';
import { ProcessMetadata } from '@/lib/data/process-schema';
import MetaDataContent from './process-info-card-content';
import {
  CheckerType,
  useAddControlCallback,
  useControlStore,
  useControler,
} from '@/lib/controls-store';
import ResizableElement, { ResizableElementRefType } from './ResizableElement';
import { useEnvironment } from './auth-can';
import useFavouritesStore, { useInitialiseFavourites } from '@/lib/useFavouriteProcesses';
import { Folder } from '@/lib/data/folder-schema';
import FolderCreationButton from './folder-creation-button';
import { moveIntoFolder } from '@/lib/data/folders';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { create } from 'zustand';

export const contextMenuStore = create<{
  setSelected: (id?: string) => void;
  selected?: string;
}>((set) => ({
  setSelected: (id) => set({ selected: id }),
  selected: undefined,
}));

export type DragInfo =
  | { dragging: false }
  | { dragging: true; activeId: string; activeElement: InputItem };

//TODO stop using external process
export type ProcessListProcess = ListItem;

type InputItem = ProcessMetadata | (Folder & { type: 'folder' });
export type ListItem = ReplaceKeysWithHighlighted<InputItem, 'name' | 'description'>;

type ProcessesProps = {
  processes: InputItem[];
  favourites?: string[];
  folder: Folder;
};

const Processes = ({ processes: _processes, favourites, folder }: ProcessesProps) => {
  const processes = useMemo(() => {
    const newProcesses = [..._processes];

    if (folder.parentId)
      newProcesses.unshift({
        name: '< Parent Folder >',
        parentId: null,
        type: 'folder',
        id: folder.parentId,
        createdAt: '',
        createdBy: '',
        updatedAt: '',
        environmentId: '',
      });

    return newProcesses;
  }, [_processes]);

  const ability = useAbilityStore((state) => state.ability);
  const environment = useEnvironment();

  const favs = favourites ?? [];
  useInitialiseFavourites(favs);
  const { removeIfPresent: removeFromFavouriteProcesses } = useFavouritesStore();

  const [selectedRowElements, setSelectedRowElements] = useState<ProcessListProcess[]>([]);
  const selectedRowKeys = selectedRowElements.map((element) => element.id);
  const canDeleteSelected = selectedRowElements.every((element) => ability.can('delete', element));

  const router = useRouter();
  const { message } = App.useApp();

  const addPreferences = useUserPreferences.use.addPreferences();
  const iconView = useUserPreferences.use['icon-view-in-process-list']();

  const deleteSelectedProcesses = useCallback(async () => {
    try {
      const res = await deleteProcesses(selectedRowKeys as string[], environment.spaceId);
      // UserError
      if (res && 'error' in res) {
        return message.open({
          type: 'error',
          content: res.error.message,
        });
      } else {
        // Success -> Remove from favourites if stared
        removeFromFavouriteProcesses(selectedRowKeys as string[]);
        // TODO: Remove from favourites for all users
      }
    } catch (e) {
      // Unkown server error or was not sent from server (e.g. network error)
      return message.open({
        type: 'error',
        content: 'Someting went wrong while submitting the data',
      });
    }
    setSelectedRowElements([]);
    router.refresh();
  }, [environment.spaceId, message, router, selectedRowKeys]);

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

      {canDeleteSelected && (
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
      )}
    </>
  );

  const { filteredData, setSearchQuery: setSearchTerm } = useFuzySearch({
    data: processes ?? [],
    keys: ['name', 'description'],
    highlightedKeys: ['name', 'description'],
    transformData: (matches) => matches.map((match) => match.item),
  });
  filteredData.sort((a, b) => {
    if (a.type === 'folder' && b.type == 'folder') return 0;
    if (a.type === 'folder') return -1;
    if (b.type === 'folder') return 1;

    return 0;
  });

  const CollapsePannelRef = useRef<MetaPanelRefType>(null);

  const deselectAll = () => {
    setSelectedRowElements([]);
  };
  const [copySelection, setCopySelection] = useState<React.Key[]>(selectedRowKeys);

  /* User-Controls */
  // const modalOpened = openCopyModal || openExportModal || openEditModal;
  const controlChecker: CheckerType = {
    selectall: (e) => e.ctrlKey && e.key === 'a',
    esc: (e) => e.key === 'Escape',
    del: (e) => e.key === 'Delete' && ability.can('delete', 'Process'),
    copy: (e) => (e.ctrlKey || e.metaKey) && e.key === 'c' && ability.can('create', 'Process'),
    paste: (e) => (e.ctrlKey || e.metaKey) && e.key === 'v' && ability.can('create', 'Process'),
    controlenter: (e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter',
    shiftenter: (e) => e.shiftKey && e.key === 'Enter',
    enter: (e) => !(e.ctrlKey || e.metaKey) && e.key === 'Enter',
    cut: (e) => (e.ctrlKey || e.metaKey) && e.key === 'x' /* TODO: ability */,
    export: (e) => (e.ctrlKey || e.metaKey) && e.key === 'e',
    import: (e) => (e.ctrlKey || e.metaKey) && e.key === 'i',
  };
  useControler('process-list', controlChecker);

  useAddControlCallback(
    'process-list',
    'selectall',
    (e) => {
      e.preventDefault();
      setSelectedRowElements(filteredData ?? []);
    },
    { dependencies: [processes] },
  );
  useAddControlCallback('process-list', 'esc', deselectAll);

  useAddControlCallback('process-list', 'del', () => setOpenDeleteModal(true));

  useAddControlCallback('process-list', 'copy', () => setCopySelection(selectedRowKeys));

  useAddControlCallback('process-list', 'paste', () => setOpenCopyModal(true));

  useAddControlCallback(
    'process-list',
    'export',
    () => {
      if (selectedRowKeys.length) setOpenExportModal(true);
    },
    { dependencies: [selectedRowKeys.length] },
  );

  // NOTE: I plan to move this to a separate file
  const [dragInfo, setDragInfo] = useState<DragInfo>({ dragging: false });
  const [movingItem, startMovingItemTransition] = useTransition();
  const dndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const dragEndHanler: ComponentProps<typeof DndContext>['onDragEnd'] = (e) => {
    setDragInfo({ dragging: false });

    // prevent parent folder from being dragged
    if (e.active.id === folder.parentId) return;

    const active = processes.find((item) => item.id === e.active.id);
    const over = processes.find((item) => item.id === e.over?.id);

    if (!active || !over) return;
    if (over.type != 'folder' || active.id === over.id) return;

    // don't allow to move selected items into themselves
    if (selectedRowKeys.length > 0 && selectedRowKeys.includes(over.id)) return;

    startMovingItemTransition(async () => {
      try {
        const items =
          selectedRowKeys.length > 0
            ? selectedRowElements.map((element) => ({
                type: element.type,
                id: element.id,
              }))
            : [{ type: active.type, id: active.id }];

        const response = await moveIntoFolder(items, over.id);

        if (response && 'error' in response) throw new Error();

        router.refresh();
      } catch (e) {
        message.open({
          type: 'error',
          content: `Someting went wrong while moving the ${active.type}`,
        });
      }
    });
  };

  const dragStartHandler: ComponentProps<typeof DndContext>['onDragEnd'] = (e) => {
    if (selectedRowKeys.length > 0 && !selectedRowKeys.includes(e.active.id as string))
      setSelectedRowElements([]);

    setDragInfo({
      dragging: true,
      activeId: e.active.id as string,
      activeElement: processes.find((item) => item.id === e.active.id) as InputItem,
    });
  };

  const selectedContextMenuItemId = contextMenuStore((store) => store.selected);
  const selectedContextMenuItem = selectedContextMenuItemId
    ? processes.find((item) => item.id === selectedContextMenuItemId)
    : undefined;

  const contextMenuItems: MenuProps['items'] = selectedContextMenuItem
    ? [
        {
          type: 'group',
          label: selectedContextMenuItem.name,
          children: [
            {
              key: 'cut-selected',
              label: 'Cut',
              icon: <ScissorOutlined />,
            },
            {
              key: 'copy-selected',
              label: 'Copy',
              icon: <CopyOutlined />,
            },
            {
              key: 'delete-selected',
              label: 'Delete',
              icon: <DeleteOutlined />,
            },
            {
              key: 'move-selected',
              label: 'Move',
              icon: <FolderAddOutlined />,
            },
            {
              key: 'item-divider',
              type: 'divider',
            },
          ],
        },
      ]
    : [];

  const defaultDropdownItems = [
    {
      key: 'create-process',
      label: <ProcessCreationButton wrapperElement="Create Process" />,
      icon: <FileOutlined />,
    },
    {
      key: 'create-folder',
      label: <FolderCreationButton wrapperElement="Create Folder" />,
      icon: <FolderOutlined />,
    },
  ];
  return (
    <>
      <Dropdown
        menu={{
          items: [...contextMenuItems, ...defaultDropdownItems],
        }}
        trigger={['contextMenu']}
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
                        <span className={styles.Icons}>{actionBar}</span>
                      </span>
                    ) : undefined}
                  </span>

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
                    {/* {breakpoint.xl ? (
          <Button
          type="text"
          onClick={() => {
          if (collapseCard) collapseCard();
          }}
          >
          <InfoCircleOutlined />
          </Button>
          ) : undefined} */}
                  </span>
                </span>
              }
              searchProps={{
                onChange: (e) => setSearchTerm(e.target.value),
                onPressEnter: (e) => setSearchTerm(e.currentTarget.value),
                placeholder: 'Search Processes ...',
              }}
            />

            <DndContext
              // Without an id Next throws a id mismatch
              id="processes-dnd-context"
              modifiers={[snapCenterToCursor]}
              sensors={dndSensors}
              onDragEnd={dragEndHanler}
              onDragStart={dragStartHandler}
            >
              {iconView ? (
                <IconView
                  data={filteredData}
                  selection={selectedRowKeys}
                  setSelectionElements={setSelectedRowElements}
                  setShowMobileMetaData={setShowMobileMetaData}
                />
              ) : (
                <ProcessList
                  data={filteredData}
                  folder={folder}
                  dragInfo={dragInfo}
                  setSelectionElements={setSelectedRowElements}
                  selection={selectedRowKeys}
                  isLoading={movingItem}
                  // TODO: Replace with server component loading state
                  //isLoading={isLoading}
                  onExportProcess={(id) => {
                    setOpenExportModal(true);
                  }}
                  onDeleteProcess={async ({ id }) => {
                    await deleteProcesses([id], environment.spaceId);
                    setSelectedRowElements([]);
                    router.refresh();
                  }}
                  onCopyProcess={(process) => {
                    setOpenCopyModal(true);
                    setSelectedRowElements([process]);
                  }}
                  onEditProcess={(process) => {
                    setOpenEditModal(true);
                    setSelectedRowElements([process]);
                  }}
                  setShowMobileMetaData={setShowMobileMetaData}
                />
              )}
              <DragOverlay dropAnimation={null}>
                {dragInfo.dragging ? (
                  <Badge
                    count={selectedRowElements.length > 1 ? selectedRowElements.length : undefined}
                  >
                    <Card
                      style={{
                        width: 'fit-content',
                        cursor: 'move',
                      }}
                    >
                      {dragInfo.activeElement.type === 'folder' ? (
                        <FolderOutlined />
                      ) : (
                        <FileOutlined />
                      )}{' '}
                      {dragInfo.activeElement.name}
                    </Card>
                  </Badge>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>

          {/*Meta Data Panel*/}
          {breakpoint.xl ? (
            <MetaData selectedElement={selectedRowElements.at(-1)} ref={CollapsePannelRef} />
          ) : (
            <Drawer
              onClose={closeMobileMetaData}
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
      </Dropdown>

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
          .filter((process) => selectedRowKeys.includes(process.id) && process.type !== 'folder')
          .map((process) => ({
            name: `${process.name.value} (Copy)`,
            description: process.description.value,
            originalId: process.id,
            folderId: folder.id,
          }))}
        onSubmit={async (values) => {
          const res = await copyProcesses(values, environment.spaceId);
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
          const res = await updateProcesses(values, environment.spaceId);
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

// NOTE: I plan to move this to a separate file
export function DraggableElementGenerator<TPropId extends string>(
  element: keyof ReactHTML,
  propId: TPropId,
) {
  type Props = ClassAttributes<HTMLElement> &
    HTMLAttributes<HTMLElement> & { [key in TPropId]: string };

  const DraggableElement = (props: Props) => {
    const elementId = props[propId] ?? '';
    const {
      attributes,
      listeners,
      setNodeRef: setDraggableNodeRef,
      isDragging,
    } = useDraggable({ id: elementId });

    const { setNodeRef: setNodeRefDroppable, over } = useDroppable({
      id: elementId,
    });

    const className = cn(
      {
        [styles.HoveredByFile]: !isDragging && over?.id === elementId,
        [styles.RowBeingDragged]: isDragging,
      },
      props.className,
    );

    return React.createElement(element, {
      ...props,
      ...attributes,
      ...listeners,
      ref(elementRef) {
        setDraggableNodeRef(elementRef);
        setNodeRefDroppable(elementRef);
      },
      className,
    });
  };

  DraggableElement.displayName = 'DraggableRow';

  return DraggableElement;
}
