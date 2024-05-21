'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Head from 'next/head';

const Macro = ({ processId }: { processId: string }) => {
  const router = useRouter();
  console.log('router query', router);
  useEffect(() => {
    if (processId) {
      router.push(`/confluence/fullscreen?processId=${processId}`);
    }
  }, [processId]);

  return (
    <>
      <Head>
        <title>Proceed Macro</title>
        <script src="https://connect-cdn.atlassian.com/all.js"></script>
      </Head>
      <div>
        <h2>Proceed Process Modeler</h2>
        <p>Click the button below to edit the process in fullscreen mode.</p>
        <button onClick={() => router.push(`/confluence/fullscreen?processId=${processId}`)}>
          Edit Process
        </button>
      </div>
    </>
  );
};

export default Macro;
