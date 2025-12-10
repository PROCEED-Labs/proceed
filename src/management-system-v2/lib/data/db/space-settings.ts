import { ok, err } from 'neverthrow';
import { Setting, SettingGroup } from '@/app/(dashboard)/[environmentId]/settings/type-util';
import Ability, { UnauthorizedError } from '@/lib/ability/abilityHelper';
import prisma from '@/lib/data/db';
import db from '@/lib/data/db';
import { Record } from '@prisma/client/runtime/library';

// This function is only supposed to be used in the backende
export async function getSpaceSettingsValues(
  spaceId: string,
  searchKey: string,
  ability?: Ability,
) {
  if (ability && !ability.can('view', 'Setting')) return err(new UnauthorizedError());

  const settings = await db.spaceSettings.findUnique({
    where: { environmentId: spaceId },
  });

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

  return ok(res);
}

export async function populateSpaceSettingsGroup(
  spaceId: string,
  settingsGroup: SettingGroup,
  ability?: Ability,
) {
  if (ability && ability.can('update', 'Setting')) return err(new UnauthorizedError());

  const settings = await db.spaceSettings.findUnique({
    where: { environmentId: spaceId },
  });

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

  return ok();
}

export async function updateSpaceSettings(
  spaceId: string,
  data: Record<string, any>,
  ability?: Ability,
) {
  if (ability && !ability.can('update', 'Setting')) return err(new UnauthorizedError());

  await prisma.$transaction(async (tx) => {
    const existingSettings = await tx.spaceSettings.findUnique({
      where: { environmentId: spaceId },
    });

    if (!existingSettings) {
      await tx.spaceSettings.create({
        data: { environmentId: spaceId, settings: data },
      });

      return;
    }

    await tx.spaceSettings.update({
      where: {
        environmentId: spaceId,
      },
      data: {
        settings: { ...(existingSettings.settings as Record<string, any>), ...data },
      },
    });
  });

  return ok();
}
