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
} from 'antd';
import cn from 'classnames';
import {
  ExportOutlined,
  DeleteOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  PlusOutlined,
  ImportOutlined,
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

export type DragInfo =
  | { dragging: false }
  | { dragging: true; activeId: string; activeElement: InputItem };

//TODO stop using external process
export type ProcessListProcess = ListItem;

type InputItem = ProcessMetadata | (Folder & { type: 'folder' });
export type ListItem = ReplaceKeysWithHighlighted<InputItem, 'name' | 'description'>;

type ProcessesProps = {
  processes: InputItem[];
  folder: Folder;
};

const Processes = ({ processes, folder }: ProcessesProps) => {
  const ability = useAbilityStore((state) => state.ability);

  const [selectedRowElements, setSelectedRowElements] = useState<ProcessListProcess[]>([]);
  const selectedRowKeys = selectedRowElements.map((element) => element.id);
  const canDeleteSelected = selectedRowElements.every((element) => ability.can('delete', element));

  const router = useRouter();
  const { message } = App.useApp();

  const addPreferences = useUserPreferences.use.addPreferences();
  const iconView = useUserPreferences.use['icon-view-in-process-list']();

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
    setSelectedRowElements([]);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (openCopyModal || openExportModal || openEditModal) {
        return;
      }

      /* CTRL + A */
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        setSelectedRowElements(filteredData ?? []);
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

  return (
    <>
      <Dropdown
        menu={{
          items: [
            {
              key: 'create-process',
              label: <ProcessCreationButton wrapperElement="Create Process" />,
            },
            {
              key: 'create-folder',
              label: <FolderCreationButton wrapperElement="Create Folder" />,
            },
          ],
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
                    {breakpoint.xs ? null : (
                      <>
                        <ProcessCreationButton style={{ marginRight: '10px' }} type="primary">
                          {breakpoint.xl ? 'New Process' : 'New'}
                        </ProcessCreationButton>
                        <ProcessImportButton type="default">
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
                    await deleteProcesses([id]);
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
          .filter((process) => selectedRowKeys.includes(process.id))
          .map((process) => ({
            id: process.id,
            name: process.name.value,
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

// NOTE I plan to move this to a separate file
export function DraggableElementGenerator<TPropId extends string>(
  element: keyof ReactHTML,
  propId: TPropId,
) {
  type Props = ClassAttributes<HTMLElement> &
    HTMLAttributes<HTMLElement> & { [key in TPropId]: string };

  const DraggableElement = (props: Props) => {
    const {
      attributes,
      listeners,
      setNodeRef: setDraggableNodeRef,
      isDragging,
    } = useDraggable({ id: props[propId] });

    const { setNodeRef: setNodeRefDroppable, over } = useDroppable({
      id: props[propId],
    });

    const className = cn(
      {
        [styles.HoveredByFile]: !isDragging && over?.id === props[propId],
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
