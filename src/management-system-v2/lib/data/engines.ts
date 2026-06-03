'use server';

import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { EngineConnectionInput, EngineConnectionInputSchema } from '@/lib/space-engine-schema';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import {
  getErrorMessage,
  isUserErrorResponse,
  permissionDenied,
  schemaValidationError,
  userError,
} from '../user-error';
import { resolveEngines } from '../engines/engine-connections-helpers';
import { SpaceEngine } from '../engines/types';
import { EngineConnection, SystemAdmin } from '@prisma/client';

import db from '@/lib/data/db';
import { toCaslResource } from '../ability/caslAbility';
import { asyncMap } from '../helpers/javascriptHelpers';

export async function getEngineConnections(
  environmentId: string | null,
  ability?: Ability,
  systemAdmin?: SystemAdmin | 'dont-check',
) {
  // engines without an environmentId are PROCEED engines
  if (environmentId === null && systemAdmin !== 'dont-check' && !systemAdmin)
    throw new UnauthorizedError();

  const connections = await db.engineConnection.findMany({
    where: { environmentId: environmentId },
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

const EngineConnectionArraySchema = EngineConnectionInputSchema.array();
export async function addEngineConnections(
  connectionsInput: EngineConnectionInput[],
  environmentId: string | null,
) {
  const newConnections = EngineConnectionArraySchema.safeParse(connectionsInput);

  if (!newConnections.success) {
    return schemaValidationError();
  }

  const user = await getCurrentUser();

  if (environmentId) {
    const { ability } = await getCurrentEnvironment(environmentId);
    if (!ability.can('create', 'Machine')) return permissionDenied();
  } else if (!user.systemAdmin) {
    // connections without an environmentId are PROCEED engines
    return permissionDenied();
  }

  try {
    const data = await asyncMap(newConnections.data, async (connection) => {
      const reachableEngines = await resolveEngines([
        { ...connection, environmentId } as EngineConnection,
      ]);

      return {
        ...connection,
        environmentId,
        engines: {
          connectOrCreate: reachableEngines.map((e) => ({
            where: { id: e.id },
            create: { id: e.id, name: e.name },
          })),
        },
      };
    });

    const res = await db.$transaction(async (tx) => {
      return Promise.all(
        data.map((c) =>
          tx.engineConnection.create({
            data: c,
          }),
        ),
      );
    });

    return res;
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

  const newAddress = newConnectionData.data.address;
  let data;
  if (newAddress && newAddress !== connection.address) {
    const newEngines = await resolveEngines([
      { ...newConnectionData.data, environmentId } as EngineConnection,
    ]);

    data = {
      ...newConnectionData.data,
      engines: {
        // remove the relations to all engines that were reached using the old address
        disconnect: connection.engines,
        // add relations to all engines that are now reachable using the new address
        // (create entries for engines that were not previously known)
        connectOrCreate: newEngines.map((e) => ({
          where: { id: e.id },
          create: { id: e.id, name: e.name },
        })),
      },
    };
  } else {
    data = newConnectionData.data;
  }

  try {
    const res = await db.engineConnection.update({
      data,
      where: {
        environmentId,
        id: connectionId,
      },
    });

    return res;
  } catch (e) {
    return userError('Error updating engine connection.');
  }
}

export async function deleteEngineConnection(engineId: string, environmentId: string | null) {
  const user = await getCurrentUser();

  // engines without an environmentId are PROCEED engines
  if (environmentId === null && !user.systemAdmin) {
    return permissionDenied();
  }

  if (environmentId) {
    const { ability } = await getCurrentEnvironment(environmentId);

    const connection = await getEngineConnectionById(engineId, environmentId);
    if (!connection) return userError('Engine not found');

    if (
      !ability.can('delete', toCaslResource('Machine', connection), {
        environmentId: environmentId!,
      })
    ) {
      return permissionDenied();
    }
  }

  try {
    const res = await db.engineConnection.delete({
      where: {
        environmentId: environmentId,
        id: engineId,
      },
    });

    return res;
  } catch (e) {
    return userError('Error getting space engines');
  }
}
