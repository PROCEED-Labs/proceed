import { getAttachmentProcessBase64Image, getAttachments } from '@/app/confluence/helpers';
import BPMNSharedViewer from '@/app/shared-viewer/documentation-page';
import { getProcess } from '@/lib/data/legacy/process';
import { generateSharedViewerUrl } from '@/lib/sharing/process-sharing';
import { redirect } from 'next/navigation';

const Page = async ({ params: { processId } }: { params: { processId: string } }) => {
  //   const url = await generateSharedViewerUrl({
  //     processId,
  //     timestamp: 100,
  //   });

  //   console.log('url', url);

  const base64 = await getAttachmentProcessBase64Image('14712843', processId);

  return <img src={`data:image/png;base64, ${base64}`}></img>;
};

export default Page;
