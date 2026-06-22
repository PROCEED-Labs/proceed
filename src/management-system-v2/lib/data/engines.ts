'use server';

import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { EngineConnectionInput, EngineConnectionInputSchema } from '@/lib/space-engine-schema';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import {
  UserError,
  getErrorMessage,
  isUserError,
  isUserErrorResponse,
  permissionDenied,
  schemaValidationError,
  userError,
} from '../user-error';
import { resolveEngines } from '../engines/engine-connections-helpers';
import { EngineConnection, Prisma, SystemAdmin } from '@prisma/client';

import db from '@/lib/data/db';
import { toCaslResource } from '../ability/caslAbility';
import { Connection, Engine } from '../engines/types';
import { asyncMap } from '../helpers/javascriptHelpers';
import { engineRequest } from '../engines/endpoints';
import { cacheLife, cacheTag, revalidateTag } from 'next/cache';

export async function getEngineConnections(
  environmentId: string | null,
  ability?: Ability,
  systemAdmin?: SystemAdmin | 'dont-check',
) {
  // engines without an environmentId are PROCEED engines
  if (environmentId === null && systemAdmin !== 'dont-check' && !systemAdmin)
    throw new UnauthorizedError();

  async function getFromDBOrCache(environmentId: string | null) {
    'use cache';
    cacheLife({ revalidate: 10, expire: 15 });
    if (environmentId) {
      cacheTag(`space/${environmentId}/connections`);
    } else {
      cacheTag('ms/connections');
    }

    return await db.engineConnection.findMany({
      where: { environmentId: environmentId, removed: false },
      include: {
        engines: {
          include: { engine: true },
        },
      },
    });
  }

  let connections = await getFromDBOrCache(environmentId);
  connections = ability ? ability.filter('view', 'Machine', connections) : connections;

  return connections satisfies Connection[];
}

export async function getEngineById(environmentId: string | null | undefined, engineId: string) {
  if (environmentId !== undefined) {
    const { systemAdmin } = await getCurrentUser();
    if (environmentId === null && !systemAdmin) return permissionDenied();

    if (environmentId) {
      const { ability } = await getCurrentEnvironment(environmentId);
      if (!ability.can('view', 'Machine')) return permissionDenied();
    }
  }

  async function getFromDBOrCache(environmentId: string | null | undefined, engineId: string) {
    'use cache';
    cacheLife({ revalidate: 10, expire: 15 });
    cacheTag(`engine/${engineId}`);
    if (environmentId) {
      cacheTag(`space/${environmentId}/connections`);
    } else if (environmentId === null) {
      cacheTag('ms/connections');
    }

    let environmentFilter =
      environmentId !== undefined ? { some: { connection: { environmentId } } } : undefined;

    return await db.engine.findUnique({
      where: { id: engineId, connections: environmentFilter },
      include: { connections: { include: { connection: true } } },
    });
  }

  const engine = await getFromDBOrCache(environmentId, engineId);

  if (!engine) return engine;

  return engine satisfies Engine;
}

async function getAvailableEngines(environmentIds: (string | null)[]) {
  return await db.engine.findMany({
    where: {
      connections: {
        some: {
          reachable: true,
          connection: {
            AND: [{ removed: false }, { OR: environmentIds.map((id) => ({ environmentId: id })) }],
          },
        },
      },
    },
    include: { connections: { select: { reachable: true, connection: true } } },
  });
}

export async function getAvailableAdminEngines() {
  try {
    return getAvailableEngines([null]);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

/** Returns space engines that are currently reachable */
export async function getAvailableSpaceEngines(environmentId: string) {
  try {
    const { ability } = await getCurrentEnvironment(environmentId);
    if (!ability.can('view', 'Machine')) return permissionDenied();

    async function getFromDBOrCache(environmentId: string) {
      'use cache';
      cacheLife({ revalidate: 10, expire: 15 });
      cacheTag(`space/${environmentId}/connections`);

      const engines = await db.engine.findMany({
        where: {
          connections: {
            some: {
              reachable: true,
              connection: {
                AND: [{ removed: false }, { environmentId }],
              },
            },
          },
        },
        include: { connections: { select: { reachable: true, connection: true } } },
      });
      return engines.map((e) => ({ ...e, spaceEngine: true as const }));
    }

    return getFromDBOrCache(environmentId);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function getAllAvailableEngines(
  spaceId: string,
  ability?: Ability,
  skipAbilityCheck = false,
) {
  try {
    if (!ability && !skipAbilityCheck) ({ ability } = await getCurrentEnvironment(spaceId));

    return getAvailableEngines([spaceId, null]);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

function invalidateCache(environmentId: string | null, engines: string[] = []) {
  if (environmentId) {
    revalidateTag(`space/${environmentId}/connections`, 'max');
  } else {
    revalidateTag('ms/connections', 'max');
  }

  engines.forEach((id) => {
    revalidateTag(`engine/${id}`, 'max');
  });
}

export async function addEngineConnection(
  connectionInput: EngineConnectionInput,
  environmentId: string | null,
  tx?: Prisma.TransactionClient,
  skipAbilityCheck = false,
): Promise<void | { error: UserError }> {
  if (!tx) {
    return db.$transaction(async (tx) =>
      addEngineConnection(connectionInput, environmentId, tx, skipAbilityCheck),
    );
  }
  const newConnection = EngineConnectionInputSchema.safeParse(connectionInput);
  if (!newConnection.success) {
    return schemaValidationError();
  }

  const user = await getCurrentUser();

  if (!skipAbilityCheck) {
    if (environmentId) {
      const { ability } = await getCurrentEnvironment(environmentId);
      if (!ability.can('create', 'Machine')) return permissionDenied();
    } else if (!user.systemAdmin) {
      // connections without an environmentId are PROCEED engines
      return permissionDenied();
    }
  }

  try {
    const existingConnection = await tx.engineConnection.findFirst({
      where: { address: newConnection.data.address, environmentId },
    });

    if (existingConnection && !existingConnection.removed) {
      // we allow only one active connection entry with a specific address in a space
      return userError('There is already an engine with the same address.');
    }

    const reachableEngines = await resolveEngines([
      { ...newConnection.data, environmentId } as EngineConnection,
    ]);

    const connection = {
      ...newConnection.data,
      environmentId,
      removed: false,
    };

    const engineData = await asyncMap(reachableEngines, async (engine) => {
      const data = await engineRequest({
        engine,
        method: 'get',
        endpoint: '/machine/',
      });
      const configuration = await engineRequest({
        engine,
        method: 'get',
        endpoint: '/configuration/',
      });
      const logs = await engineRequest({
        engine,
        method: 'get',
        endpoint: '/logging/standard',
      });

      return { engine, data, configuration, logs };
    });

    const currentDate = new Date();

    if (existingConnection) {
      // reactivate an older entry if the address was already used before but removed
      await tx.engineConnection.update({
        where: { id: existingConnection.id },
        data: {
          ...connection,
          engines: {
            upsert: engineData.map(({ engine, data, configuration, logs }) => ({
              where: {
                engineId_connectionId: { engineId: engine.id, connectionId: existingConnection.id },
              },
              update: { reachable: true, lastContact: currentDate },
              create: {
                reachable: true,
                lastContact: currentDate,
                engine: {
                  connectOrCreate: {
                    where: { id: engine.id },
                    create: { id: engine.id, name: engine.name, data, configuration, logs },
                  },
                },
              },
            })),
          },
        },
      });
    } else {
      await tx.engineConnection.create({
        data: {
          ...connection,
          engines: {
            create: engineData.map(({ engine, data, configuration, logs }) => ({
              reachable: true,
              lastContact: currentDate,
              engine: {
                connectOrCreate: {
                  where: { id: engine.id },
                  create: { id: engine.id, name: engine.name, data, configuration, logs },
                },
              },
            })),
          },
        },
      });
    }

    invalidateCache(
      environmentId,
      engineData.map(({ engine }) => engine.id),
    );
  } catch (e) {
    console.error(`Failed to add a new engine connection: ${e}`);
    return userError('Error saving engine connections.');
  }
}

export async function updateEngineConnection(
  connectionId: string,
  connectionInput: Partial<EngineConnectionInput>,
  environmentId: string | null,
) {
  const newConnectionData = EngineConnectionInputSchema.partial().safeParse(connectionInput);

  if (!newConnectionData.success) {
    return schemaValidationError();
  }

  const user = await getCurrentUser();

  const connection = await db.engineConnection.findUnique({
    where: {
      environmentId: environmentId,
      id: connectionId,
    },
  });
  if (!connection) return userError('Engine not found');

  if (environmentId) {
    const { ability } = await getCurrentEnvironment(environmentId);

    if (
      !ability.can('update', toCaslResource('Machine', connection), {
        environmentId: environmentId!,
      })
    ) {
      return permissionDenied();
    }
  } else if (!user.systemAdmin) {
    // engines without an environmentId are PROCEED engines
    return permissionDenied();
  }

  try {
    const newAddress = newConnectionData.data.address;
    if (newAddress && newAddress !== connection.address) {
      return await db.$transaction(async (tx) => {
        await deleteEngineConnection(connection.id, environmentId, tx, true);
        const res = await addEngineConnection(
          {
            name: connection.name,
            ...newConnectionData.data,
            address: newAddress,
          },
          environmentId,
        );
        if (isUserErrorResponse(res)) throw res.error;
      });
    } else {
      const result = await db.engineConnection.update({
        data: newConnectionData.data,
        where: {
          environmentId,
          id: connectionId,
        },
      });

      invalidateCache(environmentId);

      return result;
    }
  } catch (e) {
    console.error(`Failed to update an engine connection: ${e}`);
    if (isUserError(e)) return userError(e.message, e.type);
    return userError('Error updating engine connection');
  }
}

export async function deleteEngineConnection(
  connectionId: string,
  environmentId: string | null,
  tx?: Prisma.TransactionClient,
  skipAbilityCheck = false,
) {
  const dbMutator = tx || db;
  const user = await getCurrentUser();

  // engines without an environmentId are PROCEED engines
  if (!skipAbilityCheck && environmentId === null && !user.systemAdmin) {
    return permissionDenied();
  }

  const connection = await dbMutator.engineConnection.findUnique({
    where: { id: connectionId, environmentId, removed: false },
    include: { engines: { select: { engineId: true } } },
  });
  if (!connection) return userError('Engine not found');

  if (environmentId && !skipAbilityCheck) {
    const { ability } = await getCurrentEnvironment(environmentId);

    if (
      !ability.can('delete', toCaslResource('Machine', connection), {
        environmentId: environmentId!,
      })
    ) {
      return permissionDenied();
    }
  }

  try {
    const res = await dbMutator.engineConnection.update({
      where: {
        environmentId: environmentId,
        id: connectionId,
      },
      data: {
        // mark the connection as removed but keep it for future reference in audit trails
        removed: true,
      },
    });

    invalidateCache(
      environmentId,
      connection.engines.map(({ engineId }) => engineId),
    );

    return res;
  } catch (e) {
    console.error(`Failed to remove an engine connection: ${e}`);
    return userError('Error deleting engine connection');
  }
}
