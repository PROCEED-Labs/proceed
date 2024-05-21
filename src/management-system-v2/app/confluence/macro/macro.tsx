'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Head from 'next/head';
import Viewer from '@/components/bpmn-viewer';

const Macro = ({ processId }: { processId: string }) => {
  const router = useRouter();
  console.log('router query', router);
  console.log('processId', processId);

  const mockedProcessDefinitionId = '_39b08e20-1c28-4b0c-919b-e823e5b650ed';
  return (
    <>
      <Viewer definitionId={mockedProcessDefinitionId}></Viewer>
    </>
  );
};

export default Macro;
