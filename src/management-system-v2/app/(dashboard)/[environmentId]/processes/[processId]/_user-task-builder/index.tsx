import React, { useEffect, useMemo, useRef, useState } from 'react';

import styles from './index.module.scss';

import { Modal, Grid, Row as AntRow, Col } from 'antd';

import { Editor, Frame, useEditor, EditorStore } from '@craftjs/core';

import IFrame from 'react-frame-component';

import { Toolbar, EditorLayout } from './Toolbar';
import Sidebar from './_sidebar';

import * as Elements from './elements';

import { iframeDocument, defaultForm } from './utils';

import CustomEventhandlers from './CustomCommandhandlers';
import useBoundingClientRect from '@/lib/useBoundingClientRect';

import { saveProcessUserTask, getProcessUserTaskData } from '@/lib/data/processes';
import useModelerStateStore from '../use-modeler-state-store';

import { generateUserTaskFileName, getUserTaskImplementationString } from '@proceed/bpmn-helper';
import { useEnvironment } from '@/components/auth-can';

import EditorDnDHandler from './DragAndDropHandler';

type BuilderProps = {
  processId: string;
  open: boolean;
  onClose: () => void;
};

type BuilderModalProps = BuilderProps & {
  onSave: () => void;
  hasUnsavedChanges: boolean;
  onInit: () => void;
};

const EditorModal: React.FC<BuilderModalProps> = ({
  processId,
  open,
  hasUnsavedChanges,
  onClose,
  onSave,
  onInit,
}) => {
  const { query, actions, editingEnabled } = useEditor((state) => {
    return { editingEnabled: state.options.enabled };
  });

  const environment = useEnvironment();

  const [iframeMounted, setIframeMounted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeContainerRef = useRef<HTMLDivElement>(null);

  const [iframeLayout, setIframeLayout] = useState<EditorLayout>('computer');

  const { width: iframeMaxWidth } = useBoundingClientRect(iframeContainerRef, ['width']);

  const breakpoint = Grid.useBreakpoint();

  const isMobile = breakpoint.xs;

  const modeler = useModelerStateStore((state) => state.modeler);
  const selectedElementId = useModelerStateStore((state) => state.selectedElementId);
  const filename = useMemo(() => {
    if (modeler && selectedElementId) {
      const selectedElement = modeler.getElement(selectedElementId);
      if (selectedElement && selectedElement.type === 'bpmn:UserTask') {
        return (
          (selectedElement.businessObject.fileName as string | undefined) ||
          generateUserTaskFileName()
        );
      }
    }

    return undefined;
  }, [modeler, selectedElementId]);

  useEffect(() => {
    if (filename && open) {
      getProcessUserTaskData(processId, filename, environment.spaceId).then((data) => {
        let importData = defaultForm;
        if (typeof data === 'string') importData = data;

        actions.deserialize(importData);
        actions.history.clear();
        onInit();
      });
    }
  }, [processId, open, filename, environment]);

  useEffect(() => {
    if (iframeMaxWidth < 601) setIframeLayout('mobile');
    else setIframeLayout('computer');
  }, [iframeMaxWidth]);

  const handleSave = () => {
    const json = query.serialize();
    if (modeler && selectedElementId) {
      const selectedElement = modeler.getElement(selectedElementId);
      if (selectedElement) {
        if (filename !== selectedElement.businessObject.fileName) {
          modeler.getModeling().updateProperties(selectedElement, {
            fileName: filename,
            implementation: getUserTaskImplementationString(),
          });
        }
        saveProcessUserTask(processId, filename!, json, environment.spaceId).then(
          (res) => res && console.error(res.error),
        );
        onSave();
      }
    }
  };

  return (
    <Modal
      className={styles.BuilderModal}
      centered
      width={isMobile ? '100vw' : '90vw'}
      styles={{ body: { height: '85vh' } }}
      open={open}
      title="Edit User Task"
      okText="Save"
      cancelText={hasUnsavedChanges ? 'Cancel' : 'Close'}
      onCancel={onClose}
      okButtonProps={{ disabled: !editingEnabled }}
      onOk={handleSave}
    >
      <EditorDnDHandler
        iframeRef={iframeRef}
        disabled={!iframeMounted}
        mobileView={iframeLayout === 'mobile'}
      >
        <div className={styles.BuilderUI}>
          {!isMobile && (
            <Toolbar
              iframeMaxWidth={iframeMaxWidth}
              iframeLayout={iframeLayout}
              onLayoutChange={setIframeLayout}
            />
          )}
          <AntRow className={styles.EditorBody}>
            {!isMobile && (
              <Col style={{ height: '100%', overflow: 'auto' }} span={4}>
                <Sidebar />
              </Col>
            )}
            <Col ref={iframeContainerRef} className={styles.HtmlEditor} span={isMobile ? 24 : 20}>
              <IFrame
                id="user-task-builder-iframe"
                ref={iframeRef}
                width={iframeLayout === 'computer' || iframeMaxWidth <= 600 ? '100%' : '600px'}
                height="100%"
                style={{ border: 0, margin: 'auto' }}
                initialContent={iframeDocument}
                mountTarget="#mountHere"
                contentDidMount={() => setIframeMounted(true)}
              >
                <Frame />
              </IFrame>
            </Col>
          </AntRow>
        </div>
      </EditorDnDHandler>
    </Modal>
  );
};

const UserTaskBuilder: React.FC<BuilderProps> = ({ processId, open, onClose }) => {
  const breakpoint = Grid.useBreakpoint();

  const isMobile = breakpoint.xs;

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [modalApi, modalElement] = Modal.useModal();

  const handleClose = () => {
    if (!hasUnsavedChanges) {
      onClose();
    } else {
      modalApi.confirm({
        title: 'You have unsaved changes!',
        content: 'Are you sure you want to close without saving?',
        onOk: () => {
          onClose();
        },
      });
    }
  };

  return (
    <>
      <Editor
        resolver={{
          ...Elements,
        }}
        enabled={!isMobile}
        handlers={(store: EditorStore) =>
          new CustomEventhandlers({
            store,
            isMultiSelectEnabled: () => false,
            removeHoverOnMouseleave: true,
          })
        }
        onNodesChange={() => {
          setHasUnsavedChanges(true);
        }}
      >
        <EditorModal
          processId={processId}
          open={open}
          hasUnsavedChanges={hasUnsavedChanges}
          onClose={handleClose}
          onInit={() => {
            setHasUnsavedChanges(false);
          }}
          onSave={() => setHasUnsavedChanges(false)}
        />
      </Editor>

      {modalElement}
    </>
  );
};

export default UserTaskBuilder;
