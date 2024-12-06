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
  deployedProcesses: (DeployedProcessInfo & { name: string })[];
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
  function deployProcess(process: Pick<Process, 'id' | 'versions'>, forceEngine?: SpaceEngine) {
    startCheckingProcessVersion(async () => {
      wrapServerCall({
        fn: async () => {
          const processChangedSinceLastVersion = await processHasChangesSinceLastVersion(
            process.id,
            space.spaceId,
          );
          if (typeof processChangedSinceLastVersion === 'object')
            return processChangedSinceLastVersion;

          const v = process.versions
            .map((v) => v.version)
            .sort()
            .at(-1);

          return await serverDeployProcess(
            process.id,
            v as number,
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
        tableProps={{ loading: checkingProcessVersion }}
      ></DeploymentsList>

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
