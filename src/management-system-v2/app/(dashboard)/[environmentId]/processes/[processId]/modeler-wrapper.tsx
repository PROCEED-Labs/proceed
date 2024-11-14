'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ModelerToolbar from './modeler-toolbar';
import XmlEditor from './xml-editor';
import useModelerStateStore from './use-modeler-state-store';
import { spaceURL } from '@/lib/utils';
import VersionToolbar from './version-toolbar';
import useMobileModeler from '@/lib/useMobileModeler';
import { updateProcess } from '@/lib/data/processes';
import { is as bpmnIs } from 'bpmn-js/lib/util/ModelUtil';
import { useEnvironment } from '@/components/auth-can';
import ModelerZoombar from './modeler-zoombar';
import { useAddControlCallback } from '@/lib/controls-store';
import BPMNModeler from './bpmn-modeler';

type ModelerProps = React.HTMLAttributes<HTMLDivElement> & {
  versionName?: string;
  process: { name: string; id: string; bpmn: string };
  versions: { version: number; name: string; description: string }[];
};

const Modeler = ({ versionName, process, versions, ...divProps }: ModelerProps) => {
  const pathname = usePathname();
  const environment = useEnvironment();
  const [xmlEditorBpmn, setXmlEditorBpmn] = useState<string | undefined>(undefined);
  const query = useSearchParams();
  const router = useRouter();
  const modeler = useModelerStateStore((state) => state.modeler);
  const canUndo = useModelerStateStore((state) => state.canUndo);
  const canRedo = useModelerStateStore((state) => state.canRedo);
  const isLoaded = useModelerStateStore((state) => state.isLoaded);

  const rootElement = useModelerStateStore((state) => state.rootElement);

  /// Derived State
  const minimized = !decodeURIComponent(pathname).includes(process.id);

  const selectedVersionId = query.get('version');

  const showMobileView = useMobileModeler();

  useEffect(() => {
    // When the current root (the visible layer [the main
    // process/collaboration or some collapsed subprocess]) is changed to a
    // subprocess add its id to the query
    if (modeler) {
      const searchParams = new URLSearchParams(window.location.search);
      const before = searchParams.toString();

      let replace = false;
      if (rootElement && bpmnIs(rootElement, 'bpmn:SubProcess')) {
        searchParams.set(`subprocess`, `${rootElement.businessObject.id}`);
      } else {
        const canvas = modeler.getCanvas();
        const subprocessPlane = canvas
          .getRootElements()
          .find((el: any) => el.businessObject.id === searchParams.get('subprocess'));
        if (searchParams.has('subprocess') && !subprocessPlane) {
          // The subprocess that was open does not exist anymore in this
          // version. Switch to the main process view and replace history
          // instead of push.
          replace = true;
        }
        searchParams.delete('subprocess');
      }

      if (before !== searchParams.toString()) {
        if (replace) {
          router.replace(pathname + '?' + searchParams.toString());
        } else {
          router.push(
            spaceURL(
              environment,
              `/processes/${process.id}${searchParams.size ? '?' + searchParams.toString() : ''}`,
            ),
          );
        }
      }
    }
  }, [process.id, router, rootElement]);

  const handleOpenXmlEditor = async () => {
    // Undefined can maybe happen when click happens during router transition?
    if (modeler) {
      const xml = await modeler.getXML();
      setXmlEditorBpmn(xml);
    }
  };

  useAddControlCallback('modeler', 'cut', handleOpenXmlEditor);

  const handleCloseXmlEditor = () => {
    setXmlEditorBpmn(undefined);
  };

  const handleXmlEditorSave = async (bpmn: string) => {
    if (modeler) {
      await modeler.loadBPMN(bpmn);
      // If the bpmn contains unexpected content (text content for an element
      // where the model does not define text) the modeler will remove it
      // automatically => make sure the stored bpmn is the same as the one in
      // the modeler.
      const cleanedBpmn = await modeler.getXML();
      await updateProcess(process.id, environment.spaceId, cleanedBpmn);
    }
  };

  return (
    <div style={{ height: '100%' }}>
      {!minimized && (
        <>
          {isLoaded && (
            <ModelerToolbar
              processId={process.id}
              onOpenXmlEditor={handleOpenXmlEditor}
              versions={versions}
              canRedo={canRedo}
              canUndo={canUndo}
            />
          )}
          {selectedVersionId && !showMobileView && <VersionToolbar processId={process.id} />}
          <ModelerZoombar></ModelerZoombar>
          {!!xmlEditorBpmn && (
            <XmlEditor
              bpmn={xmlEditorBpmn}
              canSave={!selectedVersionId}
              onClose={handleCloseXmlEditor}
              onSaveXml={handleXmlEditorSave}
              process={process}
              versionName={versionName}
            />
          )}
        </>
      )}
      <BPMNModeler
        versionName={versionName}
        versions={versions}
        process={process}
        {...divProps}
      ></BPMNModeler>
    </div>
  );
};

export default Modeler;
