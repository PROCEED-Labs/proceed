'use server';

import { Setting, SettingGroup } from '@/app/(dashboard)/[environmentId]/settings/type-util';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { toCaslResource } from '@/lib/ability/caslAbility';
import db from '@/lib/data/db';
import { Record } from '@prisma/client/runtime/library';

export async function populateSpaceSettingsGroup(
  environmentId: string,
  settingsGroup: SettingGroup,
  ability?: Ability,
) {
  const settings = await db.spaceSettings.findUnique({
    where: { environmentId },
  });

  // TODO: Handle access rights
  // const filtered =  ability ? ability.filter('view', 'Setting', settings) : settings;

  if (!settings) return;

  const insertValues = (settings: Setting | SettingGroup, storedSettings?: Record<string, any>) => {
    if (!storedSettings) return;

    if ('children' in settings) {
      settings.children.forEach((child) => insertValues(child, storedSettings[child.name]));
      return;
    }

    if (storedSettings[settings.name]) settings.value = storedSettings[settings.name];
  };

  Object.entries(settings.settings as Record<string, any>).forEach(([key, value]) => {
    const path = key.split('.');
    if (settingsGroup.key !== path[0]) return;
    let el: SettingGroup | Setting = settingsGroup;

    for (let i = 1; i < path.length; ++i) {
      if (!('children' in el)) return;
      const child = el.children.find((c) => c.key == path[i]);
      if (!child) return;
      el = child;
    }

    if (el && 'value' in el) el.value = value;
  });
}

export async function updateSpaceSettings(
  environmentId: string,
  key: string,
  data: any,
  ability?: Ability,
) {
  // TODO: Handle access rights
  // const filtered =  ability ? ability.filter('update', 'Setting', settings) : settings;

  const existingSettings = await db.spaceSettings.findUnique({
    where: { environmentId },
  });

  if (!existingSettings) {
    await db.spaceSettings.create({
      data: { environmentId, settings: { [key]: data } },
    });

    return;
  }

  await db.spaceSettings.update({
    where: {
      environmentId,
    },
    data: {
      settings: { ...(existingSettings.settings as Record<string, any>), [key]: data },
    },
  });
}
