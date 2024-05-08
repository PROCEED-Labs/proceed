'use client';

import { Button, Grid, Row, TableColumnsType, Tooltip } from 'antd';
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
import { useRouter } from 'next/navigation';
import styles from './item-list-view.module.scss';
import { generateDateString } from '@/lib/utils';
import { useUserPreferences } from '@/lib/user-preferences';
import { AuthCan, useEnvironment } from '@/components/auth-can';
import { ProcessListProcess } from './processes';
import ConfirmationButton from './confirmation-button';
import { Folder } from '@/lib/data/folder-schema';
import ElementList from './item-list-view';
import { contextMenuStore } from './processes/context-menu';
import { DraggableElementGenerator } from './processes/draggable-element';

const DraggableRow = DraggableElementGenerator('tr', 'data-row-key');

type ProcessListProps = PropsWithChildren<{
  data: ProcessListProcess[];
  folder: Folder;
  selection: Key[];
  selectedElements: ProcessListProcess[];
  setSelectionElements: Dispatch<SetStateAction<ProcessListProcess[]>>;
  setShowMobileMetaData: Dispatch<SetStateAction<boolean>>;
  onExportProcess: (process: ProcessListProcess) => void;
  onDeleteItem: (process: ProcessListProcess[]) => void;
  onEditItem: (process: ProcessListProcess) => void;
  onCopyItem: (process: ProcessListProcess) => void;
}>;

const ColumnHeader = [
  'Process Name',
  'Description',
  'Last Edited',
  'Created On',
  'File Size',
  'Owner',
];

const ProcessList: FC<ProcessListProps> = ({
  data,
  folder,
  selection,
  selectedElements,
  setSelectionElements,
  onExportProcess,
  onDeleteItem,
  onEditItem,
  onCopyItem,
  setShowMobileMetaData,
}) => {
  const router = useRouter();
  const space = useEnvironment();
  const breakpoint = Grid.useBreakpoint();

  const selectedColumns = useUserPreferences.use['process-list-columns-desktop']();

  const addPreferences = useUserPreferences.use.addPreferences();

  const setContextMenuItem = contextMenuStore((store) => store.setSelected);

  const favourites = [0];

  const showMobileMetaData = () => {
    setShowMobileMetaData(true);
  };

  const processListColumnsMobile = [
    'Favorites',
    'Process Name',
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
                    onCopyItem(record);
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
              <EditOutlined onClick={() => onEditItem(record)} />
            </Tooltip>
          </AuthCan>

          <AuthCan delete {...resource}>
            <Tooltip placement="top" title={'Delete'}>
              <ConfirmationButton
                title={`Delete ${record.type === 'folder' ? 'Folder' : 'Process'}`}
                description="Are you sure you want to delete the selected process?"
                onConfirm={() => onDeleteItem([record])}
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
    [onCopyItem, onDeleteItem, onEditItem, onExportProcess],
  );

  const columns: TableColumnsType<ProcessListProcess> = [
    {
      title: <StarOutlined />,
      dataIndex: 'id',
      key: 'Favorites',
      width: '40px',
      render: (id, _, index) =>
        id !== folder.parentId && (
          <StarOutlined
            style={{ color: favourites?.includes(index) ? '#FFD700' : undefined }}
            className={styles.HoverableTableCell}
          />
        ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'Process Name',
      // sorter: (a, b) => a.name.value.localeCompare(b.name.value),
      render: (_, record) => (
        <div
          className={
            breakpoint.xs
              ? styles.MobileTitleTruncation
              : breakpoint.xl
                ? styles.TitleTruncation
                : styles.TabletTitleTruncation
          }
          style={{
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            // TODO: color
            color: record.id === folder.parentId ? 'grey' : undefined,
            fontStyle: record.id === folder.parentId ? 'italic' : undefined,
          }}
        >
          {record.type === 'folder' ? <FolderFilled /> : <FileFilled />} {record.name.value}
        </div>
      ),
      responsive: ['xs', 'sm'],
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'Description',
      // sorter: (a, b) => a.description.value.localeCompare(b.description.value),
      render: (_, record) => (
        <div
          style={{
            maxWidth: '15vw',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {record.description.highlighted}
        </div>
      ),
      responsive: ['sm'],
    },
    {
      title: 'Last Edited',
      dataIndex: 'lastEdited',
      key: 'Last Edited',
      render: (date: Date) => generateDateString(date, true),
      // sorter: (a, b) => new Date(b.lastEdited).getTime() - new Date(a.lastEdited).getTime(),
      responsive: ['md'],
    },
    {
      title: 'Created On',
      dataIndex: 'createdOn',
      key: 'Created On',
      render: (date: Date) => generateDateString(date, false),
      // sorter: (a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime(),
      responsive: ['md'],
    },
    {
      title: 'File Size',
      key: 'File Size',
      sorter: (a, b) => (a < b ? -1 : 1),
      responsive: ['md'],
    },
    {
      title: 'Owner',
      dataIndex: 'owner',
      key: 'Owner',
      // sorter: (a, b) => a.owner!.localeCompare(b.owner || ''),
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

  const columnsFiltered = breakpoint.xl
    ? columns.filter((c) => selectedColumns.includes(c?.key as string))
    : columns.filter((c) => processListColumnsMobile.includes(c?.key as string));

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
          if (typeof cols === 'function') cols = cols(selectedColumns as string[]);

          addPreferences({ 'process-list-columns-desktop': cols });
        },
        selectedColumnTitles: selectedColumns as string[],
        allColumnTitles: ColumnHeader,
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
          onDoubleClick: () =>
            router.push(
              item.type === 'folder'
                ? `/${space.spaceId}/processes/folder/${item.id}`
                : `/${space.spaceId}/processes/${item.id}`,
            ),
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
