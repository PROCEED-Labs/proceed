'use server';

import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { SpaceEngineInput, SpaceEngineInputSchema } from '@/lib/space-engine-schema';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { getErrorMessage, permissionDenied, schemaValidationError, userError } from '../user-error';
import { savedEnginesToEngines } from '../engines/saved-engines-helpers';
import { Engine } from '../engines/types';
import { SystemAdmin } from '@prisma/client';

import db from '@/lib/data/db';
import { toCaslResource } from '../ability/caslAbility';

export async function getDbEngines(
  environmentId: string | null,
  ability?: Ability,
  systemAdmin?: SystemAdmin | 'dont-check',
) {
  // engines without an environmentId are PROCEED engines
  if (environmentId === null && systemAdmin !== 'dont-check' && !systemAdmin)
    throw new UnauthorizedError();

  const engines = await db.engine.findMany({
    where: { environmentId: environmentId },
  });

  return ability ? ability.filter('view', 'Machine', engines) : engines;
}

export async function getDbEngineById(
  engineId: string,
  environmentId: string | null,
  ability?: Ability,
  systemAdmin?: SystemAdmin | 'dont-check',
) {
  // engines without an environmentId are PROCEED engines
  if (environmentId === null && systemAdmin !== 'dont-check' && !systemAdmin)
    throw new UnauthorizedError();

  const engine = await db.engine.findUnique({
    where: {
      environmentId: environmentId,
      id: engineId,
    },
  });

  if (!engine) return undefined;

  if (
    ability &&
    !ability.can('view', toCaslResource('Machine', engine), { environmentId: environmentId! })
  ) {
    throw new UnauthorizedError();
  }

  return engine;
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
    const dbEngines = await getDbEngines(null, undefined, 'dont-check');
    const engines = await savedEnginesToEngines(dbEngines);
    return getUniqueEngines(engines);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

/** Returns space engines that are currently online */
export async function getAvailableSpaceEngines(spaceId: string) {
  try {
    const { ability } = await getCurrentEnvironment(spaceId);
    const spaceEngines = await getDbEngines(spaceId, ability);
    const engines = await savedEnginesToEngines(spaceEngines);
    return getUniqueEngines(engines);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

export async function getAllAvailableEngines(spaceId: string, ability?: Ability) {
  try {
    if (!ability) ({ ability } = await getCurrentEnvironment(spaceId));

    let engines: Engine[] = [];
    const [proceedEngines, spaceEngines] = await Promise.allSettled([
      getDbEngines(null, undefined, 'dont-check').then(savedEnginesToEngines),
      getDbEngines(spaceId, ability).then(savedEnginesToEngines),
    ]);

    if (proceedEngines.status === 'fulfilled') engines = proceedEngines.value;
    if (spaceEngines.status === 'fulfilled') engines = engines.concat(spaceEngines.value);

    return getUniqueEngines(engines);
  } catch (e) {
    const message = getErrorMessage(e);
    return userError(message);
  }
}

const SpaceEngineArraySchema = SpaceEngineInputSchema.array();
export async function addDbEngines(enginesInput: SpaceEngineInput[], environmentId: string | null) {
  const newEngines = SpaceEngineArraySchema.safeParse(enginesInput);

  if (!newEngines.success) {
    return schemaValidationError();
  }

  const user = await getCurrentUser();

  if (environmentId) {
    const { ability } = await getCurrentEnvironment(environmentId);
    if (!ability.can('create', 'Machine')) return permissionDenied();
  } else if (!user.systemAdmin) {
    // engines without an environmentId are PROCEED engines
    return permissionDenied();
  }

  try {
    const res = await db.engine.createMany({
      data: newEngines.data.map((e) => ({ ...e, environmentId: environmentId ?? null })),
    });

    return res;
  } catch (e) {
    return userError('Error getting space engines');
  }
}

const PartialSpaceEngineInputSchema = SpaceEngineInputSchema.partial();
export async function updateDbEngine(
  engineId: string,
  engineInput: Partial<SpaceEngineInput>,
  environmentId: string | null,
) {
  const newEngineData = PartialSpaceEngineInputSchema.safeParse(engineInput);

  if (!newEngineData.success) {
    return schemaValidationError();
  }

  const user = await getCurrentUser();

  if (environmentId) {
    const { ability } = await getCurrentEnvironment(environmentId);

    const engine = await db.engine.findUnique({
      where: {
        environmentId: environmentId,
        id: engineId,
      },
    });

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
    const res = await db.engine.update({
      data: newEngineData.data,
      where: {
        environmentId,
        id: engineId,
      },
    });

    return res;
  } catch (e) {
    return userError('Error getting space engines');
  }
}

export async function deleteDbEngine(engineId: string, environmentId: string | null) {
  const user = await getCurrentUser();

  // engines without an environmentId are PROCEED engines
  if (environmentId === null && !user.systemAdmin) {
    return permissionDenied();
  }

  if (environmentId) {
    const { ability } = await getCurrentEnvironment(environmentId);

    const engine = await db.engine.findUnique({
      where: {
        environmentId: environmentId,
        id: engineId,
      },
    });

    if (!engine) return userError('Engine not found');

    if (
      !ability.can('delete', toCaslResource('Machine', engine), { environmentId: environmentId! })
    ) {
      return permissionDenied();
    }
  }

  try {
    const res = await db.engine.delete({
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
