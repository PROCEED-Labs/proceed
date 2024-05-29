'use client';
import ProcessList from './process-list';
import { Process } from '@/lib/data/process-schema';
import Button, { ButtonGroup } from '@atlaskit/button';
import { deleteProcesses, updateProcess } from '@/lib/data/processes';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEnvironment } from '@/components/auth-can';
import ProcessModal from './process-modal';

const ActionButtons = ({ process }: { process: Process }) => {
  const { spaceId } = useEnvironment();
  const router = useRouter();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isModelerOpen, setIsModelerOpen] = useState(false);

  const closeEditModal = (values?: { name: string; description: string }) => {
    if (window && window.AP) {
      console.log('get Token', window.AP.context);
      window.AP.context.getToken((token) => {
        console.log('JWT Token', token);
        getSpaces(token)
          .then((res) => {
            console.log('getSpaces result', res);
            return res.json();
          })
          .then((res) => {
            console.log('json result', res);
          });
      });
    }

    if (values) {
      if ('origin' in process) {
        console.log('changed confluence process');
      } else {
        updateProcess(process.id, spaceId, undefined, values.description, values.name).then(() =>
          router.refresh(),
        );
      }
    }

    setIsEditModalOpen(false);
  };

  const closeModeler = () => {
    setIsModelerOpen(false);
  };

  const deleteProcess = (id: string) => {
    deleteProcesses([id], spaceId).then(() => router.refresh());
  };

  return (
    <>
      <ButtonGroup>
        <Button
          onClick={() => {
            setIsModelerOpen(true);
          }}
          appearance="primary"
        >
          Open
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
      <ProcessModal
        title="Edit Process"
        processData={process}
        open={isEditModalOpen}
        close={closeEditModal}
      ></ProcessModal>
    </>
  );
};

const ManagableProcessList = ({ processes }: { processes: Process[] }) => {
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
