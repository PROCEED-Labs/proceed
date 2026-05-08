'use server';

import { SpaceEngineInput, SpaceEngineInputSchema } from '@/lib/space-engine-schema';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { permissionDenied, schemaValidationError, userError } from '../user-error';
import { toCaslResource } from '../ability/caslAbility';
import { updateTag } from 'next/cache';

import db from '@/lib/data/db';

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
