'use client';

import { App, Button } from 'antd';
import { useState, useTransition } from 'react';
import DeploymentsModal from './deployments-modal';
import Bar from '@/components/bar';
import useFuzySearch from '@/lib/useFuzySearch';
import DeploymentsList from './deployments-list';
import { Folder } from '@/lib/data/folder-schema';
import { Process, ProcessMetadata } from '@/lib/data/process-schema';
import { useQuery } from '@tanstack/react-query';
import { useEnvironment } from '@/components/auth-can';
import { processHasChangesSinceLastVersion } from '@/lib/data/processes';
import { DeployedProcessInfo, deployProcess, getDeployments } from '@/lib/engines/deployment';
import useDeployments from './deployments-hook';

type InputItem = ProcessMetadata | (Folder & { type: 'folder' });

const DeploymentsView = ({
  processes,
  folder,
  favourites,
}: {
  processes: InputItem[];
  folder: any;
  favourites: any;
}) => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const { message } = App.useApp();
  const space = useEnvironment();

  const {
    data: deployedProcesses,
    isLoading,
    refetch: refetchDeployedProcesses,
  } = useDeployments();

  const { filteredData, setSearchQuery: setSearchTerm } = useFuzySearch({
    data: deployedProcesses ?? [],
    keys: ['name'],
    highlightedKeys: ['name'],
    transformData: (matches) => matches.map((match) => match.item),
  });

  const [checkingProcessVersion, startCheckingProcessVersion] = useTransition();
  function checkProcessVersion(process: Pick<Process, 'id' | 'versions'>) {
    startCheckingProcessVersion(async () => {
      try {
        const processChangedSinceLastVersion = await processHasChangesSinceLastVersion(
          process.id,
          space.spaceId,
        );
        if (typeof processChangedSinceLastVersion === 'object')
          throw processChangedSinceLastVersion;

        if (processChangedSinceLastVersion) {
          alert('Process has changed since last version');
        }

        const v = process.versions
          .map((v) => v.id)
          .sort()
          .at(-1);

        await deployProcess(process.id, v as string, space.spaceId, 'dynamic');
        refetchDeployedProcesses();
      } catch (e) {
        message.error("Something wen't wrong");
      }
    });
  }

  const loading = isLoading || checkingProcessVersion;

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

      <DeploymentsList processes={filteredData} tableProps={{ loading }}></DeploymentsList>

      <DeploymentsModal
        open={modalIsOpen}
        close={() => setModalIsOpen(false)}
        processes={processes}
        folder={folder}
        favourites={favourites}
        selectProcess={(process) => {
          if (process.type === 'folder') return;
          // console.log(process);
          checkProcessVersion(process);
        }}
      ></DeploymentsModal>
    </div>
  );
};

export default DeploymentsView;
