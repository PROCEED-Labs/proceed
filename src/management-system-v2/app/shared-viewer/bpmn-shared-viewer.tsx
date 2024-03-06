'use client';
import React, { useRef } from 'react';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';

import { Button, Typography, message } from 'antd';
import { copyProcesses } from '@/lib/data/processes';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import BPMNCanvas, { BPMNCanvasRef } from '../../components/bpmn-canvas';
import { Process } from '@/lib/data/process-schema';
import ErrorMessage from '@/components/error-message';

type BPMNSharedViewerProps = React.HTMLAttributes<HTMLDivElement> & {
  processData: Process;
  embeddedMode?: boolean;
};

const BPMNSharedViewer = ({ processData, embeddedMode, ...divProps }: BPMNSharedViewerProps) => {
  const router = useRouter();
  const session = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const processBpmn = processData.bpmn;
  const bpmnViewer = useRef<BPMNCanvasRef>(null);

  if (!processData.shared) {
    return <ErrorMessage message="Process is no longer shared" />;
  }

  const handleCopyToOwnWorkspace = async () => {
    if (session.status === 'unauthenticated') {
      const callbackUrl = `${window.location.origin}${pathname}?token=${searchParams.get('token')}`;
      const loginPath = `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;

      router.replace(loginPath);
    }
    const res = await copyProcesses([
      {
        name: processData.name,
        description: processData.description,
        originalId: processData.id,
      },
    ]);
    if ('error' in res) {
      message.error(res.error.message);
      return res;
    } else {
      message.success('Diagram has been successfully copied to your workspace');
      //router.push(`/processes/${newDefinitionID}`);
      if (res.length == 1) router.push(`/processes/${res[0].id}`);
    }
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
        }}
      >
        {!embeddedMode ? (
          <Button onClick={handleCopyToOwnWorkspace}>Add to your Processes</Button>
        ) : null}
        <div className="bpmn-viewer" style={{ height: '90vh', width: '90vw' }}>
          <BPMNCanvas
            ref={bpmnViewer}
            className={divProps.className}
            type={'viewer'}
            bpmn={{ bpmn: processBpmn }}
          />
        </div>
      </div>
    </>
  );
};

export default BPMNSharedViewer;
