'use client';

import { App, Button } from 'antd';
import { useState, useTransition } from 'react';
import DeploymentsModal from './deployments-modal';
import Bar from '@/components/bar';
import useFuzySearch from '@/lib/useFuzySearch';
import DeploymentsList from './deployments-list';
import { Folder } from '@/lib/data/folder-schema';
import { Process, ProcessMetadata } from '@/lib/data/process-schema';
import { useEnvironment } from '@/components/auth-can';
import { processHasChangesSinceLastVersion } from '@/lib/data/processes';
import type { DeployedProcessInfo } from '@/lib/engines/deployment';
import { useRouter } from 'next/navigation';
import { deployProcess as serverDeployProcess } from '@/lib/engines/server-actions';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { SpaceEngine } from '@/lib/engines/machines';
import { userError } from '@/lib/user-error';
import { removeDeployment as serverRemoveDeployment } from '@/lib/engines/server-actions';

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
    versions: DeployedProcessInfo['versions'];
    instances: DeployedProcessInfo['instances'];
  }[];
}) => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const app = App.useApp();
  const space = useEnvironment();
  const router = useRouter();

  const { filteredData, setSearchQuery: setSearchTerm } = useFuzySearch({
    data: deployedProcesses ?? [],
    keys: ['name'],
    highlightedKeys: ['name'],
    transformData: (matches) => matches.map((match) => match.item),
  });

  const [checkingProcessVersion, startCheckingProcessVersion] = useTransition();
  function deployProcess(
    process: Pick<Process, 'id' | 'versions'>,
    forceEngine?: SpaceEngine | 'PROCEED',
  ) {
    startCheckingProcessVersion(async () => {
      wrapServerCall({
        fn: async () => {
          const processChangedSinceLastVersion = await processHasChangesSinceLastVersion(
            process.id,
            space.spaceId,
          );
          if (typeof processChangedSinceLastVersion === 'object')
            return processChangedSinceLastVersion;

          let latestVersion = process.versions[0];
          for (const version of process.versions)
            if (+version.createdOn > +latestVersion.createdOn) latestVersion = version;

          if (!latestVersion) throw { error: userError('Process has no versions') };

          return await serverDeployProcess(
            process.id,
            latestVersion.id,
            space.spaceId,
            'dynamic',
            forceEngine,
          );
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

  const loading = checkingProcessVersion || removingDeployment;

  return (
    <div>
      <div style={{ marginBottom: '0.5rem' }}>
        <Button
          type="primary"
          onClick={() => {
            setModalIsOpen(true);
          }}
        >
          Deploy Process
        </Button>
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
        tableProps={{ loading }}
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
