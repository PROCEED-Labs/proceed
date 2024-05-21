'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Head from 'next/head';

const Fullscreen = ({ params }: { params: { processId: string } }) => {
  console.log('FULLSCREEN PARAMS', params);
  const router = useRouter();
  const [processId, setProcessId] = useState('');

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
