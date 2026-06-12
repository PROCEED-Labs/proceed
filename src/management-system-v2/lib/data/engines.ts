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

export async function getEngineConnections(
  environmentId: string | null,
  ability?: Ability,
  systemAdmin?: SystemAdmin | 'dont-check',
) {
  // engines without an environmentId are PROCEED engines
  if (environmentId === null && systemAdmin !== 'dont-check' && !systemAdmin)
    throw new UnauthorizedError();

  let connections = await db.engineConnection.findMany({
    where: { environmentId: environmentId, removed: false },
    include: {
      engines: {
        include: { engine: true },
      },
    },
  });

  connections = ability ? ability.filter('view', 'Machine', connections) : connections;

  return connections satisfies Connection[];
}

export async function getEngineById(environmentId: string | null | undefined, engineId: string) {
  let environmentFilter;
  if (environmentId) {
    const { systemAdmin } = await getCurrentUser();
    if (environmentId === null && !systemAdmin) return permissionDenied();

    if (environmentId) {
      const { ability } = await getCurrentEnvironment(environmentId);
      if (!ability.can('view', 'Machine')) return permissionDenied();
    }
    environmentFilter = { some: { connection: { environmentId } } };
  } else {
    environmentFilter = undefined;
  }

  const engine = await db.engine.findUnique({
    where: { id: engineId, connections: environmentFilter },
    include: { connections: { include: { connection: true } } },
  });

  if (!engine) return engine;

  return engine satisfies Engine;
}

async function getAvailableEngines(environmentIds: (string | null)[], ability?: Ability) {
  if (ability && !ability.can('view', 'Machine')) return [];

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

/** Returns space engines that are currently online */
export async function getAvailableSpaceEngines(environmentId: string, ability?: Ability) {
  try {
    const engines = await getAvailableEngines([environmentId], ability);
    return engines.map((e) => ({ ...e, spaceEngine: true as const }));
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

export async function addEngineConnection(
  connectionsInput: EngineConnectionInput,
  environmentId: string | null,
  tx?: Prisma.TransactionClient,
  skipAbilityCheck = false,
): Promise<void | { error: UserError }> {
  if (!tx) {
    return db.$transaction(async (tx) =>
      addEngineConnection(connectionsInput, environmentId, tx, skipAbilityCheck),
    );
  }
  const newConnection = EngineConnectionInputSchema.safeParse(connectionsInput);
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

    // get all engines that can be reached through the connection
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
              update: { reachable: true },
              create: {
                reachable: true,
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
  } catch (e) {
    return userError('Error saving engine connections.');
  }
}

const PartialEngineConnectionInputSchema = EngineConnectionInputSchema.partial();
export async function updateEngineConnection(
  connectionId: string,
  connectionInput: Partial<EngineConnectionInput>,
  environmentId: string | null,
) {
  const newConnectionData = PartialEngineConnectionInputSchema.safeParse(connectionInput);

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
        // keep the entry with the old id for future reference and create a new entry for the new
        // address as long as that address is not already in use by another connection in the space
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
      return await db.engineConnection.update({
        data: newConnectionData.data,
        where: {
          environmentId,
          id: connectionId,
        },
      });
    }
  } catch (e) {
    if (isUserError(e)) return userError(e.message, e.type);
    return userError('Error updating engine connection');
  }
}

export async function deleteEngineConnection(
  engineId: string,
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
    where: { id: engineId, environmentId, removed: false },
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
        id: engineId,
      },
      data: {
        // mark the connection as removed but keep it for future reference in audit trails
        removed: true,
      },
    });

    return res;
  } catch (e) {
    return userError('Error getting space engines');
  }
}
