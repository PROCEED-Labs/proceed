'use client';

import { updateProcess } from '@/lib/data/processes';
import Modeler from 'bpmn-js/lib/Modeler';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import type ElementFactory from 'diagram-js/lib/core/ElementFactory';
import type Canvas from 'diagram-js/lib/core/Canvas';
import Modeling from 'diagram-js/lib/features/modeling/Modeling';
import { useEnvironment } from './auth-can';
import { Element, Parent } from 'diagram-js/lib/model/Types';
import { useEffect, useRef, useState } from 'react';

type BPMNTimelineProps = React.HTMLAttributes<HTMLDivElement> & {
  process: { name: string; id: string; bpmn: string };
};

const BPMNTimeline = ({ process, ...props }: BPMNTimelineProps) => {
  const environment = useEnvironment();

  const modelerRef = useRef<Modeler | null>(null);

  useEffect(() => {
    console.log('init BPMNTimeline');
    const modeler = new Modeler();
    modelerRef.current = modeler;

    modeler.importXML(process.bpmn).then(() => {
      console.log('modeler ready');
    });

    return () => {
      console.log('cleanup BPMNTimeline');
      // really needed when saved after each change?
      if (modelerRef.current && modelerRef.current.getDefinitions()) {
        modelerRef.current.saveXML({ format: true }).then((data) => {
          try {
            //updateProcess(process.id, environment.spaceId, data.xml, undefined, undefined, true);
          } catch (error) {
            console.log(error);
          }
        });
      }
    };
  }, [process.bpmn]);

  const [status, setStatus] = useState<string | null>(null);

  async function createElement() {
    if (!modelerRef.current) return;

    const modeler = modelerRef.current;
    const modeling: Modeling = modeler.get('modeling');
    const elementFactory: ElementFactory = modeler.get('elementFactory');
    const elementRegistry: ElementRegistry = modeler.get('elementRegistry');

    const processElement = modeler.get<Canvas>('canvas').getRootElement();

    let startEvent = elementRegistry.getAll().find((element) => element.type === 'bpmn:StartEvent');

    if (!startEvent) {
      startEvent = elementFactory.createShape({ type: 'bpmn:StartEvent', id: 'StartEvent_1' });
      modeling.createShape(startEvent, { x: 0, y: 0 }, processElement as Parent);
    }

    const task = elementFactory.createShape({ type: 'bpmn:Task', id: 'Task_1' });

    modeling.createShape(task, { x: 200, y: 0 }, processElement as Parent);

    modeling.connect(startEvent as Element, task, { type: 'bpmn:SequenceFlow' });

    const data = await modeler.saveXML({ format: true });
    try {
      updateProcess(process.id, environment.spaceId, data.xml, undefined, undefined, true);
      setStatus('Element created successfully');
    } catch (error) {
      console.log('update process error', error);
      setStatus('Failed to create element');
    }
  }

  return (
    <div {...props}>
      <pre>name: {process.name}</pre>
      <button onClick={() => createElement()}>add new element</button>
      <p>{status}</p>
    </div>
  );
};

export default BPMNTimeline;
