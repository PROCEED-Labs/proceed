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
import { deployProcess } from '@/lib/engines/deployment';

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
  const space = useEnvironment();

  const deployedProcesses = processes
    .filter((process) => process.type !== 'folder')
    .map((process) => {
      return {
        id: process.id,
        name: process.name,
        versions: 4,
        runningInstances: 4,
        endedInstances: 2,
      };
    });

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
          .map((v) => v.version)
          .sort()
          .at(-1);

        deployProcess(process.id, v as number, space.spaceId, 'dynamic');
      } catch (e) {
        message.error("Something wen't wrong");
      }
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

      <DeploymentsList processes={filteredData}></DeploymentsList>

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
