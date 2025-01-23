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
  useEffect,
  useState,
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
import { generateDateString, generateTableDateString } from '@/lib/utils';
import { useUserPreferences } from '@/lib/user-preferences';
import { AuthCan } from '@/components/auth-can';
import { ProcessActions, ProcessListProcess } from './processes';
import ConfirmationButton from './confirmation-button';
import { Folder } from '@/lib/data/folder-schema';
import ElementList from './item-list-view';
import { useResizeableColumnWidth } from '@/lib/useColumnWidth';
import SpaceLink from './space-link';
import useFavouriteProcesses from '@/lib/useFavouriteProcesses';
import FavouriteStar from './favouriteStar';
import { contextMenuStore } from './processes/context-menu';
import { DraggableElementGenerator } from './processes/draggable-element';
import classNames from 'classnames';
import { set } from 'zod';
import { getUserById } from '@/lib/data/db/iam/users';

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
  idUsernameMapping?: Record<string, string>;
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
  idUsernameMapping = {},
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

  const mapIdToUsername = useCallback(
    (id: string | undefined | null) => {
      console.log('USERMAPPING', idUsernameMapping, id);
      if (!id) return 'Could not load username';
      return idUsernameMapping[id] ?? 'Could not load username';
    },
    [idUsernameMapping],
  );

  /* This is the 'action' buttons in the row itself (visible on hover) */
  const actionBarGenerator = useCallback(
    (record: ProcessListProcess) => {
      const resource = record.type === 'folder' ? { Folder: record } : { Process: record };
      return (
        // View Process Documentation, Open Editor, Change Meta Data, Release Process, Share

        <>
          {record.type !== 'folder' && (
            <AuthCan {...resource} create>
              <Tooltip placement="top" title={'Copy'}>
                <Button
                  className={classNames(styles.ActionButton)}
                  type="text"
                  icon={<CopyOutlined />}
                  onClick={() => copyItem([record])}
                />
              </Tooltip>
            </AuthCan>
          )}
          {record.type !== 'folder' && (
            <Tooltip placement="top" title={'Export'}>
              <Button
                className={classNames(styles.ActionButton)}
                type="text"
                icon={<ExportOutlined />}
                onClick={() => onExportProcess(record)}
              />
            </Tooltip>
          )}

          <AuthCan {...resource} update>
            <Tooltip placement="top" title={'Edit'}>
              <Button
                className={classNames(styles.ActionButton)}
                type="text"
                icon={<EditOutlined />}
                onClick={() => editItem(record)}
              />
            </Tooltip>
          </AuthCan>

          <AuthCan delete {...resource}>
            <ConfirmationButton
              tooltip="Delete"
              title={`Delete ${record.type === 'folder' ? 'Folder' : 'Process'}`}
              description="Are you sure you want to delete the selected process?"
              onConfirm={() => deleteItems([record])}
              buttonProps={{
                icon: <DeleteOutlined />,
                type: 'text',
                className: styles.ActionButton,
              }}
            />
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
            // whiteSpace: 'nowrap',
            // textOverflow: 'ellipsis',
            padding: '5px 0px',
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
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
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
            padding: '5px 0px',
          }}
        >
          <div
            style={{
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {(record.description.value ?? '').length == 0 ? (
              <>&emsp;</>
            ) : (
              record.description.highlighted
            )}
            {/* Makes the link-cell clickable, when there is no description */}
          </div>
        </SpaceLink>
      ),
      responsive: ['sm'],
    },
    {
      title: 'Last Edited',
      dataIndex: 'lastEditedOn',
      key: 'Last Edited',
      render: (date: string, record) => (
        <>
          <SpaceLink
            href={
              record.type === 'folder'
                ? `/processes/folder/${record.id}`
                : `/processes/${record.id}`
            }
            style={{
              color: 'inherit' /* or any color you want */,
              textDecoration: 'none' /* removes underline */,
              display: 'block',
              padding: '5px 0px',
            }}
          >
            <Tooltip title={generateDateString(date, true)}>
              {generateTableDateString(date)}
            </Tooltip>
          </SpaceLink>
        </>
      ),
      sorter: folderAwareSort((a, b) => b.lastEditedOn!.getTime() - a.lastEditedOn!.getTime()),
      responsive: ['md'],
    },
    {
      title: 'Created On',
      dataIndex: 'createdOn',
      key: 'Created On',
      render: (date: Date, record) => (
        <>
          <SpaceLink
            href={
              record.type === 'folder'
                ? `/processes/folder/${record.id}`
                : `/processes/${record.id}`
            }
            style={{
              color: 'inherit' /* or any color you want */,
              textDecoration: 'none' /* removes underline */,
              display: 'block',
              padding: '5px 0px',
            }}
          >
            {generateTableDateString(date)},
          </SpaceLink>
        </>
      ),
      defaultSortOrder: 'descend',
      sorter: folderAwareSort((a, b) => b.createdOn!.getTime() - a.createdOn!.getTime()),
      responsive: ['md'],
    },
    // {
    //   title: 'File Size',
    //   key: 'File Size',
    //   // dataIndex:  /* TODO: */,
    //   // sorter: folderAwareSort((a, b) => (parseInt(a) < parseInt(b) ? -1 : 1)),
    //   responsive: ['md'],
    //   render: (_, __, rowIndex) => <>{rowIndex} MB</> /* TODO: */,
    // },
    {
      title: 'Created By',
      dataIndex: 'owner',
      key: 'Owner',
      render: (_, item) => {
        console.log('ITEM', item);
        const id =
          item.type === 'folder'
            ? mapIdToUsername(item.createdBy)
            : mapIdToUsername(item.creatorId);

        // return await getUserById(id).username: string;
        return (
          <>
            <SpaceLink
              href={
                item.type === 'folder' ? `/processes/folder/${item.id}` : `/processes/${item.id}`
              }
              style={{
                color: 'inherit' /* or any color you want */,
                textDecoration: 'none' /* removes underline */,
                display: 'block',
                padding: '5px 0px',
              }}
            >
              {id}
            </SpaceLink>
          </>
        );
      },
      sorter: folderAwareSort((a, b) =>
        (a.type === 'folder' ? a.createdBy ?? '' : a.creatorId).localeCompare(
          b.type === 'folder' ? b.createdBy ?? '' : b.creatorId,
        ),
      ),
      responsive: ['md'],
    },
    {
      title: 'Responsibility',
      dataIndex: 'owner',
      key: 'Responsibility',
      render: (_, item) => (
        <>
          <SpaceLink
            href={item.type === 'folder' ? `/processes/folder/${item.id}` : `/processes/${item.id}`}
            style={{
              color: 'inherit' /* or any color you want */,
              textDecoration: 'none' /* removes underline */,
              display: 'block',
              padding: '5px 0px',
            }}
          >
            {item.type === 'folder' ? '' : 'tbd'}
          </SpaceLink>
        </>
      ),
      sorter: folderAwareSort((a, b) =>
        (a.type === 'folder' ? '' : 'tbd').localeCompare(b.type === 'folder' ? '' : ''),
      ),
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
  columnsFiltered = useResizeableColumnWidth(
    columnsFiltered,
    'columns-in-table-view-process-list',
    ['Favorites'],
  );

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
        allColumnTitles: [
          'Description',
          'Last Edited',
          'Created On',
          /* 'File Size', */ 'Owner',
          'Responsibility',
        ],
        columnProps: {
          width: '200px',
          responsive: ['xl'],
          render: (id, record, index) =>
            columnCustomRenderer['customProps']
              ? columnCustomRenderer['customProps'](id, record, index)
              : id !== folder.parentId && (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                    }}
                  >
                    <span style={{ flex: 1 }} />
                    <Row justify="end" wrap={false} className={styles.HoverableTableCell}>
                      {actionBarGenerator(record)}
                    </Row>
                    <span style={{ width: '15%' }} />
                  </div>
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
  idUsernameMapping?: Record<string, string>;
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
  idUsernameMapping = {},
  folder,
  selection,
  selectedElements,
  setSelectionElements,
  onExportProcess,
  processActions,
  setShowMobileMetaData,
}) => {
  const setContextMenuItem = contextMenuStore((store) => store.setSelected);
  const metaPanelisOpened = useUserPreferences.use['process-meta-data']().open;

  const [scrollY, setScrollY] = useState('400px');
  useEffect(() => {
    if (window)
      setScrollY(
        `${window.innerHeight - 32 /* Footer */ - 64 /* Header */ - 82 /* Table-Search etc */ - 60 /* Table-head */ - 60 /* Table-Footer / Pagination */}px`,
      );
  }, []);

  return (
    <BaseProcessList
      data={data}
      idUsernameMapping={idUsernameMapping}
      folder={folder}
      elementSelection={{ selectedElements, setSelectionElements }}
      setShowMobileMetaData={setShowMobileMetaData}
      onExportProcess={onExportProcess}
      processActions={processActions}
      tableProps={{
        scroll: {
          y: scrollY,
        },
        pagination: { position: ['bottomCenter'], pageSize: 20 },
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
              // setSelectionElements([item]);
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
  deploymentButtons: (additionalProps: { process: ProcessListProcess }) => ReactElement;
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
          return record.type !== 'folder' ? <>{deploymentButtons({ process: record })}</> : <></>;
        },
        ['customProps']: (_, record) => {
          return record.type !== 'folder' ? <>{deploymentButtons({ process: record })}</> : <></>;
        },
      }}
    ></BaseProcessList>
  );
};

export { ProcessManagementList, ProcessDeploymentList };

export default ProcessManagementList;
