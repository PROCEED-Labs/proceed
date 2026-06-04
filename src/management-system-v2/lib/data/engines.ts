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
import { SpaceEngine } from '../engines/types';
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

export async function getAvailableAdminEngines() {
  try {
    const connections = await getEngineConnections(null, undefined, 'dont-check');
    return await resolveEngines(connections);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

/** Returns space engines that are currently online */
export async function getAvailableSpaceEngines(spaceId: string) {
  try {
    const { ability } = await getCurrentEnvironment(spaceId);
    const connections = await getEngineConnections(spaceId, ability);
    return (await resolveEngines(connections)) as SpaceEngine[];
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

    const [proceedConnections, spaceConnections] = await Promise.allSettled([
      getEngineConnections(null, undefined, 'dont-check'),
      getEngineConnections(spaceId, ability),
    ]);

    let connections: EngineConnection[] = [];
    if (proceedConnections.status === 'fulfilled') connections = proceedConnections.value;
    if (spaceConnections.status === 'fulfilled')
      connections = connections.concat(spaceConnections.value);

    return resolveEngines(connections);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function getEngineIfAvailable(environmentId: string, engineId: string) {
  const engines = await getAvailableSpaceEngines(environmentId);
  if (isUserErrorResponse(engines)) return engines;
  return engines.find((e) => e.id === engineId);
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
    // get all engines that can be reached through the connection
    const reachableEngines = await resolveEngines([
      { ...newConnection.data, environmentId } as EngineConnection,
    ]);
    const connection = {
      ...newConnection.data,
      environmentId,
      removed: false,
      engines: {
        connectOrCreate: reachableEngines.map((e) => ({
          where: { id: e.id },
          create: { id: e.id, name: e.name },
        })),
      },
    };

    const existingConnection = await tx.engineConnection.findFirst({
      where: { address: connection.address, environmentId },
    });

    if (existingConnection && !existingConnection.removed) {
      // we allow only one active connection entry with a specific address in a space
      return userError('There is already an engine with the same address.');
    } else if (existingConnection) {
      // reactivate an older entry if the address was already used before but removed
      await tx.engineConnection.update({
        where: { id: existingConnection.id },
        data: connection,
      });
    } else {
      await tx.engineConnection.create({
        data: connection,
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
    include: { engines: { select: { id: true } } },
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
