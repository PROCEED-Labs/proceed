'use client';
import Modeler from '../../macro-editor/create/confluence-modeler';
import { Process } from '@/lib/data/process-schema';

const Macro = ({ process }: { process: Process }) => {
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
