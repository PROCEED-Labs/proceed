'use client';

import { Button } from 'antd';
import { useState } from 'react';
import DeploymentsModal from './deployments-modal';
import Bar from '@/components/bar';
import useFuzySearch from '@/lib/useFuzySearch';
import DeploymentsList from './deployments-list';
import { Folder } from '@/lib/data/folder-schema';
import { ProcessMetadata } from '@/lib/data/process-schema';

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
        selectProcess={(id: string) => {}}
      ></DeploymentsModal>
    </div>
  );
};

export default DeploymentsView;
