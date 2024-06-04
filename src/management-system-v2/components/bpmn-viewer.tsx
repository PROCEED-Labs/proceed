'use client';

import React, { FC, Suspense, useMemo, useRef } from 'react';
import cn from 'classnames';
import BPMNCanvas, { BPMNCanvasRef } from './bpmn-canvas';
import { getProcessBPMN } from '@/lib/data/processes';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useEnvironment } from './auth-can';
import style from './bpmn-viewer.module.scss';
import { useLazyRendering } from './scrollbar';
import ProceedLoading from './loading-proceed';

type BPMNViewerProps = {
  definitionId: string;
  reduceLogo?: boolean;
  fitOnResize?: boolean;
  scrollable?: boolean;
};

const BPMNViewer: FC<BPMNViewerProps> = ({
  definitionId,
  reduceLogo,
  fitOnResize,
  scrollable = false,
}) => {
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

  return (
    <div
      className={cn(style['bpmn-viewer-container'], {
        [style['no-scroll']]: !scrollable,
      })} /* Prevents the Viewer from beeing scrollable / zoomable */
    >
      <BPMNCanvas
        ref={viewer}
        bpmn={bpmn}
        type="viewer"
        className={cn({ reduceLogo: reduceLogo })}
        resizeWithContainer={fitOnResize}
      />
    </div>
  );
};

type LazyLoadingBPMNViewerProps = BPMNViewerProps & {
  fallback?: React.ReactNode;
};

export const LazyBPMNViewer: FC<LazyLoadingBPMNViewerProps> = ({
  fallback = <ProceedLoading />,
  ...props
}) => {
  const ViewerContainerRef = useRef(null);
  const visible = useLazyRendering(ViewerContainerRef);

  return (
    <>
      <div ref={ViewerContainerRef}>
        {visible /* This ensures, that only elements, that are visible or close to beeing visible are rendered -> reduces requests for bpmn/xml */ ? (
          <Suspense fallback={fallback}>
            {' '}
            {/* Prevent sequential rendereing/ get from showing the Icon-list */}
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
