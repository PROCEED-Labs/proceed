'use client';
import BPMNCanvas from '@/components/bpmn-canvas';
import Viewer from '@/components/bpmn-viewer';

const Macro = ({ processId, bpmn }: { processId: string; bpmn: string }) => {
  console.log('processId', processId);
  console.log('bpmn', bpmn);

  return (
    <>
      <Viewer definitionId={processId}></Viewer>
    </>
  );
};

export default Macro;
