'use client';
import ProcessList, { ConfluenceProceedProcess } from './process-list';
import { Process } from '@/lib/data/process-schema';
import Button, { ButtonGroup } from '@atlaskit/button';
import { deleteProcesses, updateProcess } from '@/lib/data/processes';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEnvironment } from '@/components/auth-can';
import ProcessModal from './process-modal';
import ProcessExportModal from '@/components/process-export';

const ActionButtons = ({ process }: { process: Process }) => {
  const { spaceId } = useEnvironment();
  const router = useRouter();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const closeEditModal = async (values?: { name: string; description: string }) => {
    if (values) {
      updateProcess(process.id, spaceId, undefined, values.description, values.name).then(() =>
        router.refresh(),
      );
    }

    setIsEditModalOpen(false);
  };

  const deleteProcess = (id: string) => {
    deleteProcesses([id], spaceId).then(() => router.refresh());
  };

  return (
    <>
      <ButtonGroup>
        <Button
          onClick={() => {
            setIsExportModalOpen(true);
          }}
        >
          Export
        </Button>
        <Button
          onClick={() => {
            setIsEditModalOpen(true);
          }}
        >
          Edit
        </Button>
        <Button
          onClick={() => {
            deleteProcess(process.id);
          }}
        >
          Delete
        </Button>
      </ButtonGroup>
      <ProcessExportModal
        processes={[{ definitionId: process.id }]}
        open={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
      <ProcessModal
        title="Edit Process"
        processData={process}
        open={isEditModalOpen}
        close={closeEditModal}
      ></ProcessModal>
    </>
  );
};

const ManagableProcessList = ({ processes }: { processes: ConfluenceProceedProcess[] }) => {
  return (
    <div style={{ padding: '1rem', width: '100%' }}>
      <ProcessList
        processes={processes}
        ActionButtons={({ process }: { process: Process }) => <ActionButtons process={process} />}
      ></ProcessList>
    </div>
  );
};

export default ManagableProcessList;
