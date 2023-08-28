'use client';

import { Breadcrumb, Select, Space, Tooltip, theme } from 'antd';
import { usePathname } from 'next/navigation';
import React, { FC, use, useEffect, useState } from 'react';
import useModelerStateStore from '@/lib/use-modeler-state-store';
import { useProcessesStore } from '@/lib/use-local-process-store';
import { useRouter } from 'next/navigation';

const HeaderMenu: FC = () => {
  const router = useRouter();

  const pathname = usePathname();
  const isProcessPage = /^\/processes\/[^/]+$/.test(pathname);
  const [process, processId] = pathname.split('/').slice(1);

  const versions = useModelerStateStore((state) => state.versions);
  const setVersions = useModelerStateStore((state) => state.setVersions);
  const selectedVersion = useModelerStateStore((state) => state.selectedVersion);
  const setSelectedVersion = useModelerStateStore((state) => state.setSelectedVersion);

  const processes = useProcessesStore((state) => state.processes);
  const setProcesses = useProcessesStore((state) => state.setProcesses);
  const selectedProcess = useProcessesStore((state) => state.selectedProcess);
  const setSelectedProcess = useProcessesStore((state) => state.setSelectedProcess);

  if (isProcessPage) {
    if (!selectedProcess) {
      setSelectedProcess(processes?.find(({ definitionId }) => definitionId === processId));
    }
  }

  const {
    token: { fontSizeHeading1 },
  } = theme.useToken();

  type BreadcrumbItem = {
    title: React.ReactNode;
    menu?: {
      items: { key: string; label: React.ReactNode }[];
      onClick: ({ key }: { key: any }) => void;
    };
  };

  const [items, setItems] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    setItems([
      /* Processes: */
      {
        title: (
          <>
            <Tooltip placement="rightBottom" title={`Select a process`}>
              {selectedProcess?.definitionName}
            </Tooltip>
          </>
        ),
        menu: {
          items: processes
            .map(({ definitionId, definitionName }) => ({
              key: definitionId,
              label: <>{definitionName}</>,
            }))
            .filter(({ key }) => key !== processId),
          onClick: ({ key }) => {
            setSelectedProcess(processes.find(({ definitionId }) => definitionId === key));
            router.refresh();
            router.push(
              `/processes/${
                processes.find(({ definitionId }) => definitionId === key)?.definitionId
              }`
            );
          },
        },
      },
      /* Versions: */
      {
        title: (
          <>
            <Tooltip placement="rightBottom" title={`Select a version`}>
              {versions.find(({ version }) => version == selectedVersion)?.name || 'Latest Version'}
            </Tooltip>
          </>
        ),
        menu: {
          items: selectedVersion
            ? [
                { key: -1, label: <>Latest Version</> },
                ...versions.map(({ version, name }) => ({
                  key: version,
                  label: <>{name}</>,
                })),
              ]
            : versions.map(({ version, name }) => ({
                key: version,
                label: <>{name}</>,
              })),
          onClick: ({ key }) => {
            setSelectedVersion(key);
          },
        },
      },
    ]);
  }, [processes, versions, selectedProcess, selectedVersion]);

  return (
    <>
      <Space>
        {isProcessPage && (
          <Breadcrumb style={{ fontSize: fontSizeHeading1, color: 'black' }} items={items} />
        )}
      </Space>
    </>
  );
};

export default HeaderMenu;
