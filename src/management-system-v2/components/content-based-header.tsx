'use client';

import { Breadcrumb, Button, Divider, Select, Space, Tooltip, theme } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { usePathname } from 'next/navigation';
import React, { FC, useMemo, useState } from 'react';
import useModelerStateStore from '@/lib/use-modeler-state-store';
import { useProcessesStore } from '@/lib/use-local-process-store';
import { useRouter } from 'next/navigation';
import VersionCreationButton from './version-creation-button';
import { createNewProcessVersion } from '@/lib/helpers';

const HeaderMenu: FC = () => {
  const router = useRouter();

  const pathname = usePathname();
  const isProcessPage = /^\/processes\/[^/]+$/.test(pathname);

  const versions = useModelerStateStore((state) => state.versions);
  const selectedVersion = useModelerStateStore((state) => state.selectedVersion);
  const setSelectedVersion = useModelerStateStore((state) => state.setSelectedVersion);

  const processes = useProcessesStore((state) => state.processes);
  const selectedProcess = useModelerStateStore((state) => state.selectedProcess);

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

  type BreadcrumbItem = {
    title: React.ReactNode;
  };
  const breadcrumItems: BreadcrumbItem[] = useMemo(() => {
    return [
      /* Processes: */
      {
        title: (
          <Select
            bordered={false}
            listHeight={160}
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
      },
      /* Versions: */
      {
        title: (
          <Select
            bordered={false}
            listHeight={160}
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
  }, [processes, versions, selectedProcess, selectedVersion]);

  return (
    <Space>
      {isProcessPage && (
        <Breadcrumb
          style={{ fontSize: fontSizeHeading1, color: 'black' }}
          separator={<span style={{ fontSize: '20px' }}>/</span>}
          items={breadcrumItems}
        />
      )}
    </Space>
  );
};

export default HeaderMenu;
