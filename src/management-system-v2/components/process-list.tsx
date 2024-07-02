'use client';

import { Button, Grid, Row, TableColumnType, TableColumnsType, Tooltip } from 'antd';
import { useCallback, FC, PropsWithChildren, Key, Dispatch, SetStateAction } from 'react';
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
import { contextMenuStore } from './processes/context-menu';
import { DraggableElementGenerator } from './processes/draggable-element';
import { useResizeableColumnWidth } from '@/lib/useColumnWidth';
import SpaceLink from './space-link';
import useFavouriteProcesses from '@/lib/useFavouriteProcesses';
import FavouriteStar from './favouriteStar';

const DraggableRow = DraggableElementGenerator('tr', 'data-row-key');

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

type ProcessListProps = PropsWithChildren<{
  data: ProcessListProcess[];
  folder: Folder;
  selection: Key[];
  selectedElements: ProcessListProcess[];
  setSelectionElements: Dispatch<SetStateAction<ProcessListProcess[]>>;
  setShowMobileMetaData: Dispatch<SetStateAction<boolean>>;
  onExportProcess: (process: ProcessListProcess) => void;
  processActions: ProcessActions;
}>;

const ProcessList: FC<ProcessListProps> = ({
  data,
  folder,
  selection,
  selectedElements,
  setSelectionElements,
  onExportProcess,
  processActions: { deleteItems, editItem, copyItem },
  setShowMobileMetaData,
}) => {
  const breakpoint = Grid.useBreakpoint();

  const selectedColumns = useUserPreferences.use['columns-in-table-view-process-list']();

  const addPreferences = useUserPreferences.use.addPreferences();
  const { favourites: favProcesses } = useFavouriteProcesses();

  const setContextMenuItem = contextMenuStore((store) => store.setSelected);

  const showMobileMetaData = () => {
    setShowMobileMetaData(true);
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

  const columns: TableColumnsType<ProcessListProcess> = [
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
            // whiteSpace: 'nowrap',
            // textOverflow: 'ellipsis',
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
            {record.type === 'folder' ? <FolderFilled /> : <FileFilled />}
            <span>&nbsp;</span>
            {/* Wrapping whitespace in a element allows to determine the total width (for tooltip) */}
            {record.name.highlighted}
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
      dataIndex: 'lastEdited',
      key: 'Last Edited',
      render: (date: string) => generateDateString(date, true),
      sorter: folderAwareSort(
        (a, b) => new Date(b.lastEdited).getTime() - new Date(a.lastEdited).getTime(),
      ),
      responsive: ['md'],
    },
    {
      title: 'Created On',
      dataIndex: 'createdOn',
      key: 'Created On',
      render: (date: Date) => generateDateString(date, false),
      sorter: folderAwareSort(
        (a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime(),
      ),
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
      render: (_, item) => (item.type === 'folder' ? item.createdBy : item.owner),
      sorter: folderAwareSort((a, b) =>
        (a.type === 'folder' ? a.createdBy ?? '' : a.owner).localeCompare(
          b.type === 'folder' ? b.createdBy ?? '' : b.owner,
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
      render: (id) =>
        id !== folder.parentId && (
          <Button style={{ float: 'right' }} type="text" onClick={showMobileMetaData}>
            <InfoCircleOutlined />
          </Button>
        ),
      responsive: breakpoint.xl ? ['xs'] : ['xs', 'sm'],
    },
  ];

  let columnsFiltered = breakpoint.xl
    ? columns.filter((c) => selectedColumns.map((col: any) => col.name).includes(c?.key as string))
    : columns.filter((c) => processListColumnsMobile.includes(c?.key as string));

  /* Add functionality for changing width of columns */
  columnsFiltered = useResizeableColumnWidth(
    columnsFiltered,
    'columns-in-table-view-process-list',
    ['Favorites'],
  );

  return (
    <ElementList
      data={data}
      columns={columnsFiltered}
      elementSelection={{
        selectedElements,
        setSelectionElements: setSelectionElements,
      }}
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
          render: (id, record) =>
            id !== folder.parentId && (
              <Row justify="space-evenly" className={styles.HoverableTableCell}>
                {actionBarGenerator(record)}
              </Row>
            ),
        },
      }}
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
    />
  );
};

export default ProcessList;
