'use client';

import styles from './processes.module.scss';
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Input, Space, Button, Col, Row, Tooltip } from 'antd';
import { ApiData, useDeleteAsset, useGetAsset, usePostAsset } from '@/lib/fetch-data';
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
import { useQueryClient } from '@tanstack/react-query';
import ProcessExportModal from './process-export';
import Bar from './bar';
import { useUserPreferences } from '@/lib/user-preferences';
import { fetchProcessVersionBpmn } from '@/lib/process-queries';
import {
  setDefinitionsId,
  setDefinitionsName,
  manipulateElementsByTagName,
  generateDefinitionsId,
  setTargetNamespace,
  setDefinitionsVersionInformation,
} from '@proceed/bpmn-helper';
import ProcessDeleteModal from './process-delete';
import ProcessDeleteSingleModal from './process-delete-single';
import ProcessCopyModal from './process-copy';
import { copy } from 'fs-extra';
import { useAbilityStore } from '@/lib/abilityStore';

type Processes = ApiData<'/process', 'get'>;
type Process = Processes[number];

export const fuseOptions = {
  /* Option for Fuzzy-Search for Processlistfilter */
  /* https://www.fusejs.io/api/options.html#useextendedsearch */
  // isCaseSensitive: false,
  // includeScore: false,
  // shouldSort: true,
  includeMatches: true,
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

type CopyProcessType = {
  bpmn: string;
  newName?: string;
};

const copyProcess = async ({ bpmn, newName }: CopyProcessType) => {
  const newDefinitionsId = await generateDefinitionsId();
  let newBPMN = await setDefinitionsId(bpmn, newDefinitionsId);
  newBPMN = await setDefinitionsName(newBPMN, newName || 'Copy of Process');
  newBPMN = await setTargetNamespace(newBPMN, newDefinitionsId);

  newBPMN = await setDefinitionsVersionInformation(newBPMN, {
    version: undefined,
    versionName: undefined,
    versionDescription: undefined,
    versionBasedOn: undefined,
  });
  // newBPMN = await manipulateElementsByTagName(newBPMN, 'bpmn:Definitions', (definitions: any) => {
  //   delete definitions.version;
  //   delete definitions.versionName;
  //   delete definitions.versionDescription;
  //   delete definitions.versionBasedOn;
  // });

  return newBPMN;
};

const Processes: FC = () => {
  const {
    data,
    isLoading,
    isError,
    isSuccess,
    refetch: pullNewProcessData,
  } = useGetAsset('/process', {
    params: {
      query: { noBpmn: true },
    },
  });

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const { preferences, addPreferences } = useUserPreferences();

  const {
    'icon-view-in-process-list': iconView,
    'ask-before-deleting-multiple': openModalWhenDeleteMultiple,
    'ask-before-deleting-single': openModalWhenDeleteSingle,
    'ask-before-copying': openModalWhenCopy,
  } = preferences;

  const ability = useAbilityStore((state) => state.ability);

  const { mutateAsync: deleteProcess } = useDeleteAsset('/process/{definitionId}', {
    onSettled: pullNewProcessData,
  });

  const { mutateAsync: addProcess } = usePostAsset('/process', {});

  const deleteSelectedProcesses = useCallback(() => {
    selectedRowKeys.forEach((key) => {
      deleteProcess({
        params: {
          path: {
            definitionId: key as string,
          },
        },
        parseAs: 'text',
      });
    });
    setSelectedRowKeys([]);
  }, [deleteProcess, selectedRowKeys]);

  const [exportProcessIds, setExportProcessIds] = useState<string[]>([]);
  const [copyProcessIds, setCopyProcessIds] = useState<string[]>([]);
  const [deleteProcessIds, setDeleteProcessIds] = useState<string[]>([]);

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
          className={styles.Icon}
          onClick={() => {
            setExportProcessIds(selectedRowKeys as string[]);
          }}
        />
      </Tooltip>
      {ability.can('delete', 'Process') && (
        <Tooltip placement="top" title={'Delete'}>
          <DeleteOutlined
            className={styles.Icon}
            onClick={() => {
              if (
                (openModalWhenDeleteMultiple && selectedRowKeys.length > 1) ||
                (openModalWhenDeleteSingle && selectedRowKeys.length == 1)
              ) {
                setDeleteProcessIds(selectedRowKeys as string[]);
              } else {
                deleteSelectedProcesses();
              }
            }}
          />
        </Tooltip>
      )}
    </>
  );

  const [searchTerm, setSearchTerm] = useState('');

  const rerenderLists = () => {
    //setFilteredData(filteredData);,
  };

  const { data: filteredData } = useMemo(() => {
    if (data && searchTerm !== '') {
      const fuse = new Fuse(data, fuseOptions);
      return {
        data: fuse.search(searchTerm).map((item) => item.item),
        highlight: fuse.search(searchTerm).map((item) => item.matches),
      };
    }
    return { data, highlight: [] };
  }, [data, searchTerm]);

  const deselectAll = () => {
    setSelectedRowKeys([]);
  };
  const [copySelection, setCopySelection] = useState<React.Key[]>(selectedRowKeys);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      /* CTRL + A */
      if (
        e.ctrlKey &&
        e.key === 'a' &&
        copyProcessIds.length == 0 &&
        deleteProcessIds.length == 0
      ) {
        e.preventDefault();
        setSelectedRowKeys(filteredData ? filteredData.map((item) => item.definitionId) : []);
        /* DEL */
      } else if (e.key === 'Delete') {
        if (ability.can('delete', 'Process')) {
          if (
            (openModalWhenDeleteMultiple && selectedRowKeys.length > 1) ||
            (openModalWhenDeleteSingle && selectedRowKeys.length == 1)
          ) {
            setDeleteProcessIds(selectedRowKeys as string[]);
          } else {
            deleteSelectedProcesses();
          }
        }
        /* ESC */
      } else if (e.key === 'Escape') {
        deselectAll();
        /* CTRL + C */
      } else if (e.ctrlKey && e.key === 'c' && copyProcessIds.length == 0) {
        if (ability.can('create', 'Process')) {
          setCopySelection(selectedRowKeys);
        }
        /* CTRL + V */
      } else if (e.ctrlKey && e.key === 'v' && copySelection.length) {
        if (ability.can('create', 'Process')) {
          if (openModalWhenCopy) {
            setCopyProcessIds(copySelection as string[]);
          } else {
            copySelection.forEach(async (key) => {
              const process = data?.find((item) => item.definitionId === key);
              const processBpmn = await fetchProcessVersionBpmn(key as string);

              const newBPMN = await copyProcess({
                bpmn: processBpmn as string,
                newName: `${process?.definitionName} (Copy)`,
              });

              addProcess({
                body: {
                  bpmn: newBPMN as string,
                  departments: [],
                  variables: [],
                },
              });
            });
          }
        }
      }
    };
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Remove event listener on cleanup
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    copySelection,
    deleteProcess,
    filteredData,
    selectedRowKeys,
    deleteSelectedProcesses,
    data,
    addProcess,
    openModalWhenDeleteMultiple,
    openModalWhenDeleteSingle,
    copyProcessIds.length,
    deleteProcessIds.length,
    openModalWhenCopy,
    ability,
  ]);

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
                  {selectedRowKeys.length} selected:
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
                    // addUserPreference({ 'icon-view-in-process-list': false });
                    addPreferences({ 'icon-view-in-process-list': false });
                  }}
                >
                  <UnorderedListOutlined />
                </Button>
                <Button
                  style={!iconView ? {} : { color: '#3e93de', borderColor: '#3e93de' }}
                  onClick={() => {
                    // addUserPreference({ 'icon-view-in-process-list': true });
                    addPreferences({ 'icon-view-in-process-list': true });
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
              search={searchTerm}
            />
          ) : (
            <ProcessList
              data={filteredData}
              selection={selectedRowKeys}
              setSelection={setSelectedRowKeys}
              isLoading={isLoading}
              onExportProcess={setExportProcessIds}
              search={searchTerm}
              setDeleteProcessIds={setDeleteProcessIds}
              deleteProcessKeys={deleteProcessIds}
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
      <ProcessDeleteModal
        setDeleteProcessIds={setDeleteProcessIds}
        processKeys={deleteProcessIds}
        setSelection={setSelectedRowKeys}
      />
      <ProcessDeleteSingleModal
        setDeleteProcessIds={setDeleteProcessIds}
        processKeys={deleteProcessIds}
        setSelection={setSelectedRowKeys}
      />
      <ProcessCopyModal
        setSelection={setSelectedRowKeys}
        processKeys={copyProcessIds}
        setCopyProcessIds={setCopyProcessIds}
      ></ProcessCopyModal>
    </>
  );
};

export default Processes;
