'use client';

import styles from './processes.module.scss';
import { FC, useEffect, useState } from 'react';
import {
  Input,
  Space,
  Button,
  Col,
  Dropdown,
  MenuProps,
  Row,
  Table,
  TableColumnsType,
  Tooltip,
  Drawer,
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import { Process, fetchProcesses } from '@/lib/fetch-data';
import { useRouter } from 'next/navigation';
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
} from '@ant-design/icons';
import { Processes } from '@/lib/fetch-data';
import { TableRowSelection } from 'antd/es/table/interface';
import cn from 'classnames';
import Preview from './previewProcess';

const { Search } = Input;

// const [rowSelection, setRowSelection] = useState<TableRowSelection<DataType> | undefined>({});

const Processes: FC = () => {
  const router = useRouter();
  const { data, isLoading, isError, isSuccess } = useQuery({
    queryKey: ['processes'],
    queryFn: () => fetchProcesses(),
  });

  const [open, setOpen] = useState(false);

  const [selection, setSelection] = useState<Processes>([]);
  const [hovered, setHovered] = useState<Process | undefined>(undefined);

  const favourites = [0];

  const actionBar = (
    <>
      <Tooltip placement="top" title={'Preview'}>
        <EyeOutlined />
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

  const [selectedColumn, setSelectedColumn] = useState({});

  const actionBarGenerator = (record: Process) => {
    return (
      <>
        <Tooltip placement="top" title={'Preview'}>
          <EyeOutlined
            onClick={() => {
              setSelectedColumn(record);
              setOpen(true);
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
  };

  // rowSelection object indicates the need for row selection

  const rowSelection = {
    onChange: (selectedRowKeys: React.Key[], selectedRows: Processes) => {
      console.log(`selectedRowKeys: ${selectedRowKeys}`, 'selectedRows: ', selectedRows);
    },
    getCheckboxProps: (record: Processes[number]) => ({
      name: record.definitionId,
    }),
    onSelect: (record, selected, selectedRows, nativeEvent) => {
      setSelection(selectedRows);
    },
    onSelectNone: () => {
      setSelection([]);
    },
    onSelectAll: (selected, selectedRows, changeRows) => {
      setSelection(selectedRows);
    },
  };

  // const processActions: MenuProps['items'] = [
  //   {
  //     key: '1',
  //     label: 'Edit Metadata',
  //   },
  //   {
  //     key: '2',
  //     label: 'Export',
  //   },
  //   {
  //     key: '3',
  //     label: 'Delete',
  //     danger: true,
  //   },
  // ];

  const columns: TableColumnsType<Processes[number]> = [
    {
      dataIndex: 'definitionId',
      title: <StarOutlined />,
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
      className: styles.Title,
      sorter: (a, b) => a.definitionName.localeCompare(b.definitionName),
      onCell: (record, rowIndex) => ({
        onClick: (event) => {
          // TODO: This is a hack to clear the parallel route when selecting
          // another process. (needs upstream fix)
          router.refresh();
          router.push(`/processes/${record.definitionId}`);
        },
      }),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      sorter: (a, b) => a.description.localeCompare(b.description),
      onCell: (record, rowIndex) => ({
        onClick: (event) => {
          // TODO: This is a hack to clear the parallel route when selecting
          // another process. (needs upstream fix)
          router.refresh();
          router.push(`/processes/${record.definitionId}`);
        },
      }),
    },

    {
      title: 'Last Edited',
      dataIndex: 'lastEdited',
      render: (date: Date) => date.toLocaleString(),
      sorter: (a, b) => b.lastEdited.getTime() - a.lastEdited.getTime(),
    },
    // {
    //   title: 'Owner',
    //   dataIndex: 'owner',
    // },
    {
      title: 'Created',
      dataIndex: 'createdOn',
      render: (date: Date) => date.toLocaleString(),
      sorter: (a, b) => b.createdOn.getTime() - a.createdOn.getTime(),
    },
    {
      title: 'File Size',
      // dataIndex: 'departments',
      // render: (dep) => dep.join(', '),
      sorter: (a, b) => (a < b ? -1 : 1),
    },
    {
      title: 'Departments',
      dataIndex: 'departments',
      render: (dep) => dep.join(', '),
      sorter: (a, b) => a.definitionName.localeCompare(b.definitionName),
    },
    /*{
      title: 'Actions',
      fixed: 'right',
      width: 100,
      className: styles.ActionCell,
      render: () => (
        <div onClick={(e) => e.stopPropagation()}>
          <Dropdown menu={{ items: processActions }} arrow>
            <EllipsisOutlined rotate={90} className={styles.Action} />
          </Dropdown>
        </div>
      ),
    },*/
    {
      fixed: 'right',
      // add title but only if at least one row is selected
      dataIndex: 'definitionId',
      /* title: selection.length ? (
        <>
          {selection.length} selected
          {actionBar}
        </>
      ) : (
        ``
      ), */
      render: (definitionId, record, index) =>
        hovered?.definitionId === definitionId ? (
          <Row justify="space-evenly">{actionBarGenerator(record)}</Row>
        ) : (
          ''
        ),
    },
  ];

  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!data) return;

    if (searchTerm !== '') {
      setFilteredData(
        data.filter((item) => {
          return item.definitionName.toLowerCase().includes(searchTerm.toLowerCase());
        }),
      );
    } else {
      setFilteredData(data);
    }
  }, [data, searchTerm]);

  if (isError) {
    return <div>Error</div>;
  }

  return (
    <>
      <>
        <Row justify="space-between" className={styles.Headerrow}>
          <Col span={6} className={cn({ [styles.SelectedRow]: selection.length })}>
            {/* <Row justify="space-between">Select action: {actionBar}</Row> */}
            {selection.length ? (
              <>
                Select action for {selection.length}:{' '}
                <span className={styles.Icons}>{actionBar}</span>
              </>
            ) : (
              <div></div>
            )}
          </Col>
          <Col className={styles.Headercol} span={14}>
            <Search
              size="middle"
              // ref={(ele) => (this.searchText = ele)}
              onChange={(e) => /* console.log(e.target.value) */ setSearchTerm(e.target.value)}
              onPressEnter={(e) => setSearchTerm(e.target.value)}
              allowClear
              placeholder="Search Processes"
              // value={this.state.searchText}
            />
          </Col>
          <Col className={cn(styles.Headercol, styles.Selectview)} span={4}>
            <Space.Compact>
              <Button>
                <UnorderedListOutlined />
              </Button>
              <Button>
                <AppstoreOutlined />
              </Button>
            </Space.Compact>
          </Col>
        </Row>
      </>
      <Table
        rowSelection={{
          type: 'checkbox',
          ...rowSelection,
        }}
        onRow={(record, rowIndex) => ({
          onClick: () => {
            // TODO: This is a hack to clear the parallel route when selecting
            // another process. (needs upstream fix)
            // router.refresh();
            // router.push(`/processes/${record.definitionId}`);
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
        scroll={{ x: 1300 }}
        rowClassName={styles.Row}
        rowKey="definitionId"
        columns={columns}
        dataSource={filteredData as any}
        loading={isLoading}
        className={styles.Table}
        /* Row size rowsize */
        size="middle"
      />
      {open && <Preview selectedElement={selectedColumn} setOpen={setOpen}></Preview>}
    </>
  );
};

export default Processes;
