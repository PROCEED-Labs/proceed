import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { toCaslResource } from '@/lib/ability/caslAbility';
import db from '@/lib/data/db';
import { SpaceEngineInput, SpaceEngineInputSchema } from '@/lib/space-engine-schema';
import { SystemAdmin } from '@prisma/client';
import { ok, err } from 'neverthrow';

export async function getDbEngines(
  environmentId: string | null,
  ability?: Ability,
  systemAdmin?: SystemAdmin | 'dont-check',
) {
  // engines without an environmentId are PROCEED engines
  if (environmentId === null && systemAdmin !== 'dont-check' && !systemAdmin)
    return err(new UnauthorizedError());

  const engines = await db.engine.findMany({
    where: { environmentId: environmentId },
  });

  return ok(ability ? ability.filter('view', 'Machine', engines) : engines);
}

export async function getDbEngineById(
  engineId: string,
  environmentId: string | null,
  ability?: Ability,
  systemAdmin?: SystemAdmin | 'dont-check',
) {
  // engines without an environmentId are PROCEED engines
  if (environmentId === null && systemAdmin !== 'dont-check' && !systemAdmin)
    return err(new UnauthorizedError());

  const engine = await db.engine.findUnique({
    where: {
      environmentId: environmentId,
      id: engineId,
    },
  });

  if (!engine) return ok(undefined);

  if (
    ability &&
    !ability.can('view', toCaslResource('Machine', engine), { environmentId: environmentId! })
  ) {
    return err(new UnauthorizedError());
  }

  return ok(engine);
}

export async function getDbEngineByAddress(
  address: string,
  spaceId: string | null,
  ability?: Ability,
  systemAdmin?: SystemAdmin | 'dont-check',
) {
  // engines without an environmentId are PROCEED engines
  if (spaceId === null && systemAdmin !== 'dont-check' && !systemAdmin)
    return err(new UnauthorizedError());

  const engine = await db.engine.findFirst({
    where: {
      environmentId: spaceId,
      address,
    },
  });

  if (!engine) {
    if (ability && !ability.can('view', 'Machine')) return err(new UnauthorizedError());
    return ok(undefined);
  }

  if (
    ability &&
    !ability.can('view', toCaslResource('Machine', engine), { environmentId: spaceId! })
  )
    return err(new UnauthorizedError());

  return ok(engine);
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
    return err(new UnauthorizedError());

  const newEngines = SpaceEngineArraySchema.parse(enginesInput);

  if (ability && !ability.can('create', 'Machine')) return err(new UnauthorizedError());

  return ok(
    db.engine.createMany({
      data: newEngines.map((e) => ({ ...e, environmentId: environmentId ?? null })),
    }),
  );
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
    return err(new UnauthorizedError());

  const newEngineData = PartialSpaceEngineInputSchema.parse(engineInput);

  if (ability) {
    const engine = await getDbEngineById(engineId, environmentId, ability, systemAdmin);
    if (engine.isErr()) return engine;
    if (!engine.value) return err(new Error('Engine not found'));
    if (
      !ability.can('update', toCaslResource('Machine', engine), { environmentId: environmentId! })
    )
      return err(new UnauthorizedError());
  }

  return ok(
    await db.engine.update({
      data: newEngineData,
      where: {
        environmentId,
        id: engineId,
      },
    }),
  );
}

export async function deleteSpaceEngine(
  engineId: string,
  environmentId: string | null,
  ability?: Ability,
  systemAdmin?: SystemAdmin | 'dont-check',
) {
  // engines without an environmentId are PROCEED engines
  if (environmentId === null && systemAdmin !== 'dont-check' && !systemAdmin)
    return err(new UnauthorizedError());

  if (ability) {
    const engine = await getDbEngineById(engineId, environmentId, ability, systemAdmin);
    if (engine.isErr()) return engine;
    if (!engine.value) return err(new Error('Engine not found'));
    if (
      !ability.can('delete', toCaslResource('Machine', engine), { environmentId: environmentId! })
    )
      return err(new UnauthorizedError());
  }

  return ok(
    await db.engine.delete({
      where: {
        environmentId: environmentId,
        id: engineId,
      },
    }),
  );
}
