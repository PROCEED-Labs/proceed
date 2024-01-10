'use client';

import React, {
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ModelerToolbar from './modeler-toolbar';
import XmlEditor from './xml-editor';
import useModelerStateStore from './use-modeler-state-store';
import { debounce } from '@/lib/utils';
import VersionToolbar from './version-toolbar';
import useMobileModeler from '@/lib/useMobileModeler';
import { updateProcess } from '@/lib/data/processes';
import { App } from 'antd';
import { is as bpmnIs, isAny as bpmnIsAny } from 'bpmn-js/lib/util/ModelUtil';
import BPMNCanvas, { BPMNCanvasProps, BPMNCanvasRef } from '@/components/bpmn-canvas';

type ModelerProps = React.HTMLAttributes<HTMLDivElement> & {
  versionName?: string;
  process: { definitionName: string; definitionId: string; bpmn: string };
  versions: { version: number; name: string; description: string }[];
};

const Modeler = ({ versionName, process, versions, ...divProps }: ModelerProps) => {
  const pathname = usePathname();
  const [xmlEditorBpmn, setXmlEditorBpmn] = useState<string | undefined>(undefined);
  const query = useSearchParams();
  const router = useRouter();
  const { message: messageApi } = App.useApp();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const modeler = useRef<BPMNCanvasRef>(null);

  const setModeler = useModelerStateStore((state) => state.setModeler);
  const setSelectedElementId = useModelerStateStore((state) => state.setSelectedElementId);
  const setRootElement = useModelerStateStore((state) => state.setRootElement);

  /// Derived State
  const minimized = pathname !== `/processes/${process.definitionId}`;
  const selectedVersionId = query.get('version');
  const subprocessId = query.get('subprocess');

  const showMobileView = useMobileModeler();

  const canEdit = !selectedVersionId && !showMobileView;

  const saveDebounced = useMemo(
    () =>
      debounce(async (xml: string) => {
        try {
          await updateProcess(process.definitionId, xml);
        } catch (err) {
          console.log(err);
        }
      }, 2000),
    [process.definitionId],
  );

  useEffect(() => {
    console.log('modeler changed');
    setModeler(modeler.current);

    setCanUndo(false);
    setCanRedo(false);

    return () => {
      setModeler(null);
    };
  }, [canEdit, process, setModeler]);

  const onSelectionChange = useCallback<Required<BPMNCanvasProps>['onSelectionChange']>(
    (selection) => {
      if (selection.length === 1) {
        setSelectedElementId(selection[0].id);
      } else {
        setSelectedElementId(null);
      }
    },
    [setSelectedElementId],
  );

  const onChange = useCallback<Required<BPMNCanvasProps>['onChange']>(async () => {
    // Save in the background when the BPMN changes.
    saveDebounced(await modeler.current!.getXML());
    // Update undo/redo state.
    setCanUndo(modeler.current!.canUndo() ?? false);
    setCanRedo(modeler.current!.canRedo() ?? false);
  }, [saveDebounced]);

  const onRootChange = useCallback<Required<BPMNCanvasProps>['onRootChange']>(
    async (root) => {
      console.log('root changed');
      setRootElement(root);
      // When the current root (the visible layer [the main
      // process/collaboration or some collapsed subprocess]) is changed to a
      // subprocess add its id to the query
      const searchParams = new URLSearchParams(window.location.search);
      const before = searchParams.toString();

      if (bpmnIs(root, 'bpmn:SubProcess')) {
        searchParams.set(`subprocess`, `${root.businessObject.id}`);
      } else {
        searchParams.delete('subprocess');
      }

      if (before !== searchParams.toString()) {
        router.push(
          `/processes/${process.definitionId}${
            searchParams.size ? '?' + searchParams.toString() : ''
          }`,
        );
      }
    },
    [process.definitionId, router, setRootElement],
  );

  const onUnload = useCallback<Required<BPMNCanvasProps>['onUnload']>(
    async (oldInstance) => {
      // TODO: early return if no changes were made.

      // Save the BPMN when the modeler is destroyed (usually when the component
      // is unmounted).
      try {
        // Since this is in cleanup, we can't use ref because it is already null
        // or uses the new instance.
        const { xml } = await oldInstance.saveXML({ format: true });
        await saveDebounced.asyncImmediate(xml).catch((err) => {});
      } catch (err) {
        // Most likely called before the modeler loaded anything. Can ignore.
      }
    },
    [saveDebounced],
  );

  const onLoaded = useCallback<Required<BPMNCanvasProps>['onLoaded']>(() => {
    // stay in the current subprocess when the page or the modeler reloads
    // (unless the subprocess does not exist anymore because the process
    // changed)
    console.log('onLoaded');
    if (subprocessId && modeler.current) {
      const canvas = modeler.current.getCanvas();
      const subprocessPlane = canvas
        .getRootElements()
        .find((el: any) => el.businessObject.id === subprocessId);
      if (subprocessPlane) {
        canvas.setRootElement(subprocessPlane);
      } else {
        messageApi.info(
          'The sub-process that was open does not exist anymore. Switched to the main process view.',
        );
      }
    }
  }, [messageApi, subprocessId]);

  useEffect(() => {
    if (modeler.current) {
      const canvas = modeler.current.getCanvas();
      const subprocessPlane = canvas
        .getRootElements()
        .find((el: any) => el.businessObject.id === subprocessId);
      if (subprocessPlane) {
        canvas.setRootElement(subprocessPlane);
      } else {
        const processPlane = canvas
          .getRootElements()
          .find((el) => bpmnIsAny(el, ['bpmn:Process', 'bpmn:Collaboration']));
        if (!processPlane) {
          return;
        }
        canvas.setRootElement(processPlane);
      }
    }
  }, [subprocessId]);

  const handleOpenXmlEditor = async () => {
    // Undefined can maybe happen when click happens during router transition?
    if (modeler.current) {
      const xml = await modeler.current.getXML();
      setXmlEditorBpmn(xml);
    }
  };

  const handleCloseXmlEditor = () => {
    setXmlEditorBpmn(undefined);
  };

  const handleXmlEditorSave = async (bpmn: string) => {
    if (modeler.current) {
      await modeler.current.loadBPMN(bpmn);
      // If the bpmn contains unexpected content (text content for an element
      // where the model does not define text) the modeler will remove it
      // automatically => make sure the stored bpmn is the same as the one in
      // the modeler.
      const cleanedBpmn = await modeler.current.getXML();
      await updateProcess(process.definitionId, cleanedBpmn);
    }
  };

  useEffect(() => {
    // Wipe router cache to ensure changes are loaded next time. subprocessId is
    // included because browser back button would reload old bpmn from
    // subprocess -> main process.
    router.refresh();
  }, [router, process.definitionId, selectedVersionId, subprocessId]);

  const bpmn = useMemo(
    () => ({ bpmn: process.bpmn }),
    [process.definitionId, process.bpmn, selectedVersionId],
  );

  return (
    <div className="bpmn-js-modeler-with-toolbar" style={{ height: '100%' }}>
      {!minimized && (
        <>
          <ModelerToolbar
            processId={process.definitionId}
            onOpenXmlEditor={handleOpenXmlEditor}
            versions={versions}
            canRedo={canRedo}
            canUndo={canUndo}
          />
          {selectedVersionId && !showMobileView && (
            <VersionToolbar processId={process.definitionId} />
          )}
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
      <BPMNCanvas
        ref={modeler}
        type={canEdit ? 'modeler' : 'viewer'}
        bpmn={bpmn}
        className={divProps.className}
        onLoaded={onLoaded}
        onUnload={canEdit ? onUnload : undefined}
        onRootChange={onRootChange}
        onChange={canEdit ? onChange : undefined}
        onSelectionChange={onSelectionChange}
      />
    </div>
  );
};

export default Modeler;
