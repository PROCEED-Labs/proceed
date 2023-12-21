'use client';

import React, { FC, useEffect, useRef, useState, useTransition } from 'react';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import type ModelerType from 'bpmn-js/lib/Modeler';
import type ViewerType from 'bpmn-js/lib/NavigatedViewer';

import useModelerStateStore from '@/lib/use-modeler-state-store';
import schema from '@/lib/schema';
import { Button } from 'antd';

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
  processBpmn: string;
  registeredUsersOnly: boolean;
};

const EmbeddedModeler = ({ processBpmn, registeredUsersOnly }: ModelerProps) => {
  const [initialized, setInitialized] = useState(false);
  const canvas = useRef<HTMLDivElement>(null);
  const modeler = useRef<ModelerType | ViewerType | null>(null);

  const setModeler = useModelerStateStore((state) => state.setModeler);
  const setSelectedElementId = useModelerStateStore((state) => state.setSelectedElementId);
  const setEditingDisabled = useModelerStateStore((state) => state.setEditingDisabled);

  useEffect(() => {
    if (!canvas.current) return;
    const active = { destroy: () => {} };
    modeler.current = active as ModelerType | ViewerType;
    Promise.all([BPMNModeler, BPMNViewer]).then(([Modeler, Viewer]) => {
      if (active !== modeler.current) return;

      modeler.current = new Viewer!({
        container: canvas.current!,
        moddleExtensions: {
          proceed: schema,
        },
      });
      setEditingDisabled(true);

      setModeler(modeler.current);
      setInitialized(true);
    });

    return () => {
      modeler.current?.destroy();
    };
    // only reset the modeler if we switch between editing being enabled or disabled
  }, [processBpmn]);

  useEffect(() => {
    // only import the bpmn once (the effect will be retriggered when initialized is set to false at its end)
    if (!initialized && modeler.current?.importXML && processBpmn) {
      // import the diagram that was returned by the request
      modeler.current.importXML(processBpmn).then(() => {
        (modeler.current!.get('canvas') as any).zoom('fit-viewport', 'auto');
      });

      modeler.current.on('selection.changed', (event) => {
        const { newSelection } = event as unknown as { newSelection: any[] };

        if (newSelection.length === 1) setSelectedElementId(newSelection[0].id);
        else setSelectedElementId(null);
      });
    }
    // set the initialized flag (back) to false so this effect can be retriggered every time the modeler is swapped with a viewer or the viewer with a modeler
    setInitialized(false);
  }, [initialized, setSelectedElementId, processBpmn]);

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
        }}
      >
        <Button
          onClick={() => {
            alert('Need to implement it');
          }}
        >
          Copy to own workspace
        </Button>
        <div className="modeler" style={{ height: '90vh', width: '90vw' }} ref={canvas} />
      </div>
    </>
  );
};

export default EmbeddedModeler;
