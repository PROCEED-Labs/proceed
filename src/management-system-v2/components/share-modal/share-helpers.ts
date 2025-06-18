'use client';
import {
  generateSharedViewerUrl,
  updateProcessGuestAccessRights,
} from '@/lib/sharing/process-sharing';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { isUserErrorResponse } from '@/lib/user-error';

export function updateShare(
  {
    processId,
    spaceId,
    embeddedMode,
    versionId,
    unshare = false,
    sharedAs = 'public',
  }: {
    processId: string;
    spaceId: string;
    versionId?: string;
    embeddedMode?: true;
    unshare?: boolean;
    sharedAs?: 'public' | 'protected';
  },
  wrapServerCallOptions: Omit<Parameters<typeof wrapServerCall<void | string>>[0], 'fn'>,
) {
  const timestamp = unshare ? 0 : Date.now();

  return wrapServerCall({
    fn: async () => {
      let options;
      if (embeddedMode) options = { allowIframeTimestamp: timestamp };
      else options = { sharedAs, shareTimestamp: timestamp };

      const accessUpdateResult = await updateProcessGuestAccessRights(processId, options, spaceId);
      if (unshare || isUserErrorResponse(accessUpdateResult)) return accessUpdateResult;

      const url = await generateSharedViewerUrl(
        {
          processId,
          embeddedMode,
          timestamp,
        },
        versionId,
      );

      return url;
    },
    ...wrapServerCallOptions,
  });
}
