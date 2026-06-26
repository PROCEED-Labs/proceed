'use client';

import { App, Button, Checkbox, Space, Spin, Tooltip, Typography } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState, useTransition } from 'react';
import DeploymentsModal from './deployments-modal';
import Bar from '@/components/bar';
import useFuzySearch from '@/lib/useFuzySearch';
import DeploymentsList from './deployments-list';
import { Folder } from '@/lib/data/folder-schema';
import { Process, ProcessMetadata } from '@/lib/data/process-schema';
import { useEnvironment } from '@/components/auth-can';
import { processUnchangedFromBasedOnVersion } from '@/lib/data/processes';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  deployProcess as serverDeployProcess,
  removeDeployment as serverRemoveDeployment,
} from '@/lib/executions/deployment-server-actions';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { SpaceEngine } from '@/lib/engines/types';
import { isUserErrorResponse, userError } from '@/lib/user-error';
import { useQueryClient } from '@tanstack/react-query';

type InputItem = ProcessMetadata | (Folder & { type: 'folder' });

const DeploymentsView = ({
  processes,
  folder,
  favourites,
  deployedProcesses,
}: {
  processes: InputItem[];
  folder: any;
  favourites: any;
  deployedProcesses: {
    id: string;
    name: string;
    versions: { id: string; name: string; deployed: boolean }[];
    instances: string[];
  }[];
}) => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const app = App.useApp();
  const pathname = usePathname();
  const space = useEnvironment();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { filteredData, setSearchQuery: setSearchTerm } = useFuzySearch({
    data: deployedProcesses ?? [],
    keys: ['name'],
    highlightedKeys: ['name'],
    transformData: (matches) => matches.map((match) => match.item),
  });

  const [togglingShowArchived, startTogglingShowArchived] = useTransition();
  const query = useSearchParams();
  // Get a new searchParams string by merging the current
  // searchParams with a provided key/value pair
  // see: https://nextjs.org/docs/app/api-reference/functions/use-search-params#updating-searchparams
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(query.toString());
      if (!value) {
        params.delete(name);
      } else {
        params.set(name, value);
      }

      return params.toString();
    },
    [query],
  );

  const [checkingProcessVersion, startCheckingProcessVersion] = useTransition();
  function deployProcess(
    process: Pick<Process, 'id' | 'versions'>,
    forceEngine?: SpaceEngine | 'PROCEED',
  ) {
    startCheckingProcessVersion(async () => {
      wrapServerCall({
        fn: async () => {
          const unchangedVersion = await processUnchangedFromBasedOnVersion(
            process.id,
            space.spaceId,
          );
          if (isUserErrorResponse(unchangedVersion)) {
            return unchangedVersion;
          }

          let versionToUse = unchangedVersion;

          if (!versionToUse) {
            let [latestVersion, ...rest] = process.versions;

            for (const version of rest) {
              if (+version.createdOn > +latestVersion.createdOn) latestVersion = version;
            }

            versionToUse = latestVersion.id;
          }

          if (!versionToUse) throw userError('Process has no versions').error;

          const res = await serverDeployProcess(
            process.id,
            versionToUse,
            space.spaceId,
            'dynamic',
            forceEngine,
          );
          queryClient.removeQueries({
            queryKey: ['processDeployments', space.spaceId, process.id],
          });

          if (isUserErrorResponse(res) && res.error.message === 'No fitting engine found.') {
            return userError(
              'No process execution could be started because there is no Process Engine available.',
            );
          }

          return res;
        },
        onSuccess: () => {
          app.message.success('Process deployed successfully');
          router.refresh();
        },
        app,
      });
    });
  }

  const [removingDeployment, startRemovingDeployment] = useTransition();
  function removeDeployment(definitionId: string) {
    return startRemovingDeployment(() =>
      wrapServerCall({
        fn: () => serverRemoveDeployment(definitionId, space.spaceId),
        onSuccess: () => router.refresh(),
      }),
    );
  }

  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    setInitialLoading(false);
  }, []);

  const loading =
    initialLoading || checkingProcessVersion || removingDeployment || togglingShowArchived;

  const tableProps: { loading: boolean; pagination?: false } = { loading };

  if (initialLoading) tableProps.pagination = false;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '0.5rem',
        }}
      >
        <Button
          type="primary"
          onClick={() => {
            setModalIsOpen(true);
          }}
          loading={initialLoading}
        >
          Deploy Process
        </Button>

        <Space>
          {togglingShowArchived ? (
            <Spin size="small" />
          ) : (
            <Checkbox
              checked={query.get('archived') == 'true'}
              onChange={(el) =>
                startTogglingShowArchived(() => {
                  router.push(
                    pathname + '?' + createQueryString('archived', el.target.checked ? 'true' : ''),
                  );
                })
              }
            />
          )}
          <Typography.Text>
            Show Past Executions{' '}
            <Tooltip title="This option displays all processes that have already been executed in the past, even if a process has already been deleted from the Management System.">
              <QuestionCircleOutlined />
            </Tooltip>
          </Typography.Text>
        </Space>
      </div>

      <Bar
        searchProps={{
          onChange: (e) => setSearchTerm(e.target.value),
          onPressEnter: (e) => setSearchTerm(e.currentTarget.value),
          placeholder: 'Search Processes ...',
        }}
      />

      <DeploymentsList
        processes={filteredData}
        tableProps={tableProps}
        removeDeployment={removeDeployment}
      />

      <DeploymentsModal
        open={modalIsOpen}
        close={() => setModalIsOpen(false)}
        processes={processes}
        folder={folder}
        favourites={favourites}
        selectProcess={(process, engine) => {
          if (process.type === 'folder') return;
          deployProcess(process, engine);
        }}
      ></DeploymentsModal>
    </div>
  );
};

export default DeploymentsView;
