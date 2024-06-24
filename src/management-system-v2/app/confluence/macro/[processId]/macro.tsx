'use client';
import { useEffect } from 'react';
import Modeler from '../../macro-editor/create/confluence-modeler';
import { Process } from '@/lib/data/process-schema';
import { useRouter } from 'next/navigation';

const Macro = ({ process }: { process: Process }) => {
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== 'undefined' && window.AP && window.AP.confluence) {
      window.AP.confluence.getMacroData((data: any) => {
        if (data && data.processId) {
          router.refresh();
        }
      });
    }
  }, []);

  return (
    <>
      {/* <Viewer definitionId={processId}></Viewer> */}
      <div style={{ height: '100vh' }}>
        {/* <BPMNCanvas ref={viewer} type="navigatedviewer" bpmn={{ bpmn: BPMN }}></BPMNCanvas> */}
        {/* <ModelerZoombar canvasRef={viewer.current!}></ModelerZoombar> */}
        <Modeler isViewer process={{ name: process.name, id: process.id, bpmn: process.bpmn }} />
      </div>
    </>
  );
};

export default Macro;
