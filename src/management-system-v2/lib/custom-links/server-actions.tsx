'use server';

import { getCurrentEnvironment } from '@/components/auth';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { asyncMap } from '../helpers/javascriptHelpers';
import { checkCustomLinkStatus } from './get-link-state';
import { CustomNavigationLink } from './custom-link';
import { getErrorMessage, userError } from '../server-error-handling/user-error';

export async function getCustomLinksStatus(spaceId: string) {
  // Check that the user is a member of the space
  const res = await getCurrentEnvironment(spaceId);
  if (res.isErr()) {
    return userError(getErrorMessage(res.error));
  }

  const generalSettings = await getSpaceSettingsValues(spaceId, 'general-settings');
  if (generalSettings.isErr()) {
    return userError(getErrorMessage(generalSettings.error));
  }

  const customNavLinks: CustomNavigationLink[] =
    generalSettings.value.customNavigationLinks?.links || [];

  return await asyncMap(customNavLinks, async (link) => {
    return {
      ...link,
      status: await checkCustomLinkStatus(link),
    };
  });
}
