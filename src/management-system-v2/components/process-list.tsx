'use client';

import {
  Button,
  Checkbox,
  Dropdown,
  Grid,
  MenuProps,
  Row,
  Table,
  TableColumnsType,
  Tooltip,
} from 'antd';
import { useCallback, useState, FC, PropsWithChildren, Key, Dispatch, SetStateAction } from 'react';
import {
  CopyOutlined,
  ExportOutlined,
  EditOutlined,
  DeleteOutlined,
  StarOutlined,
  MoreOutlined,
  InfoCircleOutlined,
  FolderOutlined as FolderFilled,
  FileOutlined as FileFilled,
} from '@ant-design/icons';
import cn from 'classnames';
import { useRouter } from 'next/navigation';
import styles from './process-list.module.scss';
import useLastClickedStore from '@/lib/use-last-clicked-process-store';
import classNames from 'classnames';
import { generateDateString, spaceURL } from '@/lib/utils';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { useUserPreferences } from '@/lib/user-preferences';
import { AuthCan, useEnvironment } from '@/components/auth-can';
import { ProcessListProcess } from './processes';
import ConfirmationButton from './confirmation-button';

type ProcessListProps = PropsWithChildren<{
  data: ProcessListProcess[];
  selection: Key[];
  setSelectionElements: Dispatch<SetStateAction<ProcessListProcess[]>>;
  isLoading?: boolean;
  setShowMobileMetaData: Dispatch<SetStateAction<boolean>>;
  onExportProcess: (process: ProcessListProcess) => void;
  onDeleteProcess: (process: ProcessListProcess) => void;
  onEditProcess: (process: ProcessListProcess) => void;
  onCopyProcess: (process: ProcessListProcess) => void;
}>;

const ColumnHeader = [
  'Process Name',
  'Description',
  'Last Edited',
  'Created On',
  'File Size',
  'Owner',
];

const numberOfRows =
  typeof window !== 'undefined' ? Math.floor((window?.innerHeight - 410) / 47) : 10;

const ProcessList: FC<ProcessListProps> = ({
  data,
  selection,
  setSelectionElements,
  isLoading,
  onExportProcess,
  onDeleteProcess,
  onEditProcess,
  onCopyProcess,
  setShowMobileMetaData,
}) => {
  const router = useRouter();
  const environmentId = useEnvironment();
  const breakpoint = Grid.useBreakpoint();
  const [hovered, setHovered] = useState<ProcessListProcess | undefined>(undefined);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const lastProcessId = useLastClickedStore((state) => state.processId);
  const setLastProcessId = useLastClickedStore((state) => state.setProcessId);

  const addPreferences = useUserPreferences.use.addPreferences();
  const selectedColumns = useUserPreferences.use['process-list-columns']();
  const environment = useEnvironment();

  const favourites = [0];

  const showMobileMetaData = () => {
    setShowMobileMetaData(true);
  };

  const actionBarGenerator = useCallback(
    (record: ProcessListProcess) => {
      const resource = toCaslResource(record.type === 'folder' ? 'Folder' : 'Process', record);
      return (
        <>
          <AuthCan resource={resource} action="create">
            <Tooltip placement="top" title={'Copy'}>
              <CopyOutlined
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyProcess(record);
                }}
              />
            </Tooltip>
          </AuthCan>
          <Tooltip placement="top" title={'Export'}>
            <ExportOutlined onClick={() => onExportProcess(record)} />
          </Tooltip>
          <AuthCan resource={resource} action="update">
            <Tooltip placement="top" title={'Edit'}>
              <EditOutlined onClick={() => onEditProcess(record)} />
            </Tooltip>
          </AuthCan>

          {/*TODO: errors regarding query */}

          <AuthCan action="delete" resource={resource}>
            <Tooltip placement="top" title={'Delete'}>
              <ConfirmationButton
                title="Delete Process"
                description="Are you sure you want to delete the selected process?"
                onConfirm={() => onDeleteProcess(record)}
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
    [onCopyProcess, onDeleteProcess, onEditProcess, onExportProcess],
  );

  const columnCheckBoxItems: MenuProps['items'] = ColumnHeader.map((title) => ({
    label: (
      <Checkbox
        checked={selectedColumns.includes(title)}
        onChange={(e) => {
          e.stopPropagation();
          const { checked, value } = e.target;
          if (checked) {
            addPreferences({ 'process-list-columns': [...selectedColumns, value] });
          } else {
            addPreferences({
              'process-list-columns': selectedColumns.filter((column) => column !== value),
            });
          }
        }}
        onClick={(e) => e.stopPropagation()}
        value={title}
      >
        {title}
      </Checkbox>
    ),
    key: title,
  }));

  const columns: TableColumnsType<ProcessListProcess> = [
    {
      title: <StarOutlined />,
      dataIndex: 'id',
      key: '',
      width: '40px',
      render: (id, _, index) => (
        <StarOutlined
          style={{
            color: favourites?.includes(index) ? '#FFD700' : undefined,
            opacity: hovered?.id === id || favourites?.includes(index) ? 1 : 0,
          }}
        />
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'Process Name',
      className: styles.Title,
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
          }}
        >
          {record.type === 'folder' ? <FolderFilled /> : <FileFilled />} {record.name.highlighted}
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
      // add title but only if at least one row is selected
      dataIndex: 'id',
      key: '',
      title: (
        <div style={{ float: 'right' }}>
          <Dropdown
            open={dropdownOpen}
            onOpenChange={(open) => setDropdownOpen(open)}
            menu={{
              items: columnCheckBoxItems,
            }}
            trigger={['click']}
          >
            <Button type="text">
              <MoreOutlined />
            </Button>
          </Dropdown>
        </div>
      ),
      render: (id, record) => (
        <Row
          justify="space-evenly"
          style={{
            opacity: hovered?.id === id ? 1 : 0,
          }}
        >
          {record.type !== 'folder' ? actionBarGenerator(record) : null}
        </Row>
      ),
      responsive: ['xl'],
    },
    {
      fixed: 'right',
      width: 160,
      dataIndex: 'id',
      key: '',
      title: '',
      render: () => (
        <Button style={{ float: 'right' }} type="text" onClick={showMobileMetaData}>
          <InfoCircleOutlined />
        </Button>
      ),
      responsive: breakpoint.xl ? ['xs'] : ['xs', 'sm'],
    },
  ];

  const columnsFiltered = columns.filter((c) => selectedColumns.includes(c?.key as string));

  return (
    <>
      <Table
        rowSelection={{
          type: 'checkbox',
          selectedRowKeys: selection,
          onChange: (_, selectedRows) => setSelectionElements(selectedRows),
          getCheckboxProps: (record: ProcessListProcess) => ({ name: record.id }),
          onSelect: (_, __, selectedRows) => setSelectionElements(selectedRows),
          onSelectNone: () => setSelectionElements([]),
          onSelectAll: (_, selectedRows) => setSelectionElements(selectedRows),
        }}
        onRow={(record) => ({
          onClick: (event) => {
            /* CTRL */
            if (event.ctrlKey) {
              /* Not selected yet -> Add to selection */
              if (!selection.includes(record?.id)) {
                setSelectionElements((prev) => [record, ...prev]);
                /* Already in selection -> deselect */
              } else {
                setSelectionElements((prev) => prev.filter(({ id }) => id !== record.id));
              }
              /* SHIFT */
            } else if (event.shiftKey) {
              /* At least one element selected */
              if (selection.length) {
                const iLast = data.findIndex((process) => process.id === lastProcessId);
                const iCurr = data.findIndex((process) => process.id === record?.id);
                /* Identical to last clicked */
                if (iLast === iCurr) {
                  setSelectionElements([record]);
                } else if (iLast < iCurr) {
                  /* Clicked comes after last slected */
                  setSelectionElements(data!.slice(iLast, iCurr + 1));
                } else if (iLast > iCurr) {
                  /* Clicked comes before last slected */
                  setSelectionElements(data!.slice(iCurr, iLast + 1));
                }
              } else {
                /* Nothing selected */
                setSelectionElements([record]);
              }
              /* Normal Click */
            } else {
              setSelectionElements([record]);
            }

            /* Always */
            setLastProcessId(record?.id);
          },
          // onClick: (event) => {
          //   if (event.ctrlKey) {
          //     if (!selection.includes(record.definitionId)) {
          //       setSelection([record.definitionId, ...selection]);
          //     } else {
          //       setSelection(selection.filter((id) => id !== record.definitionId));
          //     }
          //   } else {
          //     setSelection([record.definitionId]);
          //   }
          // },
          onDoubleClick: () => {
            // TODO: This is a hack to clear the parallel route when selecting
            // another process. (needs upstream fix)
            //router.refresh();
            router.push(spaceURL(environment, `/processes/${record.id}`));
          },
          onMouseEnter: (event) => {
            setHovered(record);
          }, // mouse enter row
          onMouseLeave: (event) => {
            setHovered(undefined);
          }, // mouse leave row
        })}
        /* ---- */
        /* Breaks Side-Panel */
        // sticky
        // scroll={{ x: 1200, y: 500 }}
        /* ---- */
        pagination={{ position: ['bottomCenter'], pageSize: numberOfRows }}
        rowKey="id"
        columns={columnsFiltered}
        dataSource={data}
        loading={isLoading}
        className={cn(breakpoint.xs ? styles.MobileTable : '')}
        size={breakpoint.xs ? 'large' : 'middle'}
      />
    </>
  );
};

export default ProcessList;
