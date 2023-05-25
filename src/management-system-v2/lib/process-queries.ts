import { useQuery } from '@tanstack/react-query';
import { fetchProcesses } from './fetch-data';

export const useProcesses = () => {
  return useQuery({
    queryKey: ['processes'],
    queryFn: () => fetchProcesses(),
  });
};
