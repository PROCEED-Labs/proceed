import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { toCaslResource } from '@/lib/ability/caslAbility';
import db from '@/lib/data/db';
import { SpaceEngineInput, SpaceEngineInputSchema } from '@/lib/space-engine-schema';

export async function getSpaceEngines(environmentId?: string, ability?: Ability) {
  const engines = await db.engine.findMany({
    where: { environmentId: environmentId },
  });

  return ability ? ability.filter('view', 'Machine', engines) : engines;
}

export async function getSpaceEngineById(
  environmentId: string,
  engineId: string,
  ability?: Ability,
) {
  const engine = await db.engine.findFirst({
    where: {
      environmentId: environmentId,
      id: engineId,
    },
  });

  if (!engine) return undefined;

  if (ability && !ability.can('view', toCaslResource('Machine', engine), { environmentId })) {
    throw new UnauthorizedError();
  }

  return engine;
}

const SpaceEngineArraySchema = SpaceEngineInputSchema.array();
export function addSpaceEngines(
  environmentId: string,
  enginesInput: SpaceEngineInput[],
  ability?: Ability,
) {
  const newEngines = SpaceEngineArraySchema.parse(enginesInput);

  if (ability && !ability.can('create', 'Machine')) throw new UnauthorizedError();

  return db.engine.createMany({
    data: newEngines.map((e) => ({ ...e, environmentId })),
  });
}

const PartialSpaceEngineInputSchema = SpaceEngineInputSchema.partial();
export async function updateSpaceEngine(
  environmentId: string,
  engineId: string,
  engineInput: Partial<SpaceEngineInput>,
  ability?: Ability,
) {
  const newEngineData = PartialSpaceEngineInputSchema.parse(engineInput);

  if (ability) {
    const engine = await getSpaceEngineById(environmentId, engineId, ability);
    if (!engine) throw new Error('Engine not found');
    if (!ability.can('update', toCaslResource('Machine', engine), { environmentId }))
      throw new UnauthorizedError();
  }

  return await db.engine.update({
    data: newEngineData,
    where: {
      environmentId,
      id: engineId,
    },
  });
}

export async function deleteSpaceEngine(
  environmentId: string,
  engineId: string,
  ability?: Ability,
) {
  if (ability) {
    const engine = await getSpaceEngineById(environmentId, engineId, ability);
    if (!engine) throw new Error('Engine not found');
    if (!ability.can('delete', toCaslResource('Machine', engine), { environmentId }))
      throw new UnauthorizedError();
  }

  return await db.engine.delete({
    where: {
      environmentId: environmentId,
      id: engineId,
    },
  });
}
