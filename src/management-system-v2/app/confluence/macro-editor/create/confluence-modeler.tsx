'use client';

import React from 'react';
import useModelerStateStore from '../../../(dashboard)/[environmentId]/processes/[processId]/use-modeler-state-store';
import BPMNModeler from '@/app/(dashboard)/[environmentId]/processes/[processId]/bpmn-modeler';
import ModelerZoombar from '@/app/(dashboard)/[environmentId]/processes/[processId]/modeler-zoombar';
import ModelerToolbar from '@/app/(dashboard)/[environmentId]/processes/[processId]/modeler-toolbar';

type ConfluenceModelerProps = {
  process: { name: string; id: string; bpmn: string };
  isViewer?: boolean;
};

const Modeler = ({ process, isViewer = false }: ConfluenceModelerProps) => {
  const canUndo = useModelerStateStore((state) => state.canUndo);
  const canRedo = useModelerStateStore((state) => state.canRedo);
  const isLoaded = useModelerStateStore((state) => state.isLoaded);

  return (
    <div style={{ height: '100%' }}>
      <>
        {isLoaded && (
          <ModelerToolbar
            versions={[]}
            canRedo={!isViewer && canRedo}
            canUndo={!isViewer && canUndo}
            processId={process.id}
            onOpenXmlEditor={() => console.log('ok')}
          />
        )}
        <ModelerZoombar allowFullScreen={false}></ModelerZoombar>
      </>
      <BPMNModeler versions={[]} process={process} isNavigatedViewer={isViewer}></BPMNModeler>
    </div>
  );
};

export default Modeler;
