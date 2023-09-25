import { Process, Processes } from '@/lib/fetch-data';
import { Button, Checkbox, Dropdown, MenuProps, Row, Table, TableColumnsType, Tooltip } from 'antd';
import React, {
  useCallback,
  useState,
  FC,
  useMemo,
  PropsWithChildren,
  Key,
  Dispatch,
  SetStateAction,
} from 'react';
import {
  EllipsisOutlined,
  EditOutlined,
  CopyOutlined,
  ExportOutlined,
  DeleteOutlined,
  StarOutlined,
  EyeOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  MoreOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useProcessesStore } from '@/lib/use-local-process-store';
import { TableRowSelection } from 'antd/es/table/interface';
import styles from './process-list.module.scss';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import Preview from './previewProcess';

import useLastClickedStore from '@/lib/use-last-clicked-process-store';
import classNames from 'classnames';
import MetaData from './process-info-card';

type ProcessListType = PropsWithChildren & {
  data: Processes;
  selection: Key[];
  setSelection: Dispatch<SetStateAction<Key[]>>;
  isLoading?: boolean;
};

const ColumnHeader = [
  'Process Name',
  'Description',
  'Last Edited',
  'Created On',
  'File Size',
  'Owner',
];

const ProcessList: FC<ProcessListType> = ({ data, selection, setSelection, isLoading }) => {
  const router = useRouter();

  const setSelectedProcess = useProcessesStore((state) => state.setSelectedProcess);

  const [previewerOpen, setPreviewerOpen] = useState(false);

  const [hovered, setHovered] = useState<Process | undefined>(undefined);

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const favourites = [0];

  const [previewProcess, setPreviewProcess] = useState<Process>();

  const lastProcessId = useLastClickedStore((state) => state.processId);
  const setLastProcessId = useLastClickedStore((state) => state.setProcessId);

  const [rerender, setRerender] = useState(false);

  const triggerRerender = () => {
    /*  Timeout necessary for animation and table resize */
    setTimeout(() => {
      setRerender(!rerender);
    }, 200);
  };

  const actionBarGenerator = useCallback(
    (record: Process) => {
      return (
        <>
          <Tooltip placement="top" title={'Preview'}>
            <EyeOutlined
              onClick={() => {
                setPreviewProcess(record);
                setPreviewerOpen(true);
              }}
            />
          </Tooltip>
          <Tooltip placement="top" title={'Copy'}>
            <CopyOutlined />
          </Tooltip>
          <Tooltip placement="top" title={'Export'}>
            <ExportOutlined />
          </Tooltip>
          <Tooltip placement="top" title={'Delete'}>
            <DeleteOutlined />
          </Tooltip>
        </>
      );
    },
    [setPreviewProcess, setPreviewerOpen],
  );

  // rowSelection object indicates the need for row selection

  const rowSelection: TableRowSelection<Process> = useMemo(() => {
    return {
      selectedRowKeys: selection,
      onChange: (selectedRowKeys: React.Key[], selectedRows: Processes) => {
        setSelection(selectedRowKeys);
      },
      getCheckboxProps: (record: Processes[number]) => ({
        name: record.definitionId,
      }),
      onSelect: (record, selected, selectedRows, nativeEvent) => {
        // setSelection(selectedRows);
        setSelection(selectedRows.map((row) => row.definitionId));
      },
      onSelectNone: () => {
        // setSelection([]);
        setSelection([]);
      },
      onSelectAll: (selected, selectedRows, changeRows) => {
        // setSelection(selectedRows);
        setSelection(selectedRows.map((row) => row.definitionId));
      },
    };
  }, [selection, setSelection]);

  const [selectedColumns, setSelectedColumns] = useState([
    '',
    'Process Name',
    'Description',
    'Last Edited',
  ]);

  const onCheckboxChange = useCallback(
    (e: CheckboxChangeEvent) => {
      e.stopPropagation();
      const { checked, value } = e.target;
      if (checked) {
        setSelectedColumns((prevSelectedColumns) => [...prevSelectedColumns, value]);
      } else {
        setSelectedColumns((prevSelectedColumns) =>
          prevSelectedColumns.filter((column) => column !== value),
        );
      }
    },
    [setSelectedColumns],
  );

  const items: MenuProps['items'] = useMemo(
    () =>
      ColumnHeader.map((title) => ({
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
      })),
    [onCheckboxChange, selectedColumns],
  );

  const columns: TableColumnsType<Processes[number]> = [
    {
      title: <StarOutlined />,
      dataIndex: 'definitionId',
      key: '',
      width: '40px',
      render: (definitionId, record, index) =>
        favourites?.includes(index) ? (
          <StarOutlined style={{ color: '#FFD700' }} />
        ) : hovered?.definitionId === definitionId ? (
          <StarOutlined />
        ) : (
          ''
        ),
    },

    {
      title: 'Process Name',
      dataIndex: 'definitionName',
      key: 'Process Name',
      className: styles.Title,
      sorter: (a, b) => a.definitionName.localeCompare(b.definitionName),
      onCell: (record, rowIndex) => ({
        onClick: (event) => {
          // TODO: This is a hack to clear the parallel route when selecting
          // another process. (needs upstream fix)
          //   //    TODO:
          //   setSelectedProcess(record);
          //   router.refresh();
          //   router.push(`/processes/${record.definitionId}`);
        },
      }),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'Description',
      sorter: (a, b) => a.description.localeCompare(b.description),
      onCell: (record, rowIndex) => ({
        // onClick: (event) => {
        //   // TODO: This is a hack to clear the parallel route when selecting
        //   // another process. (needs upstream fix)
        //   setSelectedProcess(record);
        //   router.refresh();
        //   router.push(`/processes/${record.definitionId}`);
        // },
      }),
    },

    {
      title: 'Last Edited',
      dataIndex: 'lastEdited',
      key: 'Last Edited',
      render: (date: Date) => date.toLocaleString(),
      sorter: (a, b) => b.lastEdited.getTime() - a.lastEdited.getTime(),
      onCell: (record, rowIndex) => ({
        // onClick: (event) => {
        //   // TODO: This is a hack to clear the parallel route when selecting
        //   // another process. (needs upstream fix)
        //   setSelectedProcess(record);
        //   router.refresh();
        //   router.push(`/processes/${record.definitionId}`);
        // },
      }),
    },
    {
      title: 'Created On',
      dataIndex: 'createdOn',
      key: 'Created On',
      render: (date: Date) => date.toLocaleString(),
      sorter: (a, b) => b.createdOn.getTime() - a.createdOn.getTime(),
      onCell: (record, rowIndex) => ({
        // onClick: (event) => {
        //   // TODO: This is a hack to clear the parallel route when selecting
        //   // another process. (needs upstream fix)
        //   setSelectedProcess(record);
        //   router.refresh();
        //   router.push(`/processes/${record.definitionId}`);
        // },
      }),
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
    },
    {
      fixed: 'right',
      width: 160,
      // add title but only if at least one row is selected
      dataIndex: 'definitionId',
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
      render: (definitionId, record, index) =>
        hovered?.definitionId === definitionId ? (
          <Row justify="space-evenly">{actionBarGenerator(record)}</Row>
        ) : (
          ''
        ),
    },
  ];

  const columnsFiltered = columns.filter((c) => selectedColumns.includes(c?.key as string));

  return (
    <>
      <div className="test" style={{ display: 'flex', width: '100%' }}>
        <div style={{ flex: 3 }} key={1 + Number(rerender)}>
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
                  if (!selection.includes(record?.definitionId)) {
                    setSelection([record?.definitionId, ...selection]);
                    /* Already in selection -> deselect */
                  } else {
                    setSelection(selection.filter((id) => id !== record?.definitionId));
                  }
                  /* SHIFT */
                } else if (event.shiftKey) {
                  /* At least one element selected */
                  if (selection.length) {
                    const iLast = data.findIndex(
                      (process) => process.definitionId === lastProcessId,
                    );
                    const iCurr = data.findIndex(
                      (process) => process.definitionId === record?.definitionId,
                    );
                    /* Identical to last clicked */
                    if (iLast === iCurr) {
                      setSelection([record?.definitionId]);
                    } else if (iLast < iCurr) {
                      /* Clicked comes after last slected */
                      setSelection(
                        data.slice(iLast, iCurr + 1).map((process) => process.definitionId),
                      );
                    } else if (iLast > iCurr) {
                      /* Clicked comes before last slected */
                      setSelection(
                        data.slice(iCurr, iLast + 1).map((process) => process.definitionId),
                      );
                    }
                  } else {
                    /* Nothing selected */
                    setSelection([record?.definitionId]);
                  }
                  /* Normal Click */
                } else {
                  setSelection([record?.definitionId]);
                }

                /* Always */
                setLastProcessId(record?.definitionId);
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
                setSelectedProcess(record);
                router.refresh();
                router.push(`/processes/${record.definitionId}`);
              },
              onMouseEnter: (event) => {
                setHovered(record);
                // console.log('mouse enter row', record);
              }, // mouse enter row
              onMouseLeave: (event) => {
                setHovered(undefined);
                // console.log('mouse leave row', event);
              }, // mouse leave row
            })}
            sticky
            scroll={{ x: 1200, y: 500 }}
            rowClassName={styles.Row}
            rowKey="definitionId"
            columns={columnsFiltered}
            dataSource={data}
            loading={isLoading}
            className={classNames(styles.ProcessList, 'no-select')}
            /* Row size rowsize */
            size="middle"
          />
        </div>

        <MetaData data={data} selection={selection} triggerRerender={triggerRerender} />
      </div>
      {previewerOpen && (
        <Preview selectedElement={previewProcess} setOpen={setPreviewerOpen}></Preview>
      )}
    </>
  );
};

export default ProcessList;
