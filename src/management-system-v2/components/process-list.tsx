'use client';

import { Button, Grid, Row, TableColumnType, TableColumnsType, TableProps, Tooltip } from 'antd';
import {
  useCallback,
  FC,
  PropsWithChildren,
  Dispatch,
  SetStateAction,
  Key,
  ReactElement,
} from 'react';
import {
  CopyOutlined,
  ExportOutlined,
  EditOutlined,
  DeleteOutlined,
  StarOutlined,
  InfoCircleOutlined,
  FolderOutlined as FolderFilled,
  FileOutlined as FileFilled,
} from '@ant-design/icons';
import styles from './item-list-view.module.scss';
import { generateDateString } from '@/lib/utils';
import { useUserPreferences } from '@/lib/user-preferences';
import { AuthCan } from '@/components/auth-can';
import { ProcessActions, ProcessListProcess } from './processes';
import ConfirmationButton from './confirmation-button';
import { Folder } from '@/lib/data/folder-schema';
import ElementList from './item-list-view';
import { useColumnWidth } from '@/lib/useColumnWidth';
import SpaceLink from './space-link';
import useFavouriteProcesses from '@/lib/useFavouriteProcesses';
import FavouriteStar from './favouriteStar';
import { contextMenuStore } from './processes/context-menu';
import { DraggableElementGenerator } from './processes/draggable-element';

/** respects sorting function, but always keeps folders at the beginning */
function folderAwareSort(sortFunction: (a: ProcessListProcess, b: ProcessListProcess) => number) {
  const sorter: TableColumnType<ProcessListProcess>['sorter'] = (a, b, sortOrder) => {
    const factor = sortOrder === 'ascend' ? 1 : -1;
    if (a.type === 'folder' && b.type !== 'folder') {
      return factor * -1;
    } else if (a.type !== 'folder' && b.type === 'folder') {
      return factor;
    } else {
      return sortFunction(a, b);
    }
  };

  return sorter;
}

export function ProcessListItemIcon({ item }: { item: { type: ProcessListProcess['type'] } }) {
  return item.type === 'folder' ? <FolderFilled /> : <FileFilled />;
}

type BaseProcessListProps = PropsWithChildren<{
  data: ProcessListProcess[];
  folder: Folder;
  elementSelection?: {
    selectedElements: ProcessListProcess[];
    setSelectionElements: (action: SetStateAction<ProcessListProcess[]>) => void;
  };
  setShowMobileMetaData?: Dispatch<SetStateAction<boolean>>;
  onExportProcess?: (process: ProcessListProcess) => void;
  tableProps?: TableProps<ProcessListProcess>;
  processActions?: ProcessActions;
  columnCustomRenderer?: {
    [columnKey: string]: (id: any, record: ProcessListProcess, index: number) => JSX.Element;
  };
}>;

const BaseProcessList: FC<BaseProcessListProps> = ({
  data,
  folder,
  elementSelection,
  onExportProcess = () => {},
  tableProps,
  processActions: { deleteItems, editItem, copyItem } = {
    deleteItems: () => {},
    editItem: () => {},
    copyItem: () => {},
  },
  setShowMobileMetaData,
  columnCustomRenderer = {},
}) => {
  const breakpoint = Grid.useBreakpoint();

  const selectedColumns = useUserPreferences.use['columns-in-table-view-process-list']();

  const addPreferences = useUserPreferences.use.addPreferences();
  const { favourites: favProcesses } = useFavouriteProcesses();

  const showMobileMetaData = () => {
    setShowMobileMetaData?.(true);
  };

  const processListColumnsMobile = [
    'Favorites',
    'Name',
    'Description',
    'Last Edited',
    'Meta Data Button',
  ];

  const actionBarGenerator = useCallback(
    (record: ProcessListProcess) => {
      const resource = record.type === 'folder' ? { Folder: record } : { Process: record };
      return (
        <>
          {record.type !== 'folder' && (
            <AuthCan {...resource} create>
              <Tooltip placement="top" title={'Copy'}>
                <CopyOutlined
                  onClick={(e) => {
                    e.stopPropagation();
                    copyItem([record]);
                  }}
                />
              </Tooltip>
            </AuthCan>
          )}

          {record.type !== 'folder' && (
            <Tooltip placement="top" title={'Export'}>
              <ExportOutlined onClick={() => onExportProcess(record)} />
            </Tooltip>
          )}

          <AuthCan {...resource} update>
            <Tooltip placement="top" title={'Edit'}>
              <EditOutlined onClick={() => editItem(record)} />
            </Tooltip>
          </AuthCan>

          <AuthCan delete {...resource}>
            <Tooltip placement="top" title={'Delete'}>
              <ConfirmationButton
                title={`Delete ${record.type === 'folder' ? 'Folder' : 'Process'}`}
                description="Are you sure you want to delete the selected process?"
                onConfirm={() => deleteItems([record])}
                buttonProps={{
                  icon: <DeleteOutlined />,
                  type: 'text',
                }}
              />
            </Tooltip>
          </AuthCan>
        </>
      );
    },
    [copyItem, deleteItems, editItem, onExportProcess],
  );

  let columns: TableColumnsType<ProcessListProcess> = [
    {
      title: <StarOutlined />,
      dataIndex: 'id',
      key: 'Favorites',
      width: '40px',
      render: (id, _, index) =>
        id !== folder.parentId && <FavouriteStar id={id} className={styles.HoverableTableCell} />,
      sorter: folderAwareSort((a, b) =>
        favProcesses?.includes(a.id) && favProcesses?.includes(b.id)
          ? 0
          : favProcesses?.includes(a.id)
            ? -1
            : 1,
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'Name',
      ellipsis: true,
      sorter: folderAwareSort((a, b) => a.name.value.localeCompare(b.name.value)),
      render: (_, record) => (
        <SpaceLink
          href={
            record.type === 'folder' ? `/processes/folder/${record.id}` : `/processes/${record.id}`
          }
          style={{
            color: 'inherit' /* or any color you want */,
            textDecoration: 'none' /* removes underline */,
            display: 'block',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          <div
            className={
              breakpoint.xs
                ? styles.MobileTitleTruncation
                : breakpoint.xl
                  ? styles.TitleTruncation
                  : styles.TabletTitleTruncation
            }
            style={{
              // overflow: 'hidden',
              // whiteSpace: 'nowrap',
              // textOverflow: 'ellipsis',
              // TODO: color
              color: record.id === folder.parentId ? 'grey' : undefined,
              fontStyle: record.id === folder.parentId ? 'italic' : undefined,
            }}
          >
            <ProcessListItemIcon item={record} /> {record.name.highlighted}
          </div>
        </SpaceLink>
      ),
      responsive: ['xs', 'sm'],
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'Description',
      render: (_, record) => (
        <SpaceLink
          href={
            record.type === 'folder' ? `/processes/folder/${record.id}` : `/processes/${record.id}`
          }
          style={{
            color: 'inherit' /* or any color you want */,
            textDecoration: 'none' /* removes underline */,
            display: 'block',
          }}
        >
          {/* <div
            style={{
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          > */}
          {(record.description.value ?? '').length == 0 ? (
            <>&emsp;</>
          ) : (
            record.description.highlighted
          )}
          {/* Makes the link-cell clickable, when there is no description */}
          {/* </div> */}
        </SpaceLink>
      ),
      responsive: ['sm'],
    },
    {
      title: 'Last Edited',
      dataIndex: 'lastEditedOn',
      key: 'Last Edited',
      render: (date: string) => generateDateString(date, true),
      sorter: folderAwareSort((a, b) => b.lastEditedOn!.getTime() - a.lastEditedOn!.getTime()),
      responsive: ['md'],
    },
    {
      title: 'Created On',
      dataIndex: 'createdOn',
      key: 'Created On',
      render: (date: Date) => generateDateString(date, false),
      sorter: folderAwareSort((a, b) => b.createdOn!.getTime() - a.createdOn!.getTime()),
      responsive: ['md'],
    },
    {
      title: 'File Size',
      key: 'File Size',
      sorter: folderAwareSort((a, b) => (a < b ? -1 : 1)),
      responsive: ['md'],
    },
    {
      title: 'Owner',
      dataIndex: 'owner',
      key: 'Owner',
      render: (_, item) => (item.type === 'folder' ? item.createdBy : item.creatorId),
      sorter: folderAwareSort((a, b) =>
        (a.type === 'folder' ? a.createdBy ?? '' : a.creatorId).localeCompare(
          b.type === 'folder' ? b.createdBy ?? '' : b.creatorId,
        ),
      ),
      responsive: ['md'],
    },
    {
      fixed: 'right',
      width: 160,
      dataIndex: 'id',
      key: 'Meta Data Button',
      title: '',
      render: (id, record, index) =>
        id !== folder.parentId && (
          <Button style={{ float: 'right' }} type="text" onClick={showMobileMetaData}>
            <InfoCircleOutlined />
          </Button>
        ),
      responsive: breakpoint.xl ? ['xs'] : ['xs', 'sm'],
    },
  ];

  columns = columns.map((column) => ({
    ...column,
    render: columnCustomRenderer[column.key as string] || column.render,
  }));

  let columnsFiltered = breakpoint.xl
    ? columns.filter((c) => selectedColumns.map((col: any) => col.name).includes(c?.key as string))
    : columns.filter((c) => processListColumnsMobile.includes(c?.key as string));

  /* Add functionality for changing width of columns */
  columnsFiltered = useColumnWidth(columnsFiltered, 'columns-in-table-view-process-list', [
    'Favorites',
  ]);

  return (
    <ElementList
      data={data}
      columns={columnsFiltered}
      elementSelection={elementSelection}
      selectableColumns={{
        setColumnTitles: (cols) => {
          if (typeof cols === 'function')
            cols = cols(
              selectedColumns.map((col: any) => col.name) as string[],
            ); /* TODO: When are cols a function -> cols need to be in preference format */

          /* Add other properties and add to preferences */
          const propcols = cols.map((col: string) => ({
            name: col,
            width:
              (selectedColumns.find((c: any) => c.name === col)?.width as string) /* | number */ ||
              'auto',
          }));
          addPreferences({ 'columns-in-table-view-process-list': propcols });
        },
        selectedColumnTitles: selectedColumns.map((col: any) => col.name) as string[],
        allColumnTitles: ['Description', 'Last Edited', 'Created On', 'File Size', 'Owner'],
        columnProps: {
          width: 'fit-content',
          responsive: ['xl'],
          render: (id, record, index) =>
            columnCustomRenderer['customProps']
              ? columnCustomRenderer['customProps'](id, record, index)
              : id !== folder.parentId && (
                  <Row justify="space-evenly" className={styles.HoverableTableCell}>
                    {actionBarGenerator(record)}
                  </Row>
                ),
        },
      }}
      tableProps={tableProps}
    />
  );
};

const DraggableRow = DraggableElementGenerator('tr', 'data-row-key');

type ProcessManagementListProps = PropsWithChildren<{
  data: ProcessListProcess[];
  folder: Folder;
  selection: Key[];
  selectedElements: ProcessListProcess[];
  setSelectionElements: Dispatch<SetStateAction<ProcessListProcess[]>>;
  setShowMobileMetaData: Dispatch<SetStateAction<boolean>>;
  onExportProcess: (process: ProcessListProcess) => void;
  processActions: ProcessActions;
}>;

const ProcessManagementList: FC<ProcessManagementListProps> = ({
  data,
  folder,
  selection,
  selectedElements,
  setSelectionElements,
  onExportProcess,
  processActions,
  setShowMobileMetaData,
}) => {
  const setContextMenuItem = contextMenuStore((store) => store.setSelected);

  return (
    <BaseProcessList
      data={data}
      folder={folder}
      elementSelection={{ selectedElements, setSelectionElements }}
      setShowMobileMetaData={setShowMobileMetaData}
      onExportProcess={onExportProcess}
      processActions={processActions}
      tableProps={{
        onRow: (item) => ({
          // onDoubleClick: () =>
          //   router.push(
          //     item.type === 'folder'
          //       ? `/${space.spaceId}/processes/folder/${item.id}`
          //       : `/${space.spaceId}/processes/${item.id}`,
          //   ),
          onContextMenu: () => {
            if (selection.includes(item.id)) {
              setContextMenuItem(selectedElements);
            } else {
              setSelectionElements([item]);
              setContextMenuItem([item]);
            }
          },
        }),
        components: {
          body: {
            row: DraggableRow,
          },
        },
      }}
    ></BaseProcessList>
  );
};

type ProcessDeploymentListProps = PropsWithChildren<{
  data: ProcessListProcess[];
  folder: Folder;
  openFolder: (id: string) => void;
  deploymentButtons: (additionalProps: { processId: string }) => ReactElement;
}>;

const ProcessDeploymentList: FC<ProcessDeploymentListProps> = ({
  data,
  folder,
  openFolder,
  deploymentButtons,
}) => {
  const breakpoint = Grid.useBreakpoint();

  return (
    <BaseProcessList
      data={data}
      folder={folder}
      columnCustomRenderer={{
        ['Favorites']: (id) => {
          return id !== folder.parentId ? (
            <FavouriteStar viewOnly id={id} className={styles.HoverableTableCell} />
          ) : (
            <></>
          );
        },
        ['Name']: (_, record) => {
          return (
            <div
              className={
                breakpoint.xs
                  ? styles.MobileTitleTruncation
                  : breakpoint.xl
                    ? styles.TitleTruncation
                    : styles.TabletTitleTruncation
              }
              style={{
                color: record.id === folder.parentId ? 'grey' : undefined,
                fontStyle: record.id === folder.parentId ? 'italic' : undefined,
                cursor: record.type === 'folder' ? 'pointer' : undefined,
              }}
              onClick={
                record.type === 'folder'
                  ? () => {
                      openFolder(record.id);
                    }
                  : undefined
              }
            >
              <ProcessListItemIcon item={record} /> {record.name.highlighted}
            </div>
          );
        },
        ['Description']: (_, record) => {
          return (
            <div>
              {(record.description.value ?? '').length == 0 ? (
                <>&emsp;</>
              ) : (
                record.description.highlighted
              )}
            </div>
          );
        },
        ['Meta Data Button']: (_, record) => {
          return record.type !== 'folder' ? (
            <>{deploymentButtons({ processId: record.id })}</>
          ) : (
            <></>
          );
        },
        ['customProps']: (_, record) => {
          return record.type !== 'folder' ? (
            <>{deploymentButtons({ processId: record.id })}</>
          ) : (
            <></>
          );
        },
      }}
    ></BaseProcessList>
  );
};

export { ProcessManagementList, ProcessDeploymentList };

export default ProcessManagementList;
