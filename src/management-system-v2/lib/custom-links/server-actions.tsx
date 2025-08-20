'use server';

import { getCurrentEnvironment } from '@/components/auth';
import { getSpaceSettingsValues } from '@/lib/data/db/space-settings';
import { asyncMap } from '../helpers/javascriptHelpers';
import { checkCustomLinkStatus } from './get-link-state';
import { CustomNavigationLink } from './custom-link';

export async function getCustomLinksStatus(spaceId: string) {
  // Check that the user is a member of the space
  getCurrentEnvironment(spaceId);

  const generalSettings = await getSpaceSettingsValues(spaceId, 'general-settings');
  const customNavLinks: CustomNavigationLink[] = generalSettings.customNavigationLinks?.links || [];

  return await asyncMap(customNavLinks, async (link) => {
    return {
      ...link,
      status: await checkCustomLinkStatus(link),
    };
  });
}
