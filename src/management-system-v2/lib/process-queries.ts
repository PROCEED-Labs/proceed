import { useQuery } from '@tanstack/react-query';
import { fetchProcesses, fetchProcess, fetchProcessVersionBpmn } from './fetch-data';

export const useProcesses = () => {
  return useQuery({
    queryKey: ['processes'],
    queryFn: () => fetchProcesses(),
  });
};

export const useProcess = (definitionId: string) => {
  return useQuery({
    queryKey: [`process/${definitionId}`],
    queryFn: () => fetchProcess(definitionId),
  });
};

export const useProcessBpmn = (definitionId: string, version?: number | string | null) => {
  return useQuery({
    queryKey: ['process', definitionId, 'bpmn', version],
    queryFn: () => {
      if (version) {
        return fetchProcessVersionBpmn(definitionId, version);
      } else {
        return fetchProcess(definitionId).then((processData) => processData.bpmn!);
      }
    },
  });
};
