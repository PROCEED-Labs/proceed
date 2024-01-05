'use client';

import React, { useEffect, useRef } from 'react';
import cn from 'classnames';
import BPMNCanvas from './bpmn-canvas';
import { getProcessBPMN } from '@/lib/data/processes';
import { useSuspenseQuery } from '@tanstack/react-query';

type BPMNViewerProps = {
  definitionId: string;
  reduceLogo?: boolean;
  fitOnResize?: boolean;
};

const BPMNViewer = ({ definitionId, reduceLogo, fitOnResize }: BPMNViewerProps) => {
  const viewer = useRef();

  const { data } = useSuspenseQuery({
    queryKey: ['process', definitionId, 'bpmn'],
    queryFn: async () => {
      // Without this, we would call a server action as the first thing after
      // suspending. Apparently, this leads to an error that you can't call
      // setState while rendering. This little delay is already enough to
      // prevent that.
      await Promise.resolve();

      const res = await getProcessBPMN(definitionId);
      if (typeof res === 'object' && 'error' in res) {
        throw res.error;
      }
      return res;
    },
  });

  useEffect(() => {
    console.log('viewer', viewer.current);
    //viewer.current!.fitViewport();
  }, []);

  return (
    <BPMNCanvas
      ref={viewer}
      bpmn={data}
      type="viewer"
      className={cn({ reduceLogo: reduceLogo })}
      resizeWithContainer={fitOnResize}
    />
  );
};

export default BPMNViewer;
