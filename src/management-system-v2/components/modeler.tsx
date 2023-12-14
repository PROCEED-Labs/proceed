'use client';

import React, { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import type ModelerType from 'bpmn-js/lib/Modeler';
import type ViewerType from 'bpmn-js/lib/NavigatedViewer';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';

import ModelerToolbar from './modeler-toolbar';
import XmlEditor from './xml-editor';

import useModelerStateStore from '@/lib/use-modeler-state-store';
import schema from '@/lib/schema';
import { debounce } from '@/lib/utils';
import VersionToolbar from './version-toolbar';

import useMobileModeler from '@/lib/useMobileModeler';

import { copyProcessImage } from '@/lib/process-export/copy-process-image';
import { updateProcess } from '@/lib/data/processes';

import { is as bpmnIs } from 'bpmn-js/lib/util/ModelUtil';
import { App } from 'antd';

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

type ModelerTypes = 'viewer' | 'modeler' | 'none';

const Modeler = ({ processBpmn, ...divProps }: ModelerProps) => {
  const { processId } = useParams();
  const pathname = usePathname();
  const [xmlEditorBpmn, setXmlEditorBpmn] = useState<string | undefined>(undefined);
  const query = useSearchParams();
  const router = useRouter();
  const { message: messageApi } = App.useApp();
  const [currentModelerType, setCurrentModelerType] = useState<ModelerTypes>('none');
  const [isPending, startTransition] = useTransition();

  const canvas = useRef<HTMLDivElement>(null);
  const modeler = useRef<ModelerType | ViewerType | null>(null);

  const setModeler = useModelerStateStore((state) => state.setModeler);
  const setSelectedElementId = useModelerStateStore((state) => state.setSelectedElementId);
  const setEditingDisabled = useModelerStateStore((state) => state.setEditingDisabled);

  /// Derived State
  const minimized = pathname !== `/processes/${processId}`;
  const selectedVersionId = query.get('version');

  const showMobileView = useMobileModeler();

  const canEdit = !selectedVersionId && !showMobileView;

  const saveDebounced = useMemo(
    () =>
      debounce(async () => {
        // prevent saving when the function is created while editing is disabled
        if (canEdit && modeler.current?.saveXML) {
          try {
            const { xml } = await modeler.current.saveXML({ format: true });
            startTransition(async () => {
              await updateProcess(processId as string, xml);
            });
          } catch (err) {
            console.log(err);
          }
        }
      }, 2000),
    [processId, canEdit],
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

      if (!canEdit) {
        modeler.current = new Viewer!({
          container: canvas.current!,
          moddleExtensions: {
            proceed: schema,
          },
        });
        setCurrentModelerType('viewer');
        setEditingDisabled(true);
      } else {
        modeler.current = new Modeler!({
          container: canvas.current!,
          moddleExtensions: {
            proceed: schema,
          },
        });
        setCurrentModelerType('modeler');
        modeler.current.on('commandStack.changed', saveDebounced);

        setEditingDisabled(false);
      }
      // allow keyboard shortcuts like copy (ctrl+c) and paste (ctrl+v) etc.
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

      modeler.current.on('root.set', (event: any) => {
        if (modeler.current) (modeler.current.get('canvas') as any).zoom('fit-viewport', 'auto');
        // when the current root (the visible layer [the main process/collaboration or some collapsed subprocess]) is changed to a subprocess add its id to the query
        const searchParams = new URLSearchParams(window.location.search);
        if (bpmnIs(event.element, 'bpmn:SubProcess')) {
          searchParams.set(`subprocess`, `${event.element.businessObject.id}`);
        } else {
          searchParams.delete('subprocess');
        }

        router.push(
          `/processes/${processId as string}${
            searchParams.size ? '?' + searchParams.toString() : ''
          }`,
        );
      });

      setModeler(modeler.current);
    });

    return () => {
      setCurrentModelerType('none');
      if (!canEdit) modeler.current?.destroy();
      else {
        const m = modeler.current;
        // save the current state in the modeler before it is destroyed canceling any pending debounced saves
        saveDebounced.asyncImmediate().finally(() => {
          m?.destroy();
        });
      }
    };
    // only reset the modeler if we switch between editing being enabled or disabled
  }, [setModeler, canEdit]);

  useEffect(() => {
    // only import the bpmn once (the effect will be retriggered when the modeler is changed or when another process or version was selected)
    if (modeler.current?.importXML && processBpmn) {
      // import the new bpmn
      modeler.current.importXML(processBpmn).then(() => {
        // stay in the current subprocess when the page or the modeler reloads (unless the subprocess does not exist anymore because the process changed)
        const subprocessId = query.get('subprocess');
        if (subprocessId && modeler.current) {
          const canvas = modeler.current.get('canvas') as any;
          const subprocessPlane = canvas
            .getRootElements()
            .find((el: any) => el.businessObject.id === subprocessId);
          if (subprocessPlane) canvas.setRootElement(subprocessPlane);
          else
            messageApi.info(
              'The sub-process that was open does not exist anymore. Switched to the main process view.',
            );
        }

        (modeler.current!.get('canvas') as any).zoom('fit-viewport', 'auto');
      });

      modeler.current.on('selection.changed', (event) => {
        const { newSelection } = event as unknown as { newSelection: any[] };

        if (newSelection.length === 1) setSelectedElementId(newSelection[0].id);
        else setSelectedElementId(null);
      });
    }
  }, [setSelectedElementId, currentModelerType, processId, selectedVersionId]);

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
          {selectedVersionId && !showMobileView && <VersionToolbar />}
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
