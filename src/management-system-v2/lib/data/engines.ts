'use server';

import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { EngineConnectionInput, EngineConnectionInputSchema } from '@/lib/space-engine-schema';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import {
  UserError,
  getErrorMessage,
  isUserErrorResponse,
  permissionDenied,
  schemaValidationError,
  userError,
} from '../user-error';
import { resolveEngines } from '../engines/engine-connections-helpers';
import { Engine, SpaceEngine } from '../engines/types';
import { EngineConnection, Prisma, SystemAdmin } from '@prisma/client';

import db from '@/lib/data/db';
import { toCaslResource } from '../ability/caslAbility';

export async function getEngineConnections(
  environmentId: string | null,
  ability?: Ability,
  systemAdmin?: SystemAdmin | 'dont-check',
) {
  // engines without an environmentId are PROCEED engines
  if (environmentId === null && systemAdmin !== 'dont-check' && !systemAdmin)
    throw new UnauthorizedError();

  const connections = await db.engineConnection.findMany({
    where: { environmentId: environmentId, removed: false },
  });

  return ability ? ability.filter('view', 'Machine', connections) : connections;
}

export async function getEngineConnectionById(
  connectionId: string,
  environmentId: string | null,
  ability?: Ability,
  systemAdmin?: SystemAdmin | 'dont-check',
) {
  // engines without an environmentId are PROCEED engines
  if (environmentId === null && systemAdmin !== 'dont-check' && !systemAdmin)
    throw new UnauthorizedError();

  const connection = await db.engineConnection.findUnique({
    where: {
      environmentId: environmentId,
      id: connectionId,
      removed: false,
    },
  });

  if (!connection) return undefined;

  if (
    ability &&
    !ability.can('view', toCaslResource('Machine', connection), { environmentId: environmentId! })
  ) {
    throw new UnauthorizedError();
  }

  return connection;
}

function getUniqueEngines(engines: Engine[]) {
  // some engines might occur multiple times
  // (e.g. they are reachable through a saved HTTP engine and over a saved MQTT broker)
  const uniqueEngines = engines.reduce(
    (uniqueMap, engine) => {
      if (!uniqueMap[engine.id]) {
        uniqueMap[engine.id] = engine;
      } else if (uniqueMap[engine.id].type === 'mqtt' && engine.type === 'http') {
        // prefer http over mqtt since we can establish a more direct connection
        uniqueMap[engine.id] = engine;
      }
      return uniqueMap;
    },
    {} as Record<string, Engine>,
  );
  return Object.values(uniqueEngines);
}

export async function getAvailableAdminEngines() {
  try {
    const connections = await getEngineConnections(null, undefined, 'dont-check');
    const engines = await resolveEngines(connections);
    return getUniqueEngines(engines);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

/** Returns space engines that are currently online */
export async function getAvailableSpaceEngines(spaceId: string, ability?: Ability) {
  try {
    if (!ability) ({ ability } = await getCurrentEnvironment(spaceId));
    const connections = await getEngineConnections(spaceId, ability);
    const engines = await resolveEngines(connections);
    return getUniqueEngines(engines) as SpaceEngine[];
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

    let engines: Engine[] = [];
    const [proceedEngines, spaceEngines] = await Promise.allSettled([
      getEngineConnections(null, undefined, 'dont-check').then(resolveEngines),
      getEngineConnections(spaceId, ability).then(resolveEngines),
    ]);

    if (proceedEngines.status === 'fulfilled') engines = proceedEngines.value;
    if (spaceEngines.status === 'fulfilled') engines = engines.concat(spaceEngines.value);

    return getUniqueEngines(engines);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function getEngineIfAvailable(
  environmentId: string,
  engineId: string,
  ability?: Ability,
) {
  const engines = await getAvailableSpaceEngines(environmentId, ability);
  if (isUserErrorResponse(engines)) return engines;
  return engines.find((e) => e.id === engineId);
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

    const currentDate = new Date();

    if (existingConnection) {
      // reactivate an older entry if the address was already used before but removed
      await tx.engineConnection.update({
        where: { id: existingConnection.id },
        data: {
          ...connection,
          engines: {
            upsert: reachableEngines.map((engine) => ({
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
                    create: { id: engine.id, name: engine.name },
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
            create: reachableEngines.map((engine) => ({
              reachable: true,
              lastContact: currentDate,
              engine: {
                connectOrCreate: {
                  where: { id: engine.id },
                  create: { id: engine.id, name: engine.name },
                },
              },
            })),
          },
        },
      });
    }
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
      return await db.engineConnection.update({
        data: newConnectionData.data,
        where: {
          environmentId,
          id: connectionId,
        },
      });
    }
  } catch (e) {
    console.error(`Failed to update an engine connection: ${e}`);
    return userError('Error updating engine connection.');
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
  if (skipAbilityCheck && environmentId === null && !user.systemAdmin) {
    return permissionDenied();
  }

  const connection = await dbMutator.engineConnection.findUnique({
    where: { id: engineId, environmentId },
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
    const res = await db.engineConnection.update({
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
    console.error(`Failed to remove an engine connection: ${e}`);
    return userError('Error deleting engine connection');
  }
}
