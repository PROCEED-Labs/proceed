import { useEnvironment } from '@/components/auth-can';
import { getDeployments } from '@/lib/engines/deployment';
import useEngines from '@/lib/engines/use-engines';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

function useDeployments(entries?: string) {
  const space = useEnvironment();

  const { data: engines } = useEngines(space);

  const queryFn = useCallback(async () => {
    if (engines) {
      return await getDeployments(engines, entries);
    }

    return null;
  }, [engines, entries]);

  const query = useQuery({
    queryFn,
    queryKey: ['processDeployments', space.spaceId],
    refetchInterval: 1000,
  });

  return { engines, deployments: query.data, ...query };
}

export default useDeployments;
