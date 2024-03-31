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
import React, {
  useCallback,
  useState,
  FC,
  PropsWithChildren,
  Key,
  Dispatch,
  SetStateAction,
  useEffect,
} from 'react';
import {
  CopyOutlined,
  ExportOutlined,
  EditOutlined,
  DeleteOutlined,
  StarOutlined,
  MoreOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import cn from 'classnames';
import { useRouter } from 'next/navigation';
import { TableRowSelection } from 'antd/es/table/interface';
import styles from './process-list.module.scss';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import useLastClickedStore from '@/lib/use-last-clicked-process-store';
import classNames from 'classnames';
import { generateDateString, spaceURL } from '@/lib/utils';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { useUserPreferences } from '@/lib/user-preferences';
import { AuthCan, useEnvironment } from '@/components/auth-can';
import { ProcessListProcess } from './processes';
import ConfirmationButton from './confirmation-button';
import FavouriteStar from './favouriteStar';
import useFavouriteProcesses from '@/lib/useFavouriteProcesses';

type ProcessListProps = PropsWithChildren<{
  data?: ProcessListProcess[];
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
  const breakpoint = Grid.useBreakpoint();
  //const [previewerOpen, setPreviewerOpen] = useState(false);
  const [hovered, setHovered] = useState<ProcessListProcess | undefined>(undefined);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [previewProcess, setPreviewProcess] = useState<ProcessListProcess>();

  const lastProcessId = useLastClickedStore((state) => state.processId);
  const setLastProcessId = useLastClickedStore((state) => state.setProcessId);
  const selectedColumns = useUserPreferences.use['process-list-columns-desktop']();

  const addPreferences = useUserPreferences.use.addPreferences();
  const { favourites: favProcesses } = useFavouriteProcesses();
  const environment = useEnvironment();

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
      return (
        <>
          {/* <Tooltip placement="top" title={'Preview'}>
            <EyeOutlined
              onClick={() => {
                setPreviewProcess(record);
                setPreviewerOpen(true);
              }}
            />
          </Tooltip> */}
          <AuthCan create Process={record}>
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
            <ExportOutlined
              onClick={() => {
                onExportProcess(record);
              }}
            />
          </Tooltip>
          <AuthCan update Process={record}>
            <Tooltip placement="top" title={'Edit'}>
              <EditOutlined
                onClick={() => {
                  onEditProcess(record);
                }}
              />
            </Tooltip>
          </AuthCan>

          {/*TODO: errors regarding query */}

          <AuthCan delete Process={record}>
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

  const rowSelection: TableRowSelection<ProcessListProcess> = {
    selectedRowKeys: selection,
    onChange: (selectedRowKeys: React.Key[], selectedRows) => {
      setSelectionElements(selectedRows);
    },
    getCheckboxProps: (record: ProcessListProcess) => ({
      name: record.id,
    }),
    onSelect: (_, __, selectedRows) => {
      setSelectionElements(selectedRows);
    },
    onSelectNone: () => {
      setSelectionElements([]);
    },
    onSelectAll: (_, selectedRows) => {
      setSelectionElements(selectedRows);
    },
  };

  const onCheckboxChange = (e: CheckboxChangeEvent) => {
    e.stopPropagation();
    const { checked, value } = e.target;
    if (checked) {
      addPreferences({ 'process-list-columns-desktop': [...selectedColumns, value] });
    } else {
      addPreferences({
        'process-list-columns-desktop': selectedColumns.filter((column: any) => column !== value),
      });
    }
  };

  const items: MenuProps['items'] = ColumnHeader.map((title) => ({
    label: (
      <>
        <Checkbox
          checked={selectedColumns.includes(title)}
          onChange={onCheckboxChange}
          onClick={(e) => e.stopPropagation()}
          value={title}
        >
          {title}
        </Checkbox>
      </>
    ),
    key: title,
  }));

  const columns: TableColumnsType<ProcessListProcess> = [
    {
      title: <StarOutlined />,
      dataIndex: 'id',
      key: 'Favorites',
      width: '40px',
      render: (id, process, index) => <FavouriteStar id={id} hovered={hovered?.id === id} />,
      sorter: (a, b) => (favProcesses?.includes(a.id) ? -1 : 1),
    },
    {
      title: 'Process Name',
      dataIndex: 'name',
      key: 'Process Name',
      className: styles.Title,
      sorter: (a, b) => a.name.value.localeCompare(b.name.value),
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
          {record.name.highlighted}
        </div>
      ),
      responsive: ['xs', 'sm'],
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'Description',
      sorter: (a, b) => a.description.value.localeCompare(b.description.value),
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
      sorter: (a, b) => new Date(b.lastEdited).getTime() - new Date(a.lastEdited).getTime(),
      responsive: ['md'],
    },
    {
      title: 'Created On',
      dataIndex: 'createdOn',
      key: 'Created On',
      render: (date: Date) => generateDateString(date, false),
      sorter: (a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime(),
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
      sorter: (a, b) => a.owner!.localeCompare(b.owner || ''),
      responsive: ['md'],
    },
    {
      fixed: 'right',
      width: 160,
      dataIndex: 'id',
      key: 'Selected Columns',
      title: (
        <div style={{ float: 'right' }}>
          <Dropdown
            open={dropdownOpen}
            onOpenChange={(open) => setDropdownOpen(open)}
            menu={{
              items,
            }}
            trigger={['click']}
          >
            <Button type="text">
              <MoreOutlined />
            </Button>
          </Dropdown>
        </div>
      ),
      render: (id, record, index) => (
        <Row
          justify="space-evenly"
          style={{
            opacity: hovered?.id === id ? 1 : 0,
          }}
        >
          {actionBarGenerator(record)}
        </Row>
      ),
      responsive: ['xl'],
    },
    {
      fixed: 'right',
      width: 160,
      dataIndex: 'id',
      key: 'Meta Data Button',
      title: '',
      render: () => (
        <Button
          style={{ float: 'right' }}
          type="text"
          onClick={(e: any) => {
            // e.stopPropagation()
            e.proceedClickedInfoButton = true;
            showMobileMetaData();
          }}
        >
          <InfoCircleOutlined />
        </Button>
      ),
      responsive: breakpoint.xl ? ['xs'] : ['xs', 'sm'],
    },
  ];

  const onRowActions = (record: any) => ({
    onClick: (event: any) => {
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
          const iLast = data!.findIndex((process) => process.id === lastProcessId);
          const iCurr = data!.findIndex((process) => process.id === record?.id);
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
        // const element = event.target as HTMLElement;
        if (!breakpoint.xl) {
          if (!event.proceedClickedInfoButton) router.push(`processes/${record.id}`);
        }
        // breakpoint.xl ? setSelectionElements([record]) : router.push(`processes/${record.id}`);
      }
      /* Always */
      setLastProcessId(record?.id);
    },

    onDoubleClick: () => {
      router.push(`processes/${record.id}`);
    },
    onMouseEnter: () => {
      setHovered(record);
    }, // mouse enter row
    onMouseLeave: () => {
      setHovered(undefined);
    }, // mouse leave row
  });

  const columnsFiltered = breakpoint.xl
    ? columns.filter((c) => selectedColumns.includes(c?.key as string))
    : columns.filter((c) => processListColumnsMobile.includes(c?.key as string));

  return (
    <>
      <Table
        rowSelection={{
          type: 'checkbox',
          ...rowSelection,
        }}
        onRow={onRowActions}
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
