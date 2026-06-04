'use server';

import db from '@/lib/data/db';

import { getSharedRefetch } from '../shared-refetch';
import { resolveEngines } from './engine-connections-helpers';

async function refetchFn() {
  try {
    const connections = await db.engineConnection.findMany({
      include: { engines: { include: { engine: true } } },
    });

    const requests = await Promise.allSettled(connections.map(async (c) => resolveEngines([c])));

    const changes = connections.map((c, index) => {
      const request = requests[index];
      let notReachableAnymore = c.engines.reduce(
        (acc, { engine, reachable }) => {
          if (reachable) acc[engine.id] = true;
          return acc;
        },
        {} as Record<string, true>,
      );
      let becameReachable: { id: string; name?: string }[] = [];

      if (request.status === 'fulfilled') {
        request.value.forEach((e) => {
          if (notReachableAnymore[e.id]) {
            delete notReachableAnymore[e.id];
          } else {
            becameReachable.push(e);
          }
        });
      } else {
        becameReachable = [];
      }

      return { notReachableAnymore: Object.keys(notReachableAnymore), becameReachable };
    });

    await db.$transaction(async (tx) => {
      await Promise.all([
        ...connections.flatMap((c, index) => {
          const { notReachableAnymore, becameReachable } = changes[index];

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
            !!becameReachable.length &&
              tx.engineConnection.update({
                where: { id: c.id },
                data: {
                  engines: {
                    upsert: becameReachable.map((engine) => ({
                      where: { engineId_connectionId: { engineId: engine.id, connectionId: c.id } },
                      update: { reachable: true },
                      create: {
                        reachable: true,
                        engine: {
                          connectOrCreate: {
                            where: { id: engine.id },
                            create: { id: engine.id, name: engine.name },
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
