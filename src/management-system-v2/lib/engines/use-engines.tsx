import { Engine } from './machines';
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { asyncFilter } from '../helpers/javascriptHelpers';
import { getAllAvailableEngines } from '../data/engines';
import { isUserErrorResponse } from '../user-error';

function useEngines(
  space: { spaceId: string; isOrganization: boolean },
  filter: { key: any[]; fn: (engine: Engine) => Promise<boolean> } = {
    key: [],
    fn: async () => true,
  },
) {
  const queryFn = useCallback(async () => {
    if (space.spaceId) {
      let res = await getAllAvailableEngines(space.spaceId);

      if (isUserErrorResponse(res)) return [];

      return await asyncFilter(res, filter.fn);
    }
    return null;
  }, [space.spaceId, filter]);

  return useQuery({
    queryFn,
    queryKey: ['engines', space.spaceId, ...filter.key],
    refetchInterval: 5000,
  });
}

export default useEngines;
