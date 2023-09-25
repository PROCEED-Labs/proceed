'use client';

import styles from './processes.module.scss';
import { FC, useCallback, useEffect, useState } from 'react';
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
import { Process, fetchProcesses, usePostAsset } from '@/lib/fetch-data';
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
import { Processes as ProcessType } from '@/lib/fetch-data';
import { TableRowSelection } from 'antd/es/table/interface';
import cn from 'classnames';
import Preview from './previewProcess';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { useProcessesStore } from '@/lib/use-local-process-store';
import Fuse from 'fuse.js';
import IconView from './process-icon-list';
import ProcessList from './process-list';
import { Preferences, getPreferences, addUserPreference } from '@/lib/utils';

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

const Processes: FC = () => {
  const router = useRouter();

  const { data, isLoading, isError, isSuccess } = useGetAsset('/process', {});

  // usePostAsset('/process', {});

  const setProcesses = useProcessesStore((state) => state.setProcesses);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const prefs: Preferences = getPreferences();
  if (!prefs['icon-view-in-process-list']) prefs['icon-view-in-process-list'] = false;

  const [iconView, setIconView] = useState(prefs['icon-view-in-process-list']);

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

  useEffect(() => {
    setProcesses(data as any);
  }, [data, setProcesses]);

  const [filteredData, setFilteredData] = useState<typeof data>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (data && searchTerm !== '') {
      const fuse = new Fuse(data, fuseOptions);
      setFilteredData(fuse.search(searchTerm).map((item) => item.item));
    } else {
      setFilteredData(data);
    }
  }, [data, searchTerm]);

  const deselectAll = () => {
    setSelectedRowKeys([]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      /* CTRL + A */
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        setSelectedRowKeys(filteredData ? filteredData.map((item) => item.definitionId) : []);
      }
      /* TODO: */
      /* CTRL + C */
      /* CTRL + V */
      /* DEL */
    };
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Remove event listener on cleanup
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredData]);

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
            className={cn({ [styles.SelectedRow]: /* selection */ selectedRowKeys.length })}
          >
            {selectedRowKeys.length ? (
              <>
                <Button onClick={deselectAll} type="text">
                  <CloseOutlined />
                </Button>
                {selectedRowKeys.length} selected: <span className={styles.Icons}>{actionBar}</span>
              </>
            ) : (
              <div></div>
            )}
          </Col>
          <Col md={0} lg={1} xl={1}></Col>
          <Col className={styles.Headercol} xs={22} sm={22} md={22} lg={9} xl={13}>
            <Search
              size="middle"
              onChange={(e) => setSearchTerm(e.target.value)}
              onPressEnter={(e) => setSearchTerm(e.currentTarget.value)}
              allowClear
              placeholder="Search Processes"
            />
          </Col>
          <Col span={1} />
          <Col className={cn(styles.Headercol, styles.Selectview)} span={1}>
            <Space.Compact>
              <Button
                style={!iconView ? { color: '#3e93de', borderColor: '#3e93de' } : {}}
                onClick={() => {
                  addUserPreference({ 'icon-view-in-process-list': false });
                  setIconView(false);
                }}
              >
                <UnorderedListOutlined />
              </Button>
              <Button
                style={!iconView ? {} : { color: '#3e93de', borderColor: '#3e93de' }}
                onClick={() => {
                  addUserPreference({ 'icon-view-in-process-list': true });
                  setIconView(true);
                }}
              >
                <AppstoreOutlined />
              </Button>
            </Space.Compact>
          </Col>
        </Row>
      </>
      {!iconView ? (
        <ProcessList
          data={filteredData}
          selection={selectedRowKeys}
          setSelection={setSelectedRowKeys}
          isLoading={isLoading}
        />
      ) : (
        <IconView
          data={filteredData}
          selection={selectedRowKeys}
          setSelection={setSelectedRowKeys}
        />
      )}
    </>
  );
};

export default Processes;
