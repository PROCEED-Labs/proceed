import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';

const Fullscreen = () => {
  const router = useRouter();
  const [processId, setProcessId] = useState('');

  useEffect(() => {
    const { processId } = router.query;
    setProcessId(processId as string);
    console.log('router query fullscreen', router.query);
  }, [router.query]);

  return (
    <>
      <Head>
        <title>Proceed Fullscreen</title>
        <script src="https://connect-cdn.atlassian.com/all.js"></script>
      </Head>
      <div>FULLSCREEN</div>
    </>
  );
};

export default Fullscreen;
