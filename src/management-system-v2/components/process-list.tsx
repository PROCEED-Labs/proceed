'use client';

import {
  Badge,
  Button,
  Grid,
  Row,
  Space,
  TableColumnType,
  TableColumnsType,
  TableProps,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import React, {
  useCallback,
  FC,
  PropsWithChildren,
  Dispatch,
  SetStateAction,
  Key,
  ReactElement,
  useEffect,
  useState,
  useMemo,
} from 'react';
import {
  StarOutlined,
  InfoCircleOutlined,
  FolderOutlined as FolderFilled,
  ShareAltOutlined,
} from '@ant-design/icons';
import styles from './item-list-view.module.scss';
import { generateDateString, generateTableDateString } from '@/lib/utils';
import { useUserPreferences } from '@/lib/user-preferences';
import { AuthCan } from '@/components/auth-can';
import { ProcessListProcess, RowActions } from './processes/types';
import { Folder } from '@/lib/data/folder-schema';
import ElementList from './item-list-view';
import { useResizeableColumnWidth } from '@/lib/useColumnWidth';
import SpaceLink from './space-link';
import useFavouriteProcesses from '@/lib/useFavouriteProcesses';
import FavouriteStar from './favouriteStar';
import { contextMenuStore } from './processes/context-menu';
import { DraggableElementGenerator } from './processes/draggable-element';
import classNames from 'classnames';
import { GrDocumentUser } from 'react-icons/gr';
import { PiNotePencil } from 'react-icons/pi';
import { LuNotebookPen } from 'react-icons/lu';
import { BsFileEarmarkCheck } from 'react-icons/bs';
import usePotentialOwnerStore from '@/app/(dashboard)/[environmentId]/processes/[processId]/use-potentialOwner-store';
import ReleaseTag from './process-release-tag';

/** respects sorting function, but always keeps folders at the beginning */
function folderAwareSort(sortFunction: (a: ProcessListProcess, b: ProcessListProcess) => number) {
  const sorter: TableColumnType<ProcessListProcess>['sorter'] = (a, b, sortOrder) => {
    const factor = sortOrder === 'ascend' ? 1 : -1;
    /* Root Folder is always on top */
    if (a.type === 'folder' && a.parentId === null) {
      return factor * -1;
    } else if (b.type === 'folder' && b.parentId === null) {
      return factor;
    }
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
  return item.type === 'folder' ? <FolderFilled /> : '';
}

const ListEntryLink: React.FC<
  React.PropsWithChildren<{
    data: ProcessListProcess;
    style?: React.CSSProperties;
    className?: string;
    tooltip?: boolean | ReactNode;
  }>
> = ({ children, data, style, className, tooltip = true }) => {
  return (
    <SpaceLink
      href={data.type === 'folder' ? `/processes/folder/${data.id}` : `/processes/${data.id}`}
      className={className}
      style={{
        color: 'inherit' /* or any color you want */,
        textDecoration: 'none' /* removes underline */,
        display: 'block',
        padding: '5px 0px',
      }}
    >
      <Typography.Text
        className={className}
        style={style}
        ellipsis={{ tooltip: tooltip === true ? <>{children}</> : tooltip }}
      >
        {children}
      </Typography.Text>
    </SpaceLink>
  );
};

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
  processActions?: RowActions;
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
  processActions: { viewDocumentation, openEditor, changeMetaData, releaseProcess, share } = {
    viewDocumentation: () => {},
    openEditor: () => {},
    changeMetaData: () => {},
    releaseProcess: () => {},
    share: () => {},
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

  /*
    User potentialOwner Store to get the username
  */
  const userMap = usePotentialOwnerStore((state) => state.user);
  const rolesMap = usePotentialOwnerStore((state) => state.roles);
  // console.log(`out userMap ${JSON.stringify(userMap)}`);
  // Not sure, why this is not working, but using the user from the store as a dependency or directly does not work (does not cause a rerender of table with fresh values)
  // using the hook once in the component and then once in the function (i.e. dynamically) works

  // const mapIdToUsername = useCallback(
  //   (id?: string | null) => {
  //     console.log(`in userMap ${JSON.stringify(userMap)}`);
  //     if (!id) return '';
  //     const u = userMap[id];
  //     return u?.userName || u?.name || '';
  //   },
  //   [userMap],
  // );

  const mapIdToUsername = (id?: string | null) => {
    if (!id) return '';
    const u = userMap[id];
    const r = rolesMap[id];
    return u?.userName || u?.name || r || '';
  };

  /* This is the 'action' buttons in the row itself (visible on hover) */
  const actionBarGenerator = useCallback(
    (record: ProcessListProcess) => {
      const resource = record.type === 'folder' ? { Folder: record } : { Process: record };

      type ActionButtonProps = {
        title: string;
        action: (record: ProcessListProcess) => void;
        icon: React.ReactNode;
      } & ({ view: true } | { update: true });

      const ActionButton: React.FC<ActionButtonProps> = ({ title, action, icon, ...actions }) => {
        return (
          <AuthCan {...resource} {...actions}>
            <Tooltip placement="top" title={title}>
              <Button
                className={classNames(styles.ActionButton)}
                type="text"
                icon={icon}
                onClick={() => action(record)}
              />
            </Tooltip>
          </AuthCan>
        );
      };

      return (
        <>
          {record.type !== 'folder' && (
            <>
              <ActionButton
                title={'View Documentation'}
                action={viewDocumentation}
                icon={<GrDocumentUser />}
                view
              />
              <ActionButton
                title={'Open Editor'}
                action={openEditor}
                icon={<PiNotePencil />}
                update
              />
              <ActionButton
                title={'Change Meta Data'}
                action={changeMetaData}
                icon={<LuNotebookPen />}
                update
              />
              <ActionButton
                title={'Release Process'}
                action={releaseProcess}
                icon={<BsFileEarmarkCheck />}
                update
              />
              <ActionButton title={'Share'} action={share} icon={<ShareAltOutlined />} update />
            </>
          )}
        </>
      );
    },
    [
      /* copyItem, deleteItems, editItem, onExportProcess */
    ],
  );

  let columns: TableColumnsType<ProcessListProcess> = useMemo(() => {
    return [
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
          <ListEntryLink
            data={record}
            style={{
              color: record.id === folder.parentId ? 'grey' : undefined,
              fontStyle: record.id === folder.parentId ? 'italic' : undefined,
            }}
          >
            <ProcessListItemIcon item={record} /> {record.name.highlighted}
          </ListEntryLink>
        ),
        responsive: ['xs', 'sm'],
      },
      {
        title: 'Description',
        dataIndex: 'description',
        key: 'Description',
        render: (_, record) => (
          <ListEntryLink data={record}>
            {(record.description.value ?? '').length == 0 ? (
              <>&emsp;</>
            ) : (
              record.description.highlighted
            )}
            {/* Makes the link-cell clickable, when there is no description */}
          </ListEntryLink>
        ),
        responsive: ['sm'],
      },
      {
        title: 'Last Edited',
        dataIndex: 'lastEditedOn',
        key: 'Last Edited',
        render: (date: string, record) => (
          <>
            <ListEntryLink data={record}>
              <Tooltip title={generateDateString(date, true)}>
                {generateTableDateString(date)}
              </Tooltip>
            </ListEntryLink>
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
            <ListEntryLink data={record}>
              <Tooltip title={generateDateString(date, true)}>
                {generateTableDateString(date)}
              </Tooltip>
            </ListEntryLink>
          </>
        ),
        defaultSortOrder: 'descend',
        sorter: folderAwareSort((a, b) => b.createdOn!.getTime() - a.createdOn!.getTime()),
        responsive: ['md'],
      },
      {
        title: 'Created By',
        dataIndex: 'id',
        key: 'Created By',
        render: (_, item) => {
          const name =
            item.type === 'folder'
              ? mapIdToUsername(item.createdBy)
              : mapIdToUsername(item.creatorId);
          return (
            <>
              <ListEntryLink data={item}>{name}</ListEntryLink>
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
        dataIndex: 'id',
        key: 'Responsibility',
        render: (_, item) => {
          const name = item.type === 'folder' ? '' : ''; // TODO: mapIdToUsername(item.responsiblilityId);

          return (
            <>
              <ListEntryLink data={item}>{name}</ListEntryLink>
            </>
          );
        },
        sorter: folderAwareSort((a, b) =>
          (a.type === 'folder' ? '' : 'tbd').localeCompare(b.type === 'folder' ? '' : ''),
        ),
      },
      {
        title: 'Released-Version',
        dataIndex: 'id',
        key: 'Released-Version',
        render: (_, item) => {
          const cellValue =
            item.type === 'folder' ? (
              ''
            ) : (
              <>
                {/* Latest */}
                <Tooltip title="The latest version is released.">
                  <Badge status="success" count=" " style={{ backgroundColor: '#52c41a' }} />
                </Tooltip>
                {/* None */}
                <Tooltip title="No Version released, yet.">
                  <Badge
                    status="default"
                    count=" "
                    style={{
                      backgroundColor: '#bfbfbf',
                    }}
                  />
                </Tooltip>
                {/* Old */}
                <Tooltip title="The currently released version is not the latest (i.e. a newer version is available).">
                  <Badge
                    status="warning"
                    count=" "
                    style={{
                      backgroundColor: '#faad14',
                    }}
                  />
                </Tooltip>
              </>
            );

          return (
            <>
              <div
                style={{
                  width: 'auto',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span />
                <ListEntryLink data={item} tooltip={false}>
                  {cellValue}
                </ListEntryLink>
                <span />
              </div>
            </>
          );
        },
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
  }, [folder, favProcesses, mapIdToUsername, folderAwareSort]);

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
          'Created By',
          'Responsibility',
          'Released-Version',
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
  folder: Folder;
  selection: Key[];
  selectedElements: ProcessListProcess[];
  setSelectionElements: Dispatch<SetStateAction<ProcessListProcess[]>>;
  setShowMobileMetaData: Dispatch<SetStateAction<boolean>>;
  onExportProcess: (process: ProcessListProcess) => void;
  processActions: RowActions;
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
          onContextMenu: () => {
            if (selection.includes(item.id)) {
              setContextMenuItem(selectedElements);
            } else {
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
