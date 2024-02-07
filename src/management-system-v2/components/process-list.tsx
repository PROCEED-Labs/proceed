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
} from 'react';
import {
  CopyOutlined,
  ExportOutlined,
  EditOutlined,
  DeleteOutlined,
  StarOutlined,
  EyeOutlined,
  MoreOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import cn from 'classnames';
import { usePathname, useRouter } from 'next/navigation';
import { TableRowSelection } from 'antd/es/table/interface';
import styles from './process-list.module.scss';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import Preview from './previewProcess';
import useLastClickedStore from '@/lib/use-last-clicked-process-store';
import classNames from 'classnames';
import { generateDateString } from '@/lib/utils';
import { toCaslResource } from '@/lib/ability/caslAbility';
import { useUserPreferences } from '@/lib/user-preferences';
import { AuthCan, useEnvironment } from '@/components/auth-can';
import { ProcessListProcess } from './processes';
import ConfirmationButton from './confirmation-button';

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

  const addPreferences = useUserPreferences.use.addPreferences();
  const selectedColumns = useUserPreferences.use['process-list-columns']();

  const favourites = [0];

  const showMobileMetaData = () => {
    setShowMobileMetaData(true);
  };

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
          <AuthCan resource={toCaslResource('Process', record)} action="create">
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
          <AuthCan resource={toCaslResource('Process', record)} action="update">
            <Tooltip placement="top" title={'Edit'}>
              <EditOutlined
                onClick={() => {
                  onEditProcess(record);
                }}
              />
            </Tooltip>
          </AuthCan>

          {/*TODO: errors regarding query */}

          <AuthCan action="delete" resource={toCaslResource('Process', record)}>
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

  // rowSelection object indicates the need for row selection

  const rowSelection: TableRowSelection<ProcessListProcess> = {
    selectedRowKeys: selection,
    onChange: (selectedRowKeys: React.Key[], selectedRows) => {
      setSelectionElements(selectedRows);
    },
    getCheckboxProps: (record: ProcessListProcess) => ({
      name: record.id,
    }),
    onSelect: (_, __, selectedRows) => {
      // setSelection(selectedRows);
      setSelectionElements(selectedRows);
    },
    onSelectNone: () => {
      setSelectionElements([]);
    },
    onSelectAll: (_, selectedRows) => {
      // setSelection(selectedRows)
      setSelectionElements(selectedRows);
    },
  };

  const onCheckboxChange = (e: CheckboxChangeEvent) => {
    e.stopPropagation();
    const { checked, value } = e.target;
    if (checked) {
      //setSelectedColumns([...selectedColumns, value]);
      addPreferences({ 'process-list-columns': [...selectedColumns, value] });
    } else {
      //setSelectedColumns(selectedColumns.filter((column) => column !== value));
      addPreferences({
        'process-list-columns': selectedColumns.filter((column: any) => column !== value),
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
      title: 'Process Name',
      dataIndex: 'name',
      key: 'Process Name',
      className: styles.Title,
      sorter: (a, b) => a.name.value.localeCompare(b.name.value),
      onCell: (record, rowIndex) => ({
        onClick: (event) => {
          // TODO: This is a hack to clear the parallel route when selecting
          // another process. (needs upstream fix)
          //   // TODO:
          //   setSelectedProcess(record);
          //   router.refresh();
          //   router.push(`/processes/${record.definitionId}`);
        },
      }),
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
      onCell: (record, rowIndex) => ({
        // onClick: (event) => {
        //   // TODO: This is a hack to clear the parallel route when selecting
        //   // another process. (needs upstream fix)
        //   setSelectedProcess(record);
        //   router.refresh();
        //   router.push(`/processes/${record.definitionId}`);
        // },
      }),
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
      onCell: (record, rowIndex) => ({
        // onClick: (event) => {
        //   // TODO: This is a hack to clear the parallel route when selecting
        //   // another process. (needs upstream fix)
        //   setSelectedProcess(record);
        //   router.refresh();
        //   router.push(`/processes/${record.definitionId}`);
        // },
      }),
      responsive: ['md'],
    },

    {
      title: 'Created On',
      dataIndex: 'createdOn',
      key: 'Created On',
      render: (date: Date) => generateDateString(date, false),
      sorter: (a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime(),
      onCell: (record, rowIndex) => ({
        // onClick: (event) => {
        //   // TODO: This is a hack to clear the parallel route when selecting
        //   // another process. (needs upstream fix)
        //   setSelectedProcess(record);
        //   router.refresh();
        //   router.push(`/processes/${record.definitionId}`);
        // },
      }),
      responsive: ['md'],
    },

    {
      title: 'File Size',
      key: 'File Size',
      sorter: (a, b) => (a < b ? -1 : 1),
      onCell: (record, rowIndex) => ({
        // onClick: (event) => {
        //   // TODO: This is a hack to clear the parallel route when selecting
        //   // another process. (needs upstream fix)
        //   setSelectedProcess(record);
        //   router.refresh();
        //   router.push(`/processes/${record.definitionId}`);
        // },
      }),
      responsive: ['md'],
    },

    {
      title: 'Owner',
      dataIndex: 'owner',
      key: 'Owner',
      sorter: (a, b) => a.owner!.localeCompare(b.owner || ''),
      onCell: (record, rowIndex) => ({
        // onClick: (event) => {
        //   // TODO: This is a hack to clear the parallel route when selecting
        //   // another process. (needs upstream fix)
        //   setSelectedProcess(record);
        //   router.refresh();
        //   router.push(`/processes/${record.definitionId}`);
        // },
      }),
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
          ...rowSelection,
        }}
        onRow={(record, rowIndex) => ({
          onClick: (event) => {
            // event.stopPropagation();
            // event.preventDefault();
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
            router.push(`processes/${record.id}`);
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
