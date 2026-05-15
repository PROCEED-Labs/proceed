'use server';

import { SpaceEngineInput, SpaceEngineInputSchema } from '@/lib/space-engine-schema';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { permissionDenied, schemaValidationError, userError } from '../user-error';
import { toCaslResource } from '../ability/caslAbility';
import { cacheLife, cacheTag, updateTag } from 'next/cache';

import db from '@/lib/data/db';
import { savedEnginesToEngines } from '../engines/saved-engines-helpers';
import Ability, { UnauthorizedError } from '../ability/abilityHelper';
import { SystemAdmin } from '@prisma/client';
import { Engine } from '../engines/machines';

/**
 * Function that returns stored engines extended with the reachable machines they reference
 *
 * The return value is cached so that the engines are checked at most once every 5 seconds to reduce
 * the amount of requests between the MS and the stored engines in case multiple users access this
 * information
 *
 * this function is supposed to be used in other functions that handle the authorization checking
 * and subsequent filtering of engines based on the needs of the calling function
 **/
async function getSavedEnginesWithMachines(environmentId: string | null) {
  'use cache';
  cacheLife({ revalidate: 5, expire: 10 });
  if (environmentId) {
    cacheTag(`space/${environmentId}/engines`);
  } else {
    cacheTag('ms/engines');
  }

  const engines = await db.engine.findMany({
    where: { environmentId: environmentId },
  });

  return await savedEnginesToEngines(engines);
}

export async function getEnginesWithMachines(
  environmentId: string | null,
  ability?: Ability,
  systemAdmin?: SystemAdmin | 'dont-check',
) {
  // engines without an environmentId are PROCEED engines
  if (environmentId === null && systemAdmin !== 'dont-check' && !systemAdmin)
    throw new UnauthorizedError();

  let engines = await getSavedEnginesWithMachines(environmentId);

  engines = ability ? ability.filter('view', 'Machine', engines) : engines;

  return engines;
}

export async function getEngineWithMachinesById(
  engineId: string,
  environmentId: string | null,
  ability?: Ability,
  systemAdmin?: SystemAdmin | 'dont-check',
) {
  const engines = await getEnginesWithMachines(environmentId, ability, systemAdmin);

  const engine = engines.find((e) => e.id === engineId);
  if (!engine) return undefined;

  if (
    ability &&
    !ability.can('view', toCaslResource('Machine', engine), { environmentId: environmentId! })
  ) {
    throw new UnauthorizedError();
  }

  return engine;
}

function getUniqueMachines(machines: Engine[]) {
  // some machines might occur multiple times
  // (e.g. they are reachable through a saved HTTP engine and over a saved MQTT broker)
  const uniqueMachines = machines.reduce(
    (uniqueMap, machine) => {
      if (!uniqueMap[machine.id]) {
        uniqueMap[machine.id] = machine;
      } else if (uniqueMap[machine.id].type === 'mqtt' && machine.type === 'http') {
        // prefer http over mqtt since we can establish a more direct connection
        uniqueMap[machine.id] = machine;
      }

      return uniqueMap;
    },
    {} as Record<string, Engine>,
  );

  return Object.values(uniqueMachines);
}

/**
 * Returns the currently reachable machines for the engines stored in the PROCEED admin dashboard
 *
 * @param [dontCheck=false] flag that tells the function to skip checking if the user is an admin
 **/
export async function getAvailableAdminMachines(dontCheck = false) {
  if (!dontCheck) {
    const { systemAdmin } = await getCurrentUser();
    if (!systemAdmin) throw new UnauthorizedError();
  }

  let engines = await getSavedEnginesWithMachines(null);
  return getUniqueMachines(engines.flatMap((e) => e.machines));
}

export async function getAvailableSpaceMachines(environmentId: string, ability?: Ability) {
  let engines = await getSavedEnginesWithMachines(environmentId);

  if (!ability) ({ ability } = await getCurrentEnvironment(environmentId));
  engines = ability.filter('view', 'Machine', engines);

  return getUniqueMachines(engines.flatMap((e) => e.machines));
}

export async function getAllAvailableMachines(environmentId: string, skipAbilityCheck = false) {
  let [proceedEngines, spaceEngines] = await Promise.all([
    getSavedEnginesWithMachines(null),
    getSavedEnginesWithMachines(environmentId),
  ]);

  if (!skipAbilityCheck) {
    const { ability } = await getCurrentEnvironment(environmentId);
    spaceEngines = ability.filter('view', 'Machine', spaceEngines);
  }

  return getUniqueMachines([
    ...proceedEngines.flatMap((e) => e.machines),
    ...spaceEngines.flatMap((e) => e.machines),
  ]);
}

export async function getMachineIfAvailable(environmentId: string, machineId: string) {
  const { ability } = await getCurrentEnvironment(environmentId);
  const machines = await getAvailableSpaceMachines(environmentId, ability);
  return machines.find((m) => m.id === machineId);
}

function invalidateCache(environmentId: string | null) {
  if (environmentId) {
    updateTag(`space/${environmentId}/engines`);
  } else {
    updateTag('ms/engines');
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

    invalidateCache(environmentId);

    return res;
  } catch (e) {
    return userError('Something went wrong');
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

    invalidateCache(environmentId);

    return res;
  } catch (e) {
    return userError('Something went wrong');
  }
}

export async function deleteSpaceEngine(engineId: string, environmentId: string | null) {
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

    invalidateCache(environmentId);

    return res;
  } catch (e) {
    return userError('Something went wrong');
  }
}
