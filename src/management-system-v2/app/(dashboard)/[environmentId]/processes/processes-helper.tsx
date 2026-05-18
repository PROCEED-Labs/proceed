import { generateSharedViewerUrl } from '@/lib/sharing/process-sharing';
import { message } from 'antd';
import { ColorOptions } from '../(automation)/executions/[processId]/instance-coloring';

export async function handleOpenDocumentation(
  processId: string,
  spaceId: string,
  versionId?: string | null,
  instanceId?: string,
  coloring?: ColorOptions,
) {
  // the timestamp does not matter here since it is overridden by the user being an owner of the process
  try {
    const url = await generateSharedViewerUrl(
      { processId, timestamp: 0, spaceId },
      versionId || undefined,
      undefined,
      instanceId,
      coloring,
    );

    // open the documentation page in a new tab (unless it is already open in which case just show the tab)
    if (typeof url === 'string') {
      const tabKey = instanceId
        ? `${processId}-${instanceId}-tab`
        : `${processId}-${versionId}-tab`;
      window.open(url, tabKey);
    } else {
      message.error('Failed to generate the documentation URL.');
    }
  } catch (err) {
    message.error('Failed to open the documentation page.');
  }
}
