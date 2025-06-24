import { useEnvironment } from '@/components/auth-can';
import { Engine } from './machines';
import { useCallback } from 'react';
import { getCorrectTargetEngines } from './server-actions';
import { useQuery } from '@tanstack/react-query';
import { asyncFilter } from '../helpers/javascriptHelpers';

function useEngines(
  filter: { key: any[]; fn: (engine: Engine) => Promise<boolean> } = {
    key: [],
    fn: async () => true,
  },
) {
  const space = useEnvironment();

  const queryFn = useCallback(async () => {
    if (space.spaceId) {
      const res = await getCorrectTargetEngines(space.spaceId);
      return asyncFilter(res, filter.fn);
    }
  }, [space.spaceId, filter]);

  return useQuery({
    queryFn,
    queryKey: ['engines', space.spaceId, ...filter.key],
    refetchInterval: 5000,
  });
}

export default useEngines;
