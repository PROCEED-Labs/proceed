'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import cn from 'classnames';
import BPMNCanvas, { BPMNCanvasRef } from './bpmn-canvas';
import { getProcessBPMN } from '@/lib/data/processes';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useEnvironment } from './auth-can';

type BPMNViewerProps = {
  definitionId: string;
  reduceLogo?: boolean;
  fitOnResize?: boolean;
};

const BPMNViewer = ({ definitionId, reduceLogo, fitOnResize }: BPMNViewerProps) => {
  const viewer = useRef<BPMNCanvasRef | null>(null);
  const environment = useEnvironment();

  const { data } = useSuspenseQuery({
    queryKey: [environment.spaceId, 'process', definitionId, 'bpmn'],
    queryFn: async () => {
      // Without this, we would call a server action as the first thing after
      // suspending. Apparently, this leads to an error that you can't call
      // setState while rendering. This little delay is already enough to
      // prevent that.
      await Promise.resolve();

      const res = await getProcessBPMN(definitionId, environment.spaceId);
      if (typeof res === 'object' && 'error' in res) {
        throw res.error;
      }
      return res;
    },
  });

  // Allows for rerendering when the process changes but not the BPMN.
  const bpmn = useMemo(() => ({ bpmn: data }), [data]);

  useEffect(() => {
    console.log('viewer', viewer.current);
    //viewer.current!.fitViewport();
  }, []);

  return (
    <BPMNCanvas
      ref={viewer}
      bpmn={bpmn}
      type="viewer"
      className={cn({ reduceLogo: reduceLogo })}
      resizeWithContainer={fitOnResize}
    />
  );
};

export default BPMNViewer;
