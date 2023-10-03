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
  selectedElement?: Process | undefined;
  rerenderTrigger?: any;
  reduceLogo?: boolean;
};

const Viewer: FC<ViewerProps> = ({ selectedElement, rerenderTrigger, reduceLogo }) => {
  const [initialized, setInitialized] = useState(false);
  const { data: bpmn, isSuccess } = useProcessBpmn(
    selectedElement ? selectedElement.definitionId : '',
  );
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
    if (initialized && bpmn && selectedElement) {
      previewer.current!.importXML(bpmn).then(() => {
        (previewer.current!.get('canvas') as any).zoom('fit-viewport', 'auto');
      });
    }
  }, [initialized, bpmn, selectedElement]);

  useEffect(() => {
    if (initialized && selectedElement) {
      (previewer.current!.get('canvas') as any)?.zoom('fit-viewport', 'auto');
    }
  }, [initialized, rerenderTrigger, selectedElement]);

  return (
    <div
      className={classNames({ reduceLogo: reduceLogo })}
      style={{ height: '100%' }}
      ref={canvas}
    ></div>
  );
};

export default Viewer;
