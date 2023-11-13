'use client';

import styles from './page.module.scss';
import { FC, useEffect, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import Modeler from '@/components/modeler';
import cn from 'classnames';
import Content from '@/components/content';
import Overlay from './overlay';
import { useGetAsset, useInvalidateAsset } from '@/lib/fetch-data';
import {
  Breadcrumb,
  BreadcrumbProps,
  Button,
  Divider,
  Select,
  SelectProps,
  Space,
  theme,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import useModelerStateStore from '@/lib/use-modeler-state-store';
import { createNewProcessVersion } from '@/lib/helpers/processVersioning';
import VersionCreationButton from '@/components/version-creation-button';
import ProcessCreationButton from '@/components/process-creation-button';
import { AuthCan } from '@/lib/clientAuthComponents';

type ProcessProps = {
  params: { processId: string };
};

const LATEST_VERSION = { version: -1, name: 'Latest Version', description: '' };

const Processes: FC<ProcessProps> = () => {
  // TODO: check if params is correct after fix release. And maybe don't need
  // refresh in processes.tsx anymore?
  const { processId } = useParams();
  const pathname = usePathname();
  const query = useSearchParams();
  const [closed, setClosed] = useState(false);
  const router = useRouter();
  const modeler = useModelerStateStore((state) => state.modeler);
  const { data: process, isLoading: processIsLoading } = useGetAsset('/process/{definitionId}', {
    params: { path: { definitionId: processId as string } },
  });
  const { data: processes } = useGetAsset('/process', {
    params: {
      query: { noBpmn: true },
    },
  });

  const invalidateVersions = useInvalidateAsset('/process/{definitionId}/versions', {
    params: { path: { definitionId: processId as string } },
  });

  const invalidateProcesses = useInvalidateAsset('/process/{definitionId}', {
    params: { path: { definitionId: processId as string } },
  });

  const {
    token: { fontSizeHeading1 },
  } = theme.useToken();

  /// Derived State

  const minimized = pathname !== `/processes/${processId}`;
  const selectedVersionId = parseInt(query.get('version') ?? '-1');
  const selectedVersion =
    process?.versions.find((version) => version.version === selectedVersionId) ?? LATEST_VERSION;

  useEffect(() => {
    // Reset closed state when page is not minimized anymore.
    if (!minimized) {
      setClosed(false);
    }
  }, [minimized]);

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
      await invalidateVersions();
      await invalidateProcesses();
    }
  };

  const filterOption: SelectProps['filterOption'] = (input, option) =>
    ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase());

  const breadcrumItems: BreadcrumbProps['items'] = [
    /* Processes: */
    {
      title: (
        <Select
          bordered={false}
          popupMatchSelectWidth={false}
          placeholder="Select Process"
          showSearch
          filterOption={filterOption}
          value={{
            value: process?.definitionId,
            label: process?.definitionName,
          }}
          onSelect={(_, option) => {
            router.push(`/processes/${option.value}`);
          }}
          dropdownRender={(menu) => (
            <>
              {menu}
              <AuthCan action="create" resource="Process">
                <Divider style={{ margin: '4px 0' }} />
                <Space style={{ display: 'flex', justifyContent: 'center' }}>
                  <ProcessCreationButton type="text" icon={<PlusOutlined />}>
                    Create new process
                  </ProcessCreationButton>
                </Space>
              </AuthCan>
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
          popupMatchSelectWidth={false}
          placeholder="Select Version"
          showSearch
          filterOption={filterOption}
          value={{
            value: selectedVersion.version,
            label: selectedVersion.name,
          }}
          onSelect={(_, option) => {
            if (option.value === -1) {
              router.push(`/processes/${processId as string}`);
            } else {
              router.push(`/processes/${processId as string}?version=${option.value}`);
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
                  Create New Version
                </VersionCreationButton>
              </Space>
            </>
          )}
          options={[LATEST_VERSION].concat(process?.versions ?? []).map(({ version, name }) => ({
            value: version,
            label: name,
          }))}
        />
      ),
    },
  ];

  if (closed) {
    return null;
  }

  return (
    <Content
      title={
        !processIsLoading && (
          <Breadcrumb
            style={{ fontSize: fontSizeHeading1, color: 'black' }}
            separator={<span style={{ fontSize: '20px' }}>/</span>}
            items={breadcrumItems}
          />
        )
      }
      compact
      wrapperClass={cn(styles.Wrapper, { [styles.minimized]: minimized })}
      headerClass={cn(styles.HF, { [styles.minimizedHF]: minimized })}
    >
      <Modeler className={styles.Modeler} minimized={minimized} />
      {minimized ? (
        <Overlay processId={processId as string} onClose={() => setClosed(true)} />
      ) : null}
    </Content>
  );
};

export default Processes;
