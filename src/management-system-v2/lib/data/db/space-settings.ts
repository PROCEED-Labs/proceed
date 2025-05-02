import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { toCaslResource } from '@/lib/ability/caslAbility';
import db from '@/lib/data/db';
import { SpaceEngineInput, SpaceEngineInputSchema } from '@/lib/space-engine-schema';

export async function getSpaceSettings(
  environmentId: string,
  settingsGroup: string,
  ability?: Ability,
) {
  const settings = await db.spaceSettings.findUnique({
    where: { environmentId },
  });

  // TODO: Handle access rights
  // const filtered =  ability ? ability.filter('view', 'Setting', settings) : settings;

  if (!settings) return undefined;

  return (settings.settings as Record<string, Record<string, any>>)[settingsGroup];
}
