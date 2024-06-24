import { generateSharedViewerUrl } from '@/lib/sharing/process-sharing';
import { redirect } from 'next/navigation';

const Page = async ({ params: { processId } }: { params: { processId: string } }) => {
  const url = await generateSharedViewerUrl({
    processId,
    timestamp: 100,
  });

  console.log('url', url);

  redirect(url);
};

export default Page;
