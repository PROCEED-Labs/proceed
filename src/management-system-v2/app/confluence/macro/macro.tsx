'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Viewer from '@/components/bpmn-viewer';

const Macro = () => {
  const [processId, setProcessId] = useState('');
  const router = useRouter();
  console.log('router query', router);
  console.log('processId', processId);

  useEffect(() => {
    if (window.AP && window.AP.confluence) {
      console.log('window AP', window.AP);
      window.AP.confluence.getMacroData((data: any) => {
        console.log('confluence macroData', data);
        if (data) {
          setProcessId(data.processId || data.parameters?.processId || '');
        }
      });
    }
  }, []);

  const mockedProcessDefinitionId = '_39b08e20-1c28-4b0c-919b-e823e5b650ed';
  return (
    <>
      <Viewer definitionId={mockedProcessDefinitionId}></Viewer>
    </>
  );
};

export default Macro;
