'use client';

import React, { FC, useEffect, useRef, useState } from 'react';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import type ModelerType from 'bpmn-js/lib/Modeler';
import type ViewerType from 'bpmn-js/lib/NavigatedViewer';
import { useParams } from 'next/navigation';
import { useProcessBpmn } from '@/lib/process-queries';

import ModelerToolbar from './modeler-toolbar';
import XmlEditor from './xml-editor';

import useModelerStateStore from '@/lib/use-modeler-state-store';
import schema from '@/lib/schema';
import { updateProcess } from '@/lib/update-data';

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
  const [initialized, setInitialized] = useState(false);
  const [xmlEditorBpmn, setXmlEditorBpmn] = useState<string | undefined>(undefined);

  const canvas = useRef<HTMLDivElement>(null);
  const modeler = useRef<ModelerType | ViewerType | null>(null);

  const { processId } = useParams();

  const setModeler = useModelerStateStore((state) => state.setModeler);
  const setSelectedElementId = useModelerStateStore((state) => state.setSelectedElementId);
  const selectedVersion = useModelerStateStore((state) => state.selectedVersion);
  const editingDisabled = useModelerStateStore((state) => state.editingDisabled);

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

      if (editingDisabled) {
        modeler.current = new Viewer!({
          container: canvas.current!,
          moddleExtensions: {
            proceed: schema,
          },
        });
      } else {
        modeler.current = new Modeler!({
          container: canvas.current!,
          moddleExtensions: {
            proceed: schema,
          },
        });
      }

      setModeler(modeler.current);
      setInitialized(true);
    });

    return () => {
      if (modeler.current?.saveXML) {
        modeler.current
          .saveXML({ format: true })
          .then(({ xml }) => {
            return updateProcess(processId, { bpmn: xml! });
          })
          .catch((error) => {
            console.log(error);
          })
          .finally(() => {
            modeler.current?.destroy();
          });
      } else {
        modeler.current?.destroy();
      }
    };
    // only reset the modeler if we switch between editing being enabled or disabled
  }, [setModeler, editingDisabled, processId]);

  const { data: processBpmn } = useProcessBpmn(processId, selectedVersion);

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

      let timer: ReturnType<typeof setTimeout>;
      modeler.current.on('commandStack.changed', async () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          try {
            const { xml } = await modeler.current!.saveXML({ format: true });
            await updateProcess(processId, { bpmn: xml! });
          } catch (err) {
            console.log(err);
          }
        }, 2000);
      });
    }
    // set the initialized flag (back) to false so this effect can be retriggered every time the modeler is swapped with a viewer or the viewer with a modeler
    setInitialized(false);
  }, [initialized, setSelectedElementId, processBpmn, processId]);

  const handleOpenXmlEditor = async () => {
    if (modeler.current) {
      const { xml } = await modeler.current.saveXML({ format: true });
      setXmlEditorBpmn(xml);
    }
  };

  const handleCloseXmlEditor = () => {
    setXmlEditorBpmn(undefined);
  };

  const handleXmlEditorSave = (bpmn: string) => {
    if (modeler.current) {
      modeler.current.importXML(bpmn).then(() => {
        (modeler.current!.get('canvas') as any).zoom('fit-viewport', 'auto');
      });
      updateProcess(processId, { bpmn });
    }
  };

  return (
    <div className="bpmn-js-modeler-with-toolbar" style={{ height: '100%' }}>
      {!minimized && (
        <>
          <ModelerToolbar onOpenXmlEditor={handleOpenXmlEditor} />
          <XmlEditor
            bpmn={xmlEditorBpmn}
            canSave={selectedVersion === null}
            onClose={handleCloseXmlEditor}
            onSaveXml={handleXmlEditorSave}
          />
        </>
      )}
      <div className="modeler" {...props} ref={canvas} />;
    </div>
  );
};

export default Modeler;
