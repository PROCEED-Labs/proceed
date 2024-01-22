import { ResourceType } from './permissionHelpers';
import { getShares } from '../../../shared-electron-server/data/iam/shares';

export const SHARE_TYPE = {
  USER_TO_USER: 0,
  USER_TO_GROUP: 1,
  LINK_SHARING: 2,
} as const;
type ShareType = keyof typeof SHARE_TYPE;

export type Share<Resource = void> = {
  createdOn: string;
  expiredAt: string | null;
  id: string;
  permissions: number;
  resourceId: string;
  resourceOwner: string;
  resourceType: Resource extends void ? ResourceType : Resource;
  sharedBy: string;
  sharedWith: string;
  type: (typeof SHARE_TYPE)[ShareType];
  updatedOn: string;
};

export async function sharedWitOrByhUser(userId: string) {
  const resourcesSharedWithUser: Share[] = [];

  for (const _share of await getShares()) {
    const share = _share as Share;
    if (share.sharedWith == userId) resourcesSharedWithUser.push(share);
  }

  return resourcesSharedWithUser;
}
