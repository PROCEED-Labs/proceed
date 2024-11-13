'use client';

import React from 'react';
import ModelerToolbar from './confluence-modeler-toolbar';
import useModelerStateStore from '../../../(dashboard)/[environmentId]/processes/[processId]/use-modeler-state-store';
import ModelerZoombar from './confluence-modeler-zoombar';
import BPMNModeler from '@/app/(dashboard)/[environmentId]/processes/[processId]/bpmn-modeler';

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
        {isLoaded && <ModelerToolbar viewOnly={isViewer} canRedo={canRedo} canUndo={canUndo} />}
        <ModelerZoombar></ModelerZoombar>
      </>
      <BPMNModeler versions={[]} process={process} isNavigatedViewer={isViewer}></BPMNModeler>
    </div>
  );
};

export default Modeler;
