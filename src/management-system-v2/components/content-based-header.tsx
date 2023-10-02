'use client';

import { Breadcrumb, BreadcrumbProps, Button, Divider, Select, Space, Tooltip, theme } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { usePathname } from 'next/navigation';
import React, { FC, useEffect, useMemo, useState } from 'react';
import useModelerStateStore from '@/lib/use-modeler-state-store';
import { useProcessesStore } from '@/lib/use-local-process-store';
import { useRouter } from 'next/navigation';
import classNames from 'classnames';
import styles from './content-based-header.module.scss';
import VersionCreationButton from './version-creation-button';
import { createNewProcessVersion } from '@/lib/helpers';

const HeaderMenu: FC = () => {
  const router = useRouter();

  const pathname = usePathname();
  const isProcessPage = /^\/processes\/[^/]+$/.test(pathname);
  const ProcessListOpen = !isProcessPage && pathname === '/processes';
  const [process, processId] = pathname.split('/').slice(1);

  const versions = useModelerStateStore((state) => state.versions);
  const selectedVersion = useModelerStateStore((state) => state.selectedVersion);
  const setSelectedVersion = useModelerStateStore((state) => state.setSelectedVersion);

  const processes = useProcessesStore((state) => state.processes);
  const selectedProcess = useProcessesStore((state) => state.selectedProcess);
  const setSelectedProcess = useProcessesStore((state) => state.setSelectedProcess);

  useEffect(() => {
    if (!selectedProcess)
      setSelectedProcess(processes?.find(({ definitionId }) => definitionId === processId));
  }, [isProcessPage]);

  const modeler = useModelerStateStore((state) => state.modeler);

  const {
    token: { fontSizeHeading1 },
  } = theme.useToken();

  const createProcess = () => {
    console.log('create process');
  };

  const selectedVersionInformation = useMemo(() => {
    const foundVersion = versions.find((version) => version.version === selectedVersion);

    if (foundVersion) {
      return foundVersion;
    }
    return { version: 'latest', name: 'Latest Version', description: '' };
  }, [versions, selectedVersion]);

  const createProcessVersion = async (values: {
    versionName: string;
    versionDescription: string;
  }) => {
    const saveXMLResult = await modeler?.saveXML({ format: true });

    if (saveXMLResult?.xml) {
      await createNewProcessVersion(
        saveXMLResult.xml,
        values.versionName,
        values.versionDescription,
      );
      const [process, processId] = pathname.split('/').slice(1);
    }
  };

  const filterOption = (input: string, option?: { label: string; value: string }) =>
    (option?.label ?? '').toLowerCase().includes(input.toLowerCase());

  const breadcrumItems: BreadcrumbProps['items'] = [
    /* Processes: */
    {
      title: (
        <Select
          bordered={false}
          style={{ maxHeight: '20vh' }}
          popupMatchSelectWidth={false}
          placeholder="Select process"
          showSearch
          filterOption={filterOption}
          value={{
            value: selectedProcess?.definitionId,
            label: selectedProcess?.definitionName,
          }}
          onSelect={(_, option) => {
            const process = processes?.find(({ definitionId }) => definitionId === option.value);
            blur();
            if (process) {
              setSelectedVersion(null);
              router.push(`/processes/${process.definitionId}`);
            }
          }}
          dropdownRender={(menu) => (
            <>
              {menu}
              <Divider style={{ margin: '4px 0' }} />
              <Space style={{ display: 'flex', justifyContent: 'center' }}>
                <Button type="text" icon={<PlusOutlined />} onClick={createProcess}>
                  Create new process
                </Button>
              </Space>
            </>
          )}
          options={processes?.map(({ definitionId, definitionName }) => ({
            value: definitionId,
            label: definitionName,
          }))}
        />
      ),
      menu: {
        items: processes
          ? processes
              .map(({ definitionId, definitionName }) => ({
                key: definitionId,
                label: <>{definitionName}</>,
              }))
              .filter(({ key }) => key !== processId)
          : [],
        onClick: ({ key }) => {
          setSelectedProcess(processes.find(({ definitionId }) => definitionId === key));
          router.refresh();
          router.push(
            `/processes/${processes.find(({ definitionId }) => definitionId === key)
              ?.definitionId}`,
          );
        },
      },
    },
    /* Versions: */
    {
      title: (
        <Select
          bordered={false}
          style={{ maxHeight: '20vh' }}
          popupMatchSelectWidth={false}
          placeholder="Select version"
          showSearch
          filterOption={filterOption}
          value={{
            value: `${selectedVersionInformation.version}`,
            label: selectedVersionInformation.name,
          }}
          onSelect={(_, option) => {
            const version = versions?.find(({ version }) => version.toString() === option.value);

            if (version) {
              setSelectedVersion(version.version);
            } else {
              setSelectedVersion(null);
            }
          }}
          dropdownRender={(menu) => (
            <>
              {menu}
              <Divider style={{ margin: '4px 0' }} />
              <Space style={{ display: 'flex', justifyContent: 'center' }}>
                <VersionCreationButton
                  type="text"
                  icon={<PlusOutlined />}
                  createVersion={createProcessVersion}
                >
                  Create new version
                </VersionCreationButton>
              </Space>
            </>
          )}
        >
          <Select.Option key="latest" value="latest" label="Latest Version">
            <span style={{ fontStyle: 'italic' }}>Latest Version</span>
          </Select.Option>
          {versions.map((item) => (
            <Select.Option key={item.version} value={`${item.version}`} label={item.name}>
              <span>{item.name}</span>
            </Select.Option>
          ))}
        </Select>
      ),
    },
  ];

  return (
    <>
      <Space>
        {isProcessPage && (
          <Breadcrumb
            style={{ fontSize: fontSizeHeading1, color: 'black' }}
            separator={<span style={{ fontSize: '20px' }}>/</span>}
            items={breadcrumItems}
          />
        )}
        {ProcessListOpen && <div className={classNames(styles.Title)}>Processes</div>}
      </Space>
    </>
  );
};

export default HeaderMenu;
