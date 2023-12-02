import { Dispatch, FC, Key, SetStateAction, useMemo } from 'react';

import ProcessCreationModal from './process-creation';
import { useGetAsset } from '@/lib/fetch-data';

import { generateDefinitionsId } from '@proceed/bpmn-helper';

type ProcessCopyModalType = {
  setCopyProcessIds: Dispatch<SetStateAction<string[]>> | Dispatch<SetStateAction<Key[]>>;
  processKeys: React.Key[] | String[];
  setSelection: Dispatch<SetStateAction<Key[]>>;
};

const ProcessCopyModal: FC<ProcessCopyModalType> = ({
  setCopyProcessIds,
  processKeys,
  setSelection,
}) => {
  const { data } = useGetAsset('/process', {
    params: {
      query: { noBpmn: false },
    },
  });

  // get the process data that is needed to create copies of the processes
  const blueprintForProcesses = useMemo(() => {
    return (data || [])
      .filter((process) => processKeys.includes(process.definitionId))
      .map((process) => ({
        definitionId: generateDefinitionsId(),
        definitionName: `${process.definitionName} (Copy)`,
        description: process.description,
        bpmn: process.bpmn!,
        originalId: process.definitionId,
      }));
    /*
    Do not include data as dependency
    The Blue-Print should only be determined by the processKeys
    */
  }, [processKeys]);

  // change the selection from the processes to be copied to the newly created process copies
  const handleCopyCreated = (definitionId: string) => {
    const blueprint = blueprintForProcesses.find((bp) => bp.definitionId === definitionId);
    if (blueprint) {
      setSelection((prev) => [
        ...prev.filter((definitionId) => definitionId !== blueprint.originalId),
        definitionId,
      ]);
    }
  };

  return (
    <ProcessCreationModal
      processesData={blueprintForProcesses}
      creationType="Copy"
      title={`Copy Process${processKeys.length > 1 ? 'es' : ''}`}
      onCancel={() => setCopyProcessIds([])}
      onCreated={handleCopyCreated}
    ></ProcessCreationModal>
  );
};

export default ProcessCopyModal;
