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
  Checkbox,
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import { Process, fetchProcesses } from '@/lib/fetch-data';
import { useGetAsset } from '@/lib/fetch-data';
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
  MoreOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { Processes } from '@/lib/fetch-data';
import { TableRowSelection } from 'antd/es/table/interface';
import cn from 'classnames';
import Preview from './previewProcess';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { useProcessesStore } from '@/lib/use-local-process-store';
import Fuse from 'fuse.js';

const fuseOptions = {
  /* Option for Fuzzy-Search for Processlistfilter */
  /* https://www.fusejs.io/api/options.html#useextendedsearch */
  // isCaseSensitive: false,
  // includeScore: false,
  // shouldSort: true,
  // includeMatches: false,
  findAllMatches: true,
  // minMatchCharLength: 1,
  // location: 0,
  threshold: 0.75,
  // distance: 100,
  useExtendedSearch: true,
  ignoreLocation: true,
  // ignoreFieldNorm: false,
  // fieldNormWeight: 1,
  keys: ['definitionName', 'description'],
};

const { Search } = Input;

// const [rowSelection, setRowSelection] = useState<TableRowSelection<DataType> | undefined>({});

const Processes: FC = () => {
  const router = useRouter();

  const { data, isLoading, isError, isSuccess } = useGetAsset('/process', {});

  const setProcesses = useProcessesStore((state) => state.setProcesses);

  const [open, setOpen] = useState(false);

  const [selection, setSelection] = useState<Processes>([]);
  const [hovered, setHovered] = useState<Process | undefined>(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const favourites = [0];

  const actionBar = (
    <>
      {/* <Tooltip placement="top" title={'Preview'}>
        <EyeOutlined />
      </Tooltip> */}
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

  const [selectedColumn, setSelectedColumn] = useState<Process>();

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

  const rowSelection: TableRowSelection<Process> = {
    selectedRowKeys,
    onChange: (selectedRowKeys: React.Key[], selectedRows: Processes) => {
      setSelectedRowKeys(selectedRowKeys);
    },
    // onChange: (selectedRowKeys: React.Key[], selectedRows: Processes) => {
    //   console.log(`selectedRowKeys: ${selectedRowKeys}`, 'selectedRows: ', selectedRows);
    // },
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

  const ColumnHeader = [
    'Process Name',
    'Description',
    'Last Edited',
    'Created On',
    'File Size',
    'Owner',
  ];

  type Column = {
    title: string;
  };
  const [selectedColumns, setSelectedColumns] = useState([
    '',
    'Process Name',
    'Description',
    'Last Edited',
  ]);

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
          router.refresh();
          router.push(`/processes/${record.definitionId}`);
        },
      }),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'Description',
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
      key: 'Last Edited',
      render: (date: Date) => date.toLocaleString(),
      sorter: (a, b) => b.lastEdited.getTime() - a.lastEdited.getTime(),
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
      title: 'Created On',
      dataIndex: 'createdOn',
      key: 'Created On',
      render: (date: Date) => date.toLocaleString(),
      sorter: (a, b) => b.createdOn.getTime() - a.createdOn.getTime(),
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
      title: 'File Size',
      key: 'File Size',
      sorter: (a, b) => (a < b ? -1 : 1),
      onCell: (record, rowIndex) => ({
        onClick: (event) => {
          // TODO: This is a hack to clear the parallel route when selecting
          // another process. (needs upstream fix)
          router.refresh();
          router.push(`/processes/${record.definitionId}`);
        },
      }),
    },
    // {
    //   title: 'Departments',
    //   dataIndex: 'departments',
    //   render: (dep) => dep.join(', '),
    //   sorter: (a, b) => a.definitionName.localeCompare(b.definitionName),
    // },
    {
      title: 'Owner',
      dataIndex: 'owner',
      key: 'Owner',
      sorter: (a, b) => a.owner!.localeCompare(b.owner || ''),
      onCell: (record, rowIndex) => ({
        onClick: (event) => {
          // TODO: This is a hack to clear the parallel route when selecting
          // another process. (needs upstream fix)
          router.refresh();
          router.push(`/processes/${record.definitionId}`);
        },
      }),
    },
    // {
    //   title: 'Departments',
    //   dataIndex: 'departments',
    //   render: (dep) => dep.join(', '),
    //   sorter: (a, b) => a.definitionName.localeCompare(b.definitionName),
    //   onCell: (record, rowIndex) => ({
    //     onClick: (event) => {
    //       // TODO: This is a hack to clear the parallel route when selecting
    //       // another process. (needs upstream fix)
    //       router.refresh();
    //       router.push(`/processes/${record.definitionId}`);
    //     },
    //   }),
    // },
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

  const columnsFiltered = columns.filter((c) => selectedColumns.includes(c?.key as string));

  // <Dropdown menu={{ items }} trigger={['click']}>
  //   <a onClick={(e) => e.preventDefault()}>
  //     <Space>
  //       Click me
  //       <DownOutlined />
  //     </Space>
  //   </a>
  // </Dropdown>

  useEffect(() => {
    if (data) {
      setProcesses(data as any);
    }
  }, [data]);

  const [filteredData, setFilteredData] = useState<typeof data>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (data && searchTerm !== '') {
      const fuse = new Fuse(data, fuseOptions);
      setFilteredData(fuse.search(searchTerm).map((item) => item.item));
      // setFilteredData(
      //   data.filter((item) => {
      //     return item.definitionName.toLowerCase().includes(searchTerm.toLowerCase());
      //   })
      //);
    } else {
      setFilteredData(data);
    }
  }, [data, searchTerm]);

  const deselectAll = () => {
    setSelection([]);
    setSelectedRowKeys([]);
  };

  if (isError) {
    return <div>Error</div>;
  }

  return (
    <>
      <>
        <Row justify="space-between" className={styles.Headerrow}>
          <Col
            xs={24}
            sm={24}
            md={24}
            lg={10}
            xl={6}
            className={cn({ [styles.SelectedRow]: selection.length })}
          >
            {/* <Row justify="space-between">Select action: {actionBar}</Row> */}
            {selection.length ? (
              <>
                <Button type="text">
                  <CloseOutlined onClick={deselectAll} />
                </Button>
                {/* Select action for {selection.length}:{' '}
                <span className={styles.Icons}>{actionBar}</span> */}
                {selection.length} selected: <span className={styles.Icons}>{actionBar}</span>
              </>
            ) : (
              <div></div>
            )}
          </Col>
          <Col md={0} lg={1} xl={1}></Col>
          <Col className={styles.Headercol} xs={22} sm={22} md={22} lg={9} xl={13}>
            <Search
              size="middle"
              // ref={(ele) => (this.searchText = ele)}
              onChange={(e) => /* console.log(e.target.value) */ setSearchTerm(e.target.value)}
              onPressEnter={(e) => setSearchTerm(e.currentTarget.value)}
              allowClear
              placeholder="Search Processes"
              // value={this.state.searchText}
            />
          </Col>
          <Col span={1} />
          <Col className={cn(styles.Headercol, styles.Selectview)} span={1}>
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
        columns={columnsFiltered}
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
