'use client';

import { updateProcess } from '@/lib/data/processes';
import Modeler from 'bpmn-js/lib/Modeler';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import type ElementFactory from 'diagram-js/lib/core/ElementFactory';
import type Canvas from 'diagram-js/lib/core/Canvas';
import Modeling from 'diagram-js/lib/features/modeling/Modeling';
import AutoPlace from 'diagram-js/lib/features/auto-place/AutoPlace';
import { useEnvironment } from './auth-can';
import { Parent } from 'diagram-js/lib/model/Types';
import { useEffect, useRef, useState } from 'react';
import useTimelineViewStore from '@/lib/use-timeline-view-store';

type BPMNTimelineProps = React.HTMLAttributes<HTMLDivElement> & {
  process: { name: string; id: string; bpmn: string };
};

const BPMNTimeline = ({ process, ...props }: BPMNTimelineProps) => {
  const environment = useEnvironment();
  const bpmnjsModelerRef = useRef<Modeler | null>(null);
  const disableTimelineView = useTimelineViewStore((state) => state.disableTimelineView);
  // needed due to react strict mode causing unmounts on first render
  const hasMountedRef = useRef(false);

  useEffect(() => {
    console.debug('init BPMNTimeline');
    const bpmnjsModeler = new Modeler();
    bpmnjsModelerRef.current = bpmnjsModeler;

    bpmnjsModeler.importXML(process.bpmn).then(() => {
      console.debug('modeler ready');
    });
  }, [process.bpmn]);

  useEffect(() => {
    return () => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
      } else {
        console.debug('disabled BPMNTimeline on unmount');
        disableTimelineView(); // Reset the timeline view store on unmount
      }
    };
  }, []);

  const [status, setStatus] = useState<string | null>(null);

  async function createElement() {
    if (!bpmnjsModelerRef.current) return;

    const bpmnjsModeler = bpmnjsModelerRef.current;
    const modeling: Modeling = bpmnjsModeler.get('modeling');
    const elementFactory: ElementFactory = bpmnjsModeler.get('elementFactory');
    const elementRegistry: ElementRegistry = bpmnjsModeler.get('elementRegistry');
    const autoPlace: AutoPlace = bpmnjsModeler.get('autoPlace');

    const processElement = bpmnjsModeler.get<Canvas>('canvas').getRootElement();

    let startEvent = elementRegistry.getAll().find((element) => element.type === 'bpmn:StartEvent');

    if (!startEvent) {
      startEvent = elementFactory.createShape({ type: 'bpmn:StartEvent', id: 'StartEvent_1' });
      modeling.createShape(startEvent, { x: 0, y: 0 }, processElement as Parent);
    }

    const task = elementFactory.createShape({ type: 'bpmn:Task', id: 'Task_1' });

    autoPlace.append(startEvent as any, task);

    const data = await bpmnjsModeler.saveXML({ format: true });
    try {
      updateProcess(process.id, environment.spaceId, data.xml, undefined, undefined, true);
      setStatus('Element created successfully');
    } catch (error) {
      console.debug('update process error', error);
      setStatus('Failed to create element');
    }
  }

  return (
    <div {...props}>
      <pre>name: {process.name}</pre>
      <button onClick={() => createElement()}>add new element</button>
      <p>{status}</p>
      <button onClick={() => disableTimelineView()}>close timeline</button>
    </div>
  );
};

export default BPMNTimeline;
