'use server';

import { SettingGroup } from '@/app/(dashboard)/[environmentId]/settings/type-util';
import { getCurrentEnvironment } from '@/components/auth';
import { UserErrorType, getErrorMessage, userError } from '@/lib/server-error-handling/user-error';
import { Record } from '@prisma/client/runtime/library';
import {
  getSpaceSettingsValues as _getSpaceSettingsValues,
  populateSpaceSettingsGroup as _populateSpaceSettingsGroup,
  updateSpaceSettings as _updateSpaceSettings,
} from '@/lib/data/db/space-settings';
import { UnauthorizedError } from '../ability/abilityHelper';

export async function getSpaceSettingsValues(spaceId: string, searchKey: string) {
  try {
    const currentEnvironment = await getCurrentEnvironment(spaceId);
    if (currentEnvironment.isErr()) {
      return userError(getErrorMessage(currentEnvironment.error));
    }
    const { ability } = currentEnvironment.value;

    const result = await _getSpaceSettingsValues(spaceId, searchKey, ability);
    if (result.isErr()) {
      return userError(getErrorMessage(result.error));
    }

    return result.value;
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError('You do not have permission view settings', UserErrorType.PermissionError);
    else return userError(getErrorMessage(e));
  }
}

export async function populateSpaceSettingsGroup(spaceId: string, settingsGroup: SettingGroup) {
  try {
    const currentEnvironment = await getCurrentEnvironment(spaceId);
    if (currentEnvironment.isErr()) {
      return userError(getErrorMessage(currentEnvironment.error));
    }
    const { ability } = currentEnvironment.value;

    const result = await _populateSpaceSettingsGroup(spaceId, settingsGroup, ability);
    if (result && result.isErr()) {
      return userError(getErrorMessage(result.error));
    }

    return result?.value;
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
    const currentEnvironment = await getCurrentEnvironment(spaceId);
    if (currentEnvironment.isErr()) {
      return userError(getErrorMessage(currentEnvironment.error));
    }
    const { ability } = currentEnvironment.value;

    const result = await _updateSpaceSettings(spaceId, data, ability);
    if (result.isErr()) {
      return userError(getErrorMessage(result.error));
    }

    return result.value;
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return userError(
        'You do not have permission to update settings',
        UserErrorType.PermissionError,
      );
    else return userError(getErrorMessage(e));
  }
}
