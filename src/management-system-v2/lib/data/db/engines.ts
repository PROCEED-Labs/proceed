'use server';

import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { toCaslResource } from '@/lib/ability/caslAbility';
import db from '@/lib/data/db';
import { Engine } from '@/lib/engines/machines';
import { savedEnginesToEngines } from '@/lib/engines/saved-engines-helpers';
import { SpaceEngineInput, SpaceEngineInputSchema } from '@/lib/space-engine-schema';
import { Prisma, SystemAdmin } from '@prisma/client';
import { cacheLife, cacheTag, updateTag } from 'next/cache';

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

export async function getAvailableMachines(
  environmentId: string | null,
  ability?: Ability,
  systemAdmin?: SystemAdmin | 'dont-check',
) {
  // engines without an environmentId are PROCEED engines
  if (environmentId === null && systemAdmin !== 'dont-check' && !systemAdmin)
    throw new UnauthorizedError();

  let engines = await getSavedEnginesWithMachines(environmentId);

  engines = ability ? ability.filter('view', 'Machine', engines) : engines;

  const machines = engines.flatMap((e) => e.machines);

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

async function getDbEngineById(
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

export async function getDbEngineByAddress(
  address: string,
  spaceId: string | null,
  ability?: Ability,
  systemAdmin?: SystemAdmin | 'dont-check',
  tx?: Prisma.TransactionClient,
) {
  const dbMutator = tx || db;
  // engines without an environmentId are PROCEED engines
  if (spaceId === null && systemAdmin !== 'dont-check' && !systemAdmin)
    throw new UnauthorizedError();

  const engine = await dbMutator.engine.findFirst({
    where: {
      environmentId: spaceId,
      address,
    },
  });

  if (!engine) {
    if (ability && !ability.can('view', 'Machine')) throw new UnauthorizedError();
    return undefined;
  }

  if (
    ability &&
    !ability.can('view', toCaslResource('Machine', engine), { environmentId: spaceId! })
  )
    throw new UnauthorizedError();

  return engine;
}

const SpaceEngineArraySchema = SpaceEngineInputSchema.array();
export async function addDbEngines(
  enginesInput: SpaceEngineInput[],
  environmentId: string | null,
  ability?: Ability,
  systemAdmin?: SystemAdmin | 'dont-check',
) {
  // engines without an environmentId are PROCEED engines
  if (environmentId === null && systemAdmin !== 'dont-check' && !systemAdmin)
    throw new UnauthorizedError();

  const newEngines = SpaceEngineArraySchema.parse(enginesInput);

  if (ability && !ability.can('create', 'Machine')) throw new UnauthorizedError();

  const res = await db.engine.createMany({
    data: newEngines.map((e) => ({ ...e, environmentId: environmentId ?? null })),
  });

  if (environmentId) {
    updateTag(`space/${environmentId}/engines`);
  } else {
    updateTag('ms/engines');
  }

  return res;
}

const PartialSpaceEngineInputSchema = SpaceEngineInputSchema.partial();
export async function updateDbEngine(
  engineId: string,
  engineInput: Partial<SpaceEngineInput>,
  environmentId: string | null,
  ability?: Ability,
  systemAdmin?: SystemAdmin | 'dont-check',
) {
  // engines without an environmentId are PROCEED engines
  if (environmentId === null && systemAdmin !== 'dont-check' && !systemAdmin)
    throw new UnauthorizedError();

  const newEngineData = PartialSpaceEngineInputSchema.parse(engineInput);

  if (ability) {
    const engine = await getDbEngineById(engineId, environmentId, ability, systemAdmin);
    if (!engine) throw new Error('Engine not found');
    if (
      !ability.can('update', toCaslResource('Machine', engine), { environmentId: environmentId! })
    )
      throw new UnauthorizedError();
  }

  const res = await db.engine.update({
    data: newEngineData,
    where: {
      environmentId,
      id: engineId,
    },
  });

  if (environmentId) {
    updateTag(`space/${environmentId}/engines`);
  } else {
    updateTag('ms/engines');
  }

  return res;
}

export async function deleteSpaceEngine(
  engineId: string,
  environmentId: string | null,
  ability?: Ability,
  systemAdmin?: SystemAdmin | 'dont-check',
) {
  // engines without an environmentId are PROCEED engines
  if (environmentId === null && systemAdmin !== 'dont-check' && !systemAdmin)
    throw new UnauthorizedError();

  if (ability) {
    const engine = await getDbEngineById(engineId, environmentId, ability, systemAdmin);
    if (!engine) throw new Error('Engine not found');
    if (
      !ability.can('delete', toCaslResource('Machine', engine), { environmentId: environmentId! })
    )
      throw new UnauthorizedError();
  }

  const res = await db.engine.delete({
    where: {
      environmentId: environmentId,
      id: engineId,
    },
  });

  if (environmentId) {
    updateTag(`space/${environmentId}/engines`);
  } else {
    updateTag('ms/engines');
  }

  return res;
}
