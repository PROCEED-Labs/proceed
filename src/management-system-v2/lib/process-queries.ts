import { useQuery } from '@tanstack/react-query';
import { get } from './fetch-data';

export const useProcessBpmn = (definitionId: string, version?: number | string | null) => {
  return useQuery({
    queryKey: ['process', definitionId, 'bpmn', version],
    queryFn: async () => {
      if (version) {
        const { data } = await get('/process/{definitionId}/versions/{version}', {
          params: {
            path: {
              definitionId,
              version: typeof version === 'number' ? version.toString() : version,
            },
          },
          parseAs: 'text',
        });

        return data;
      } else {
        const { data } = await get('/process/{definitionId}', {
          params: {
            path: {
              definitionId,
            },
          },
        });

        return data?.bpmn;
      }
    },
  });
};
