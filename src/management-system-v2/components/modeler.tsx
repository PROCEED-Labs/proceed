'use client';

import React, { FC, useEffect, useRef, useState, useTransition } from 'react';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import type ModelerType from 'bpmn-js/lib/Modeler';
import type ViewerType from 'bpmn-js/lib/NavigatedViewer';
import { useParams, usePathname, useSearchParams } from 'next/navigation';

import ModelerToolbar from './modeler-toolbar';
import XmlEditor from './xml-editor';

import useModelerStateStore from '@/lib/use-modeler-state-store';
import schema from '@/lib/schema';
import { usePutAsset } from '@/lib/fetch-data';
import { useProcessBpmn } from '@/lib/process-queries';
import VersionToolbar from './version-toolbar';

import { copyProcessImage } from '@/lib/process-export/copy-process-image';
import { updateProcess } from '@/lib/data/processes';

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
};

const Modeler = ({ processBpmn, ...divProps }: ModelerProps) => {
  const { processId } = useParams();
  const pathname = usePathname();
  const [initialized, setInitialized] = useState(false);
  const [xmlEditorBpmn, setXmlEditorBpmn] = useState<string | undefined>(undefined);
  const query = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const canvas = useRef<HTMLDivElement>(null);
  const modeler = useRef<ModelerType | ViewerType | null>(null);

  const setModeler = useModelerStateStore((state) => state.setModeler);
  const setSelectedElementId = useModelerStateStore((state) => state.setSelectedElementId);
  const setEditingDisabled = useModelerStateStore((state) => state.setEditingDisabled);

  /// Derived State
  const minimized = pathname !== `/processes/${processId}`;
  const selectedVersionId = query.get('version');

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

      if (selectedVersionId !== null) {
        modeler.current = new Viewer!({
          container: canvas.current!,
          moddleExtensions: {
            proceed: schema,
          },
        });
        setEditingDisabled(true);
      } else {
        modeler.current = new Modeler!({
          container: canvas.current!,
          moddleExtensions: {
            proceed: schema,
          },
        });

        // update process after change with 2 second debounce
        let timer: ReturnType<typeof setTimeout>;
        modeler.current.on('commandStack.changed', () => {
          clearTimeout(timer);
          timer = setTimeout(async () => {
            try {
              const { xml } = await modeler.current!.saveXML({ format: true });
              /* await updateProcess(processId as string, { bpmn: xml! }); */

              startTransition(async () => {
                await updateProcess(processId as string, xml);
              });
            } catch (err) {
              console.log(err);
            }
          }, 2000);
        });

        setEditingDisabled(false);
      }

      // allow keyboard shortcuts like copy (strg+c) and paste (strg+v) etc.
      (modeler.current.get('keyboard') as any).bind(document);

      // create a custom copy behaviour where the whole process or selected parts can be copied to the clipboard as an image
      (modeler.current.get('keyboard') as any).addListener(
        async (_: any, events: { keyEvent: KeyboardEvent }) => {
          const { keyEvent } = events;
          // handle the copy shortcut
          if (keyEvent.ctrlKey && keyEvent.key === 'c' && modeler.current) {
            await copyProcessImage(modeler.current);
          }
        },
        'keyboard.keyup',
      );

      setModeler(modeler.current);
      setInitialized(true);
    });

    return () => {
      modeler.current?.destroy();
    };
    // only reset the modeler if we switch between editing being enabled or disabled
  }, [setModeler, selectedVersionId, processId]);

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

  const handleOpenXmlEditor = async () => {
    if (modeler.current) {
      const { xml } = await modeler.current.saveXML({ format: true });
      setXmlEditorBpmn(xml);
    }
  };

  const handleCloseXmlEditor = () => {
    setXmlEditorBpmn(undefined);
  };

  const handleXmlEditorSave = async (bpmn: string) => {
    if (modeler.current) {
      await modeler.current.importXML(bpmn).then(() => {
        (modeler.current!.get('canvas') as any).zoom('fit-viewport', 'auto');
      });
      // if the bpmn contains unexpected content (text content for an element where the model does not define text) the modeler will remove it automatically => make sure the stored bpmn is the same as the one in the modeler
      const { xml: cleanedBpmn } = await modeler.current.saveXML({ format: true });
      startTransition(async () => {
        await updateProcess(processId as string, cleanedBpmn);
      });
    }
  };

  return (
    <div className="bpmn-js-modeler-with-toolbar" style={{ height: '100%' }}>
      {!minimized && (
        <>
          <ModelerToolbar onOpenXmlEditor={handleOpenXmlEditor} />
          {selectedVersionId && <VersionToolbar />}
          {!!xmlEditorBpmn && (
            <XmlEditor
              bpmn={xmlEditorBpmn}
              canSave={!selectedVersionId}
              onClose={handleCloseXmlEditor}
              onSaveXml={handleXmlEditorSave}
            />
          )}
        </>
      )}
      <div className="modeler" style={{ height: '100%' }} {...divProps} ref={canvas} />
    </div>
  );
};

export default Modeler;
