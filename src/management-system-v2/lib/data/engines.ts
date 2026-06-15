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
import { Engine, SpaceEngine } from '../engines/types';
import { SystemAdmin } from '@prisma/client';

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
    const res = await db.engineConnection.createMany({
      data: newConnections.data.map((e) => ({ ...e, environmentId: environmentId ?? null })),
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

  if (environmentId) {
    const { ability } = await getCurrentEnvironment(environmentId);

    const engine = await getEngineConnectionById(connectionId, environmentId);
    if (!engine) return userError('Engine not found');

    if (
      !ability.can('update', toCaslResource('Machine', engine), { environmentId: environmentId! })
    ) {
      return permissionDenied();
    }
  } else if (!user.systemAdmin) {
    // engines without an environmentId are PROCEED engines
    return permissionDenied();
  }

  try {
    const res = await db.engineConnection.update({
      data: newConnectionData.data,
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
