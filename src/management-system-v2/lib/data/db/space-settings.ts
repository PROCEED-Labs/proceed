'use server';

import { Setting, SettingGroup } from '@/app/(dashboard)/[environmentId]/settings/type-util';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { toCaslResource } from '@/lib/ability/caslAbility';
import db from '@/lib/data/db';
import { Record } from '@prisma/client/runtime/library';

export async function getSpaceSettingsValues(
  environmentId: string,
  searchKey: string,
  ability?: Ability,
) {
  const settings = await db.spaceSettings.findUnique({
    where: { environmentId },
  });

  // TODO: Handle access rights
  // const filtered =  ability ? ability.filter('view', 'Setting', settings) : settings;

  const res = {} as Record<string, any>;

  if (settings) {
    Object.entries(settings.settings as Record<string, any>).forEach(([key, value]) => {
      if (key.startsWith(searchKey + '.')) {
        let targetObject = res;
        const path = key.split(searchKey + '.')[1].split('.');

        if (path.length) {
          for (let i = 0; i < path.length - 1; ++i) {
            if (targetObject[path[i]] === undefined) targetObject[path[i]] = {};
            targetObject = targetObject[path[i]];
          }
          targetObject[path.at(-1) as string] = value;
        }
      }
    });
  }

  return res;
}

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

  Object.entries(settings.settings as Record<string, any>).forEach(([key, value]) => {
    const path = key.split('.');
    if (settingsGroup.key !== path[0]) return;
    let el: SettingGroup | Setting = settingsGroup;

    for (let i = 1; i < path.length; ++i) {
      if (!('children' in el)) return;
      const child = el.children.find((c) => c.key == path[i]) as SettingGroup | Setting | undefined;
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
