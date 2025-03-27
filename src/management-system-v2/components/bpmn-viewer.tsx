'use client';

import React, { FC, Suspense, useMemo, useRef } from 'react';
import cn from 'classnames';
import BPMNCanvas, { BPMNCanvasRef } from './bpmn-canvas';
import { getProcessBPMN } from '@/lib/data/processes';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useEnvironment } from './auth-can';
import style from './bpmn-viewer.module.scss';
import { useLazyRendering } from './scrollbar';
import ProceedLoadingIndicator from './loading-proceed';

type BPMNViewerProps = {
  definitionId?: string;
  reduceLogo?: boolean;
  fitOnResize?: boolean;
  previewBpmn?: string;
};

const BPMNViewer: FC<BPMNViewerProps> = ({
  definitionId,
  reduceLogo,
  fitOnResize,
  previewBpmn,
}) => {
  const viewer = useRef<BPMNCanvasRef | null>(null);
  const environment = useEnvironment();

  const { data } = useSuspenseQuery({
    queryKey: definitionId ? [environment.spaceId, 'process', definitionId, 'bpmn'] : [],
    queryFn: async () => {
      // If no `definitionId`, return empty string
      if (!definitionId) return '';

      // Without this, we would call a server action as the first thing after
      // suspending. Apparently, this leads to an error that you can't call
      // setState while rendering. This little delay is already enough to
      // prevent that.
      await Promise.resolve();
      const res = await getProcessBPMN(definitionId, environment.spaceId);
      if (typeof res === 'object' && 'error' in res) throw res.error;
      return res as string;
    },
  });

  // Allows for rerendering when the process changes but not the BPMN.
  const bpmn = useMemo(() => ({ bpmn: data }), [data]);

  return (
    <BPMNCanvas
      ref={viewer}
      bpmn={previewBpmn && !definitionId ? { bpmn: previewBpmn } : bpmn}
      type="viewer"
      className={cn({ reduceLogo: reduceLogo })}
      resizeWithContainer={fitOnResize}
    />
  );
};

type LazyLoadingBPMNViewerProps = BPMNViewerProps & {
  fallback?: React.ReactNode;
};

export const LazyBPMNViewer: FC<LazyLoadingBPMNViewerProps> = ({
  fallback = <ProceedLoadingIndicator scale="100%" />,
  ...props
}) => {
  const ViewerContainerRef = useRef(null);
  const visible = useLazyRendering(ViewerContainerRef);

  return (
    <>
      <div ref={ViewerContainerRef}>
        {visible /* This ensures, that only elements, that are visible or close to beeing visible are rendered -> reduces requests for bpmn/xml */ ? (
          <Suspense fallback={fallback}>
            {/* Prevent sequential rendering/ get from showing the Icon-list */}
            <BPMNViewer {...props} />
          </Suspense>
        ) : (
          fallback
        )}
      </div>
    </>
  );
};

export default BPMNViewer;
