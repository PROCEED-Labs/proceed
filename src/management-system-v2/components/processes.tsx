'use client';

import styles from './processes.module.scss';
import React, { FC, useEffect, useMemo, useState } from 'react';
import { Space, Button, Tooltip } from 'antd';
import { ApiData, useDeleteAsset, useGetAsset } from '@/lib/fetch-data';
import {
  CopyOutlined,
  ExportOutlined,
  EditOutlined,
  DeleteOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import Fuse from 'fuse.js';
import IconView from './process-icon-list';
import ProcessList from './process-list';
import { Preferences, getPreferences, addUserPreference } from '@/lib/utils';
import MetaData from './process-info-card';
import ProcessExportModal from './process-export';
import Bar from './bar';
import ProcessEditButton from './process-edit-button';
import { asyncForEach } from '@/lib/helpers/javascriptHelpers';
import { AuthCan } from '@/lib/iamComponents';

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

const Processes: FC = () => {
  const {
    data,
    isLoading,
    isError,
    isSuccess,
    refetch: refetchProcesses,
  } = useGetAsset('/process', {
    params: {
      query: { noBpmn: true },
    },
  });

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const { mutateAsync: deleteProcess } = useDeleteAsset('/process/{definitionId}');

  const prefs: Preferences = getPreferences();
  if (!prefs['icon-view-in-process-list']) {
    prefs['icon-view-in-process-list'] = false;
  }

  const [iconView, setIconView] = useState(prefs['icon-view-in-process-list']);

  const [exportProcessIds, setExportProcessIds] = useState<string[]>([]);

  const deselectAll = () => {
    setSelectedRowKeys([]);
  };

  const actionBar = (
    <>
      {/* <Tooltip placement="top" title={'Preview'}>
        <EyeOutlined />
      </Tooltip> */}
      <Tooltip placement="top" title={'Copy'}>
        <CopyOutlined />
      </Tooltip>
      <Tooltip placement="top" title={'Export'}>
        <ExportOutlined
          onClick={() => {
            setExportProcessIds(selectedRowKeys as string[]);
          }}
        />
      </Tooltip>
      {selectedRowKeys.length === 1 && (
        <ProcessEditButton
          definitionId={selectedRowKeys[0] as string}
          wrapperElement={
            <Tooltip placement="top" title={'Edit'}>
              <EditOutlined onClick={() => {}} />
            </Tooltip>
          }
          onEdited={() => {
            refetchProcesses();
          }}
        />
      )}
      <AuthCan resource="Process" action="delete">
        <Tooltip placement="top" title={'Delete'}>
          <DeleteOutlined
            onClick={async () => {
              deselectAll();
              await asyncForEach(selectedRowKeys as string[], async (selectedRowKey: string) => {
                await deleteProcess({ params: { path: { definitionId: selectedRowKey } } });
              });

              await refetchProcesses();
            }}
          />
        </Tooltip>
      </AuthCan>
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
      <div style={{ display: 'flex', height: '100%' }}>
        {/* 73% for list / icon view, 27% for meta data panel (if active) */}
        <div style={{ /* width: '75%', */ flex: 3 }}>
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
            }
          />
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
