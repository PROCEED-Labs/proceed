'use server';

import { SettingGroup } from '@/app/(dashboard)/[environmentId]/settings/type-util';
import { getCurrentEnvironment } from '@/components/auth';
import { UserErrorType, getErrorMessage, userError } from '@/lib/user-error';
import { Record } from '@prisma/client/runtime/library';
import {
  getSpaceSettingsValues as _getSpaceSettingsValues,
  populateSpaceSettingsGroup as _populateSpaceSettingsGroup,
  updateSpaceSettings as _updateSpaceSettings,
} from '@/lib/data/db/space-settings';
import { UnauthorizedError } from '../ability/abilityHelper';

export async function getSpaceSettingsValues(spaceId: string, searchKey: string) {
  try {
    const { ability } = await getCurrentEnvironment(spaceId);
    return await _getSpaceSettingsValues(spaceId, searchKey, ability);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('You do not have permission view settings', UserErrorType.PermissionError);
    else return userError(getErrorMessage(e));
  }
}

export async function populateSpaceSettingsGroup(spaceId: string, settingsGroup: SettingGroup) {
  try {
    const { ability } = await getCurrentEnvironment(spaceId);
    return await _populateSpaceSettingsGroup(spaceId, settingsGroup, ability);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError(
        'You do not have permission to update settings',
        UserErrorType.PermissionError,
      );
    else return userError(getErrorMessage(e));
  }
}

export async function updateSpaceSettings(spaceId: string, data: Record<string, any>) {
  try {
    const { ability } = await getCurrentEnvironment(spaceId);
    return await _updateSpaceSettings(spaceId, data, ability);
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError(
        'You do not have permission to update settings',
        UserErrorType.PermissionError,
      );
    else return userError(getErrorMessage(e));
  }
}
