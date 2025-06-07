import { generateSharedViewerUrl } from '@/lib/sharing/process-sharing';
import { message } from 'antd';

export async function handleOpenDocumentation(
  processId: string,
  selectedVersionId?: string | null,
) {
  // the timestamp does not matter here since it is overridden by the user being an owner of the process
  try {
    const url = await generateSharedViewerUrl(
      { processId, timestamp: 0 },
      selectedVersionId || undefined,
    );

    // open the documentation page in a new tab (unless it is already open in which case just show the tab)
    if (typeof url === 'string') {
      window.open(url, `${processId}-${selectedVersionId}-tab`);
    } else {
      message.error('Failed to generate the documentation URL.');
    }
  } catch (err) {
    message.error('Failed to open the documentation page.');
  }
}
