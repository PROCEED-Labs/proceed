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

  const process = await getProcess(processId, true);

  return <BPMNSharedViewer isOwner={false} processData={process} availableImports={{}} />;
};

export default Page;
