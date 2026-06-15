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

    const currentDate = new Date();

    const changes = await asyncMap(connections, async (c, index) => {
      const request = requests[index];
      let notReachableAnymore = c.engines.reduce(
        (acc, { engine, reachable }) => {
          if (reachable) acc[engine.id] = true;
          return acc;
        },
        {} as Record<string, true>,
      );
      type EngineInfo = {
        id: string;
        name?: string | null;
      };

      let becameReachable: EngineInfo[] = [];
      let updated: EngineInfo[] = [];

      if (request.status === 'fulfilled') {
        for (const engine of request.value) {
          if (notReachableAnymore[engine.id]) {
            delete notReachableAnymore[engine.id];
            updated.push({ ...engine });
          } else {
            becameReachable.push({ ...engine });
          }
        }
      }

      return { notReachableAnymore: Object.keys(notReachableAnymore), becameReachable, updated };
    });

    await db.$transaction(async (tx) => {
      await Promise.all([
        ...connections.flatMap((c, index) => {
          const { notReachableAnymore, becameReachable, updated } = changes[index];

          return [
            !!notReachableAnymore.length &&
              tx.engineConnection.update({
                where: { id: c.id },
                data: {
                  engines: {
                    update: notReachableAnymore.map((engineId) => ({
                      where: { engineId_connectionId: { engineId, connectionId: c.id } },
                      data: { reachable: false },
                    })),
                  },
                },
              }),
            !!(becameReachable.length || updated.length) &&
              tx.engineConnection.update({
                where: { id: c.id },
                data: {
                  engines: {
                    upsert: [...becameReachable, ...updated].map(({ id, name }) => ({
                      where: { engineId_connectionId: { engineId: id, connectionId: c.id } },
                      update: {
                        reachable: true,
                        lastContact: currentDate,
                      },
                      create: {
                        reachable: true,
                        lastContact: currentDate,
                        engine: {
                          connectOrCreate: {
                            where: { id: id },
                            create: { id: id, name: name },
                          },
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
