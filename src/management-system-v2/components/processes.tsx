'use client';

import styles from './processes.module.scss';
import React, { FC, useEffect, useMemo, useState } from 'react';
import { Input, Space, Button, Col, Row, Tooltip } from 'antd';
import { ApiData, useDeleteAsset, useGetAsset } from '@/lib/fetch-data';
import {
  CopyOutlined,
  ExportOutlined,
  DeleteOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import cn from 'classnames';
import Fuse from 'fuse.js';
import IconView from './process-icon-list';
import ProcessList from './process-list';
import { Preferences, getPreferences, addUserPreference } from '@/lib/utils';
import MetaData from './process-info-card';
import { QueryClient } from '@tanstack/react-query';
import ProcessExportModal from './process-export';
import Bar from './bar';
import { useUserPreferences } from '@/lib/user-preferences';
import useStore from '@/lib/useStore';

type Processes = ApiData<'/process', 'get'>;
type Process = Processes[number];

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

const queryClient = new QueryClient();

const Processes: FC = () => {
  const { data, isLoading, isError, isSuccess } = useGetAsset('/process', {
    params: {
      query: { noBpmn: true },
    },
  });

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const prefs: Preferences = getPreferences();
  if (!prefs['icon-view-in-process-list']) {
    prefs['icon-view-in-process-list'] = false;
  }
  // const prefs: Preferences = getPreferences();
  // if (!prefs['icon-view-in-process-list']) prefs['icon-view-in-process-list'] = false;

  const preferences = useStore(useUserPreferences, (state) => state.preferences);

  // console.log('preferences', preferences);

  // const addPrefs = useStore(useUserPreferences, (state) => state.addPreferences);

  const addPrefs = useUserPreferences((state) => state.addPreferences);

  // if (!prefs['icon-view-in-process-list']) {
  //   addPrefs({ 'icon-view-in-process-list': false });
  // }

  // const [iconView, setIconView] = useState(prefs['icon-view-in-process-list']);

  const { mutateAsync: deleteProcess } = useDeleteAsset('/process/{definitionId}');

  const [exportProcessIds, setExportProcessIds] = useState<string[]>([]);

  const actionBar = (
    <>
      {/* <Tooltip placement="top" title={'Preview'}>
        <EyeOutlined />
      </Tooltip> */}
      {/* <Tooltip placement="top" title={'Copy'}>
        <CopyOutlined />
      </Tooltip> */}
      <Tooltip placement="top" title={'Export'}>
        <ExportOutlined
          onClick={() => {
            setExportProcessIds(selectedRowKeys as string[]);
          }}
        />
      </Tooltip>
      <Tooltip placement="top" title={'Delete'}>
        <DeleteOutlined
          onClick={() => {
            selectedRowKeys.forEach((key) => {
              deleteProcess({
                params: {
                  path: {
                    definitionId: key as string,
                  },
                },
              });
              /* TODO: Invalidate query for list */
              const keys = ['/process', { noBpmn: true }];
              queryClient.invalidateQueries(keys);
            });
          }}
        />
      </Tooltip>
    </>
  );

  const [searchTerm, setSearchTerm] = useState('');

  const rerenderLists = () => {
    //setFilteredData(filteredData);
  };

  const filteredData = useMemo(() => {
    if (data && searchTerm !== '') {
      const fuse = new Fuse(data, fuseOptions);
      return fuse.search(searchTerm).map((item) => item.item);
    }
    return data;
  }, [data, searchTerm]);

  const deselectAll = () => {
    setSelectedRowKeys([]);
  };
  const [copySelection, setCopySelection] = useState<React.Key[]>(selectedRowKeys);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      /* CTRL + A */
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        setSelectedRowKeys(filteredData ? filteredData.map((item) => item.definitionId) : []);
        /* DEL */
      } else if (e.key === 'Delete') {
        e.preventDefault();
        selectedRowKeys.forEach((key) => {
          deleteProcess({
            params: {
              path: {
                definitionId: key as string,
              },
            },
          });
        });
        /* TODO: Invalidate query for list */
        const keys = ['/process', { noBpmn: true }];
        queryClient.invalidateQueries(keys);
        /* TODO: */
        /* CTRL + C */
        /* CTRL + V */
      } else if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        setCopySelection(selectedRowKeys);
        console.log(copySelection);
      } else if (e.ctrlKey && e.key === 'v' && copySelection.length) {
        e.preventDefault();
        copySelection.forEach((key) => {
          /* TODO:
            Post to /process
            (identical + name with (copy) suffix
          */
          console.log(key);
        });
      }
    };
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Remove event listener on cleanup
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteProcess, filteredData, selectedRowKeys]);

  if (isError) {
    return <div>Error</div>;
  }

  return (
    <>
      <div style={{ display: 'flex', height: '100%' }}>
        {/* 73% for list / icon view, 27% for meta data panel (if active) */}
        <div style={{ /* width: '75%', */ flex: 3, width: '100%' }}>
          <Bar
            leftNode={
              selectedRowKeys.length ? (
                <Space size={20}>
                  <Button onClick={deselectAll} type="text">
                    <CloseOutlined />
                  </Button>
                  {selectedRowKeys.length} selected:{' '}
                  <span className={styles.Icons}>{actionBar}</span>
                </Space>
              ) : undefined
            }
            searchProps={{
              onChange: (e) => setSearchTerm(e.target.value),
              onPressEnter: (e) => setSearchTerm(e.currentTarget.value),
              placeholder: 'Search Processes ...',
            }}
            rightNode={
              <Space.Compact>
                <Button
                  style={
                    /* !iconView */ !preferences['icon-view-in-process-list']
                      ? { color: '#3e93de', borderColor: '#3e93de' }
                      : {}
                  }
                  onClick={() => {
                    addUserPreference({ 'icon-view-in-process-list': false });
                    addPrefs({ 'icon-view-in-process-list': false });
                    // setIconView(false);
                  }}
                >
                  <UnorderedListOutlined />
                </Button>
                <Button
                  style={
                    /* !iconView */ !preferences['icon-view-in-process-list']
                      ? {}
                      : { color: '#3e93de', borderColor: '#3e93de' }
                  }
                  onClick={() => {
                    addUserPreference({ 'icon-view-in-process-list': true });
                    addPrefs({ 'icon-view-in-process-list': true });
                    // setIconView(true);
                  }}
                >
                  <AppstoreOutlined />
                </Button>
              </Space.Compact>
            }
          />
          <div style={{ display: 'flex' }}>
            {iconView ? (
              <IconView
                data={filteredData}
                selection={selectedRowKeys}
                setSelection={setSelectedRowKeys}
              />
            ) : (
              <ProcessList
                data={filteredData}
                selection={selectedRowKeys}
                setSelection={setSelectedRowKeys}
                isLoading={isLoading}
                onExportProcess={setExportProcessIds}
              />
            )}
          </div>
        </div>
        {/* Meta Data Panel */}
        <MetaData data={filteredData} selection={selectedRowKeys} triggerRerender={rerenderLists} />
      </div>
      <ProcessExportModal
        processes={exportProcessIds.map((definitionId) => ({ definitionId }))}
        onClose={() => setExportProcessIds([])}
      />
    </>
  );
};

export default Processes;
