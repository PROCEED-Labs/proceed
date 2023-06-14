'use client';

import React, { FC, useEffect, useRef } from 'react';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import type ModelerType from 'bpmn-js/lib/Modeler';

// Conditionally load the BPMN modeler only on the client, because it uses
// "window" reference. It won't be included in the initial bundle, but will be
// immediately loaded when the initial script first executes (not after
// Hydration).
const BPMNModeler =
  typeof window !== 'undefined' ? import('bpmn-js/lib/Modeler').then((mod) => mod.default) : null;

type ModelerProps = React.HTMLAttributes<HTMLDivElement>;

const Modeler: FC<ModelerProps> = (props) => {
  const canvas = useRef<HTMLDivElement>(null);
  const modeler = useRef<ModelerType | null>(null);

  useEffect(() => {
    if (!canvas.current) return;

    // Little ref check to ensure only the latest modeler is active.
    // Necessary since the modeler is loaded asynchronously.
    const active = { destroy: () => {} };
    modeler.current = active as ModelerType;

    // Can't be null because we are on the client side.
    BPMNModeler!.then((BPMNModeler) => {
      // This is not the most recent instance, so don't do anything.
      if (active !== modeler.current) return;

      modeler.current = new BPMNModeler({
        container: canvas.current!,
      });

      // load a BPMN 2.0 diagram
      modeler.current.importXML(
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
    });

    return () => {
      modeler.current?.destroy();
    };
  }, []);

  return <div {...props} ref={canvas} />;
};

export default Modeler;
