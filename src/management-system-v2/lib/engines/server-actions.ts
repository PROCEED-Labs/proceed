'use server';

import db from '@/lib/data/db';

import { getSharedRefetch } from '../shared-refetch';
import { resolveEngines } from './engine-connections-helpers';
import { asyncMap } from '../helpers/javascriptHelpers';

async function refetchFn() {
  try {
    const connections = await db.engineConnection.findMany({
      include: { engines: { include: { engine: true } } },
    });

    const requests = await Promise.allSettled(connections.map(async (c) => resolveEngines([c])));

    const changes = await asyncMap(connections, async (c, index) => {
      const request = requests[index];
      const knownEngines = Object.fromEntries(c.engines.map((e) => [e.engineId, true]));
      type EngineInfo = {
        id: string;
        name?: string | null;
      };

      let becameReachable: EngineInfo[] = [];

      if (request.status === 'fulfilled') {
        for (const engine of request.value) {
          if (!knownEngines[engine.id]) {
            becameReachable.push(engine);
          }
        }
      } else {
        becameReachable = [];
      }

      return { becameReachable };
    });

    await db.$transaction(async (tx) => {
      await Promise.all([
        ...connections.flatMap((c, index) => {
          const { becameReachable } = changes[index];

          return [
            !!becameReachable.length &&
              tx.engineConnection.update({
                where: { id: c.id },
                data: {
                  engines: {
                    create: becameReachable.map(({ id, name }) => ({
                      engine: {
                        connectOrCreate: {
                          where: { id: id },
                          create: { id: id, name: name },
                        },
                      },
                    })),
                  },
                },
              }),
          ];
        }),
      ]);
    });
  } catch (err) {
    console.error('Error fetching engines: ', err);
  }
}

export const refetchEngines = getSharedRefetch({
  resource: 'Engines',
  refetchFn,
  getTimeoutLength: async () => 5000,
});
