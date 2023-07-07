'use client';

import React, { FC, useEffect, useRef } from 'react';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import type ModelerType from 'bpmn-js/lib/Modeler';
import type ViewerType from 'bpmn-js/lib/NavigatedViewer';
import { useParams } from 'next/navigation';
import { useProcessBpmn } from '@/lib/process-queries';

import ModelerToolbar from './modeler-toolbar';

import useModelerStateStore from '@/lib/use-modeler-state-store';

// Conditionally load the BPMN modeler only on the client, because it uses
// "window" reference. It won't be included in the initial bundle, but will be
// immediately loaded when the initial script first executes (not after
// Hydration).
const BPMNModeler =
  typeof window !== 'undefined' ? import('bpmn-js/lib/Modeler').then((mod) => mod.default) : null;

const BPMNViewer =
  typeof window !== 'undefined'
    ? import('bpmn-js/lib/NavigatedViewer').then((mod) => mod.default)
    : null;

type ModelerProps = React.HTMLAttributes<HTMLDivElement> & {
  minimized: boolean;
};

const Modeler: FC<ModelerProps> = ({ minimized, ...props }) => {
  const canvas = useRef<HTMLDivElement>(null);
  const modeler = useRef<ModelerType | ViewerType | null>(null);

  const { processId } = useParams();

  const setModeler = useModelerStateStore((state) => state.setModeler);
  const setSelectedElementId = useModelerStateStore((state) => state.setSelectedElementId);
  const selectedVersion = useModelerStateStore((state) => state.selectedVersion);

  const { data: processBpmn } = useProcessBpmn(
    processId,
    selectedVersion > 0 ? selectedVersion : undefined
  );

  useEffect(() => {
    if (!canvas.current) return;

    // Little ref check to ensure only the latest modeler is active.
    // Necessary since the modeler is loaded asynchronously.
    const active = { destroy: () => {} };
    modeler.current = active as ModelerType | ViewerType;

    // Can't be null because we are on the client side.
    Promise.all([BPMNModeler, BPMNViewer]).then(([Modeler, Viewer]) => {
      // This is not the most recent instance, so don't do anything.
      if (active !== modeler.current) return;

      if (selectedVersion > 0) {
        modeler.current = new Viewer!({
          container: canvas.current!,
        });
      } else {
        modeler.current = new Modeler!({
          container: canvas.current!,
        });
      }

      // load a BPMN 2.0 diagram
      modeler.current.importXML(
        processBpmn ||
          "<?xml version='1.0' encoding='UTF-8'?>" +
            "<bpmn:definitions xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:bpmn='http://www.omg.org/spec/BPMN/20100524/MODEL' xmlns:bpmndi='http://www.omg.org/spec/BPMN/20100524/DI' xmlns:dc='http://www.omg.org/spec/DD/20100524/DC' id='Definitions_1' targetNamespace='http://bpmn.io/schema/bpmn' exporter='Camunda Modeler' exporterVersion='4.7.0'>" +
            "  <bpmn:process id='Process_1' isExecutable='false'>" +
            "    <bpmn:startEvent id='StartEvent_1' />" +
            '  </bpmn:process>' +
            "  <bpmndi:BPMNDiagram id='BPMNDiagram_1'>" +
            "    <bpmndi:BPMNPlane id='BPMNPlane_1' bpmnElement='Process_1'>" +
            "      <bpmndi:BPMNShape id='_BPMNShape_StartEvent_2' bpmnElement='StartEvent_1'>" +
            "        <dc:Bounds x='173' y='102' width='36' height='36' />" +
            '      </bpmndi:BPMNShape>' +
            '    </bpmndi:BPMNPlane>' +
            '  </bpmndi:BPMNDiagram>' +
            '</bpmn:definitions>'
      );

      setModeler(modeler.current);

      modeler.current.on('selection.changed', (event) => {
        const { newSelection } = event as unknown as { newSelection: any[] };

        if (newSelection.length === 1) setSelectedElementId(newSelection[0].id);
        else setSelectedElementId(null);
      });
    });

    return () => {
      modeler.current?.destroy();
    };
  }, [processBpmn, setModeler, setSelectedElementId, selectedVersion]);

  return (
    <>
      {!minimized && <ModelerToolbar />}
      <div className="modeler" {...props} ref={canvas} />;
    </>
  );
};

export default Modeler;
