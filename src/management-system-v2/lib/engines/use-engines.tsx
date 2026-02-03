import { useEnvironment } from '@/components/auth-can';
import { Engine, HttpEngine, MqttEngine, isHttpEngine, isMqttEngine } from './machines';
import { useCallback } from 'react';
import { getCorrectTargetEngines } from './server-actions';
import { useQuery } from '@tanstack/react-query';
import { asyncFilter } from '../helpers/javascriptHelpers';
import { truthyFilter } from '../typescript-utils';
import { isUserErrorResponse } from '../server-error-handling/user-error';

function useEngines(
  filter: { key: any[]; fn: (engine: Engine) => Promise<boolean> } = {
    key: [],
    fn: async () => true,
  },
) {
  const space = useEnvironment();

  const queryFn = useCallback(async () => {
    if (space.spaceId) {
      let res = await getCorrectTargetEngines(space.spaceId);
      if (isUserErrorResponse(res)) throw res.error;

      const knownEngines: Record<string, { http?: HttpEngine; mqtt?: MqttEngine }> = {};

      res = await asyncFilter(res, filter.fn);

      // prevent engines that are reachable in multiple ways (mqtt and http) to be returned twice
      for (const engine of res) {
        if (!knownEngines[engine.id]) {
          knownEngines[engine.id] = {
            http: isHttpEngine(engine) ? engine : undefined,
            mqtt: isMqttEngine(engine) ? engine : undefined,
          };
        } else {
          if (isHttpEngine(engine)) knownEngines[engine.id].http = engine;
          else if (isMqttEngine(engine)) knownEngines[engine.id].mqtt = engine;
        }
      }

      return Object.values(knownEngines).map(
        (entry) => Object.values(entry).filter(truthyFilter)[0],
      );
    }
  }, [space.spaceId, filter]);

  return useQuery({
    queryFn,
    queryKey: ['engines', space.spaceId, ...filter.key],
    refetchInterval: 5000,
  });
}

export default useEngines;
