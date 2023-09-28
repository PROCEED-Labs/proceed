import { Button, Checkbox, Dropdown, MenuProps, Row, Table, TableColumnsType, Tooltip } from 'antd';
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
  DeleteOutlined,
  StarOutlined,
  EyeOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useProcessesStore } from '@/lib/use-local-process-store';
import { ColumnType, TableRowSelection } from 'antd/es/table/interface';
import styles from './process-list.module.scss';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import Preview from './previewProcess';
import useLastClickedStore from '@/lib/use-last-clicked-process-store';
import classNames from 'classnames';
import { generateDateString } from '@/lib/utils';
import { ApiData } from '@/lib/fetch-data';

type Processes = ApiData<'/process', 'get'>;
type Process = Processes[number];

type ProcessListProps = PropsWithChildren<{
  data?: Processes;
  selection: Key[];
  setSelection: Dispatch<SetStateAction<Key[]>>;
  isLoading?: boolean;
}>;

const ColumnHeader = [
  'Process Name',
  'Description',
  'Last Edited',
  'Created On',
  'File Size',
  'Owner',
];

const clipText: ColumnType<Process>['render'] = (dataIndexElement, record, index) => {
  return (
    <div
      style={{
        width: '10vw',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      }}
    >
      {dataIndexElement}
    </div>
  );
};

const numberOfRows = Math.floor((window?.innerHeight - 340) / 47);
console.log(numberOfRows);

const ProcessList: FC<ProcessListProps> = ({ data, selection, setSelection, isLoading }) => {
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

  const actionBarGenerator = useCallback((record: Process) => {
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
  }, []);

  // rowSelection object indicates the need for row selection

  const rowSelection: TableRowSelection<Process> = {
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

  const [selectedColumns, setSelectedColumns] = useState([
    '',
    'Process Name',
    'Description',
    'Last Edited',
  ]);

  const onCheckboxChange = (e: CheckboxChangeEvent) => {
    e.stopPropagation();
    const { checked, value } = e.target;
    if (checked) {
      setSelectedColumns((prevSelectedColumns) => [...prevSelectedColumns, value]);
    } else {
      setSelectedColumns((prevSelectedColumns) =>
        prevSelectedColumns.filter((column) => column !== value),
      );
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
      render: clipText,
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
      render: clipText,
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

  const dataSource2 = [
    {
      key: '1',
      name: 'Mike',
      age: 32,
      address:
        '10 Downing Street Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.',
      fix: 'Fixed Content',
    },
    {
      key: '2',
      name: 'John',
      age: 42,
      address:
        '10 Downing Street Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.',
      fix: 'Fixed Content',
    },
    {
      key: '1',
      name: 'Mike',
      age: 32,
      address: '10 Downing Street',
      fix: 'Fixed Content',
    },
    {
      key: '2',
      name: 'John',
      age: 42,
      address:
        '10 Downing Street Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.',
      fix: 'Fixed Content',
    },
    {
      key: '1',
      name: 'Mike',
      age: 32,
      address: '10 Downing Street',
      fix: 'Fixed Content',
    },
    {
      key: '2',
      name: 'John',
      age: 42,
      address:
        '10 Downing Street Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.',
      fix: 'Fixed Content',
    },
    {
      key: '1',
      name: 'Mike',
      age: 32,
      address:
        '10 Downing Street Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.',
      fix: 'Fixed Content',
    },
    {
      key: '2',
      name: 'John',
      age: 42,
      address:
        '10 Downing Street Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.',
      fix: 'Fixed Content',
    },
    {
      key: '1',
      name: 'Mike',
      age: 32,
      address:
        '10 Downing Street Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.',
      fix: 'Fixed Content',
    },
    {
      key: '2',
      name: 'John',
      age: 42,
      address: '10 Downing Street',
      fix: 'Fixed Content',
    },
    {
      key: '1',
      name: 'Mike',
      age: 32,
      address: '10 Downing Street',
      fix: 'Fixed Content',
    },
    {
      key: '2',
      name: 'John',
      age: 42,
      address:
        '10 Downing Street Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.',
      fix: 'Fixed Content',
    },
    {
      key: '1',
      name: 'Mike',
      age: 32,
      address:
        '10 Downing Street Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.',
      fix: 'Fixed Content',
    },
    {
      key: '2',
      name: 'John',
      age: 42,
      address: '10 Downing Street',
      fix: 'Fixed Content',
    },
    {
      key: '1',
      name: 'Mike',
      age: 32,
      address:
        '10 Downing Street Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.',
      fix: 'Fixed Content',
    },
    {
      key: '2',
      name: 'John',
      age: 42,
      address: '10 Downing Street',
      fix: 'Fixed Content',
    },
    {
      key: '1',
      name: 'Mike',
      age: 32,
      address: '10 Downing Street',
      fix: 'Fixed Content',
    },
    {
      key: '2',
      name: 'John',
      age: 42,
      address: '10 Downing Street',
      fix: 'Fixed Content',
    },
    {
      key: '1',
      name: 'Mike',
      age: 32,
      address: '10 Downing Street',
      fix: 'Fixed Content',
    },
    {
      key: '2',
      name: 'John',
      age: 42,
      address:
        '10 Downing Street Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.',
      fix: 'Fixed Content',
    },
    {
      key: '1',
      name: 'Mike',
      age: 32,
      address: '10 Downing Street',
      fix: 'Fixed Content',
    },
    {
      key: '2',
      name: 'John',
      age: 42,
      address: '10 Downing Street',
      fix: 'Fixed Content',
    },
  ];

  const columns2: TableColumnsType<Processes[number]> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      // width: '100px',
      render: (dataIndexEle, record, index) => {
        return (
          <div
            style={{
              width: '2vw',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {dataIndexEle}
          </div>
        );
      },
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name' + 1,
    },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age' + 1,
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address' + 1,
    },
    {
      title: 'Fixed',
      fixed: 'right',
      dataIndex: 'fix',
      key: 'fix',
    },
  ];

  // return (
  //   <>
  //     <div /* style={{ height: '200px' }} */>
  //       <Table
  //         dataSource={dataSource2}
  //         columns={columns2}
  //         pagination={{ position: ['bottomCenter'], pageSize: 1 }}
  //       ></Table>
  //     </div>
  //   </>
  // );

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
                const iLast = data!.findIndex((process) => process.definitionId === lastProcessId);
                const iCurr = data!.findIndex(
                  (process) => process.definitionId === record?.definitionId,
                );
                /* Identical to last clicked */
                if (iLast === iCurr) {
                  setSelection([record?.definitionId]);
                } else if (iLast < iCurr) {
                  /* Clicked comes after last slected */
                  setSelection(
                    data!.slice(iLast, iCurr + 1).map((process) => process.definitionId),
                  );
                } else if (iLast > iCurr) {
                  /* Clicked comes before last slected */
                  setSelection(
                    data!.slice(iCurr, iLast + 1).map((process) => process.definitionId),
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
        /* ---- */
        /* Breaks Side-Panel */
        // sticky
        // scroll={{ x: 1200, y: 500 }}
        /* ---- */
        pagination={{ position: ['bottomCenter'], pageSize: numberOfRows }}
        rowKey="definitionId"
        columns={columnsFiltered}
        dataSource={data}
        loading={isLoading}
        className={classNames('no-select')}
        /* Row size rowsize */
        size="middle"
      />

      {/* <MetaData data={data} selection={selection} triggerRerender={triggerRerender} /> */}
      {previewerOpen && (
        <Preview selectedElement={previewProcess} setOpen={setPreviewerOpen}></Preview>
      )}
    </>
  );
};

export default ProcessList;
