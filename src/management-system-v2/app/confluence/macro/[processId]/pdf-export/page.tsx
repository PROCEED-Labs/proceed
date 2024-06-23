import { generateSharedViewerUrl } from '@/lib/sharing/process-sharing';
import { redirect } from 'next/navigation';

const Page = async ({ params: { processId } }: { params: { processId: string } }) => {
  const url = await generateSharedViewerUrl({
    processId,
    timestamp: 0,
  });

  redirect(url);
};

export default Page;
