'use client';

import { useProcessBpmn } from '@/lib/process-queries';
import React, { FC, useEffect, useRef, useState } from 'react';

import type ViewerType from 'bpmn-js/lib/Viewer';
import classNames from 'classnames';
import { ApiData } from '@/lib/fetch-data';

type Processes = ApiData<'/process', 'get'>;
type Process = Processes[number];

const BPMNViewer =
  typeof window !== 'undefined' ? import('bpmn-js/lib/Viewer').then((mod) => mod.default) : null;

type ViewerProps = {
  selectedElementId?: string;
  rerenderTrigger?: any;
  reduceLogo?: boolean;
};

const Viewer: FC<ViewerProps> = ({ selectedElementId, rerenderTrigger, reduceLogo }) => {
  const [initialized, setInitialized] = useState(false);
  const { data: bpmn, isSuccess } = useProcessBpmn(selectedElementId ?? '');
  const canvas = useRef<HTMLDivElement>(null);
  const previewer = useRef<ViewerType | null>(null);

  useEffect(() => {
    if (!canvas.current) return;
    BPMNViewer!.then((Viewer) => {
      if (!previewer.current) {
        const viewer = new Viewer!({
          container: canvas.current!,
        });

        previewer.current = viewer;
        setInitialized(true);
      }
    });
  }, [bpmn]);

  useEffect(() => {
    if (initialized && bpmn && selectedElementId) {
      previewer.current!.importXML(bpmn).then(() => {
        (previewer.current!.get('canvas') as any).zoom('fit-viewport', 'auto');
      });
    }
  }, [initialized, bpmn, selectedElementId]);

  useEffect(() => {
    if (initialized && selectedElementId) {
      (previewer.current!.get('canvas') as any)?.zoom('fit-viewport', 'auto');
    }
  }, [initialized, rerenderTrigger, selectedElementId]);

  return (
    <div
      className={classNames({ reduceLogo: reduceLogo })}
      style={{ height: '100%' }}
      ref={canvas}
    ></div>
  );
};

export default Viewer;
