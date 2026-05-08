'use server';

import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { toCaslResource } from '@/lib/ability/caslAbility';
import db from '@/lib/data/db';
import { Engine } from '@/lib/engines/machines';
import { savedEnginesToEngines } from '@/lib/engines/saved-engines-helpers';
import { Prisma, SystemAdmin } from '@prisma/client';
import { cacheLife, cacheTag } from 'next/cache';

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
  if (!ability) ({ ability } = await getCurrentEnvironment(environmentId));

  let engines = await getSavedEnginesWithMachines(environmentId);

  engines = ability ? ability.filter('view', 'Machine', engines) : engines;
  return getUniqueMachines(engines.flatMap((e) => e.machines));
}

export async function getAllAvailableMachines(environmentId: string) {
  const { ability } = await getCurrentEnvironment(environmentId);

  let [proceedEngines, spaceEngines] = await Promise.all([
    getSavedEnginesWithMachines(null),
    getSavedEnginesWithMachines(environmentId),
  ]);

  spaceEngines = ability.filter('view', 'Machine', spaceEngines);

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
