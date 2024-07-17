import React, { useEffect, useMemo, useRef, useState } from 'react';

import styles from './index.module.scss';

import { Modal, Grid, Row as AntRow, Col } from 'antd';

import { Editor, Frame, Element, useEditor, EditorStore } from '@craftjs/core';

import IFrame from 'react-frame-component';

import SubmitButton from './SubmitButton';
import Text from './Text';
import Container from './Container';
import Row from './Row';
import Column from './Column';
import Sidebar from './_sidebar';
import { Toolbar, EditorLayout } from './Toolbar';
import Header from './Header';
import Input from './Input';
import CheckboxOrRadioGroup from './CheckboxOrRadioGroup';
import Table from './Table';
import Image from './Image';

import { iframeDocument, defaultForm } from './utils';

import AddUserControls from '@/components/add-user-controls';

import CustomEventhandlers from './CustomCommandhandlers';
import useBoundingClientRect from '@/lib/useBoundingClientRect';

import { saveProcessUserTask, getProcessUserTaskData } from '@/lib/data/processes';
import useModelerStateStore from '../use-modeler-state-store';

import { generateUserTaskFileName, getUserTaskImplementationString } from '@proceed/bpmn-helper';
import { useEnvironment } from '@/components/auth-can';

type BuilderProps = {
  processId: string;
  open: boolean;
  onClose: () => void;
};

const EditorModal: React.FC<BuilderProps> = ({ processId, open, onClose }) => {
  const { query, actions } = useEditor();

  const environment = useEnvironment();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeContainerRef = useRef<HTMLDivElement>(null);

  const [iframeWasMounted, setIframeWasMounted] = useState(false);

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
    if (filename && !open) {
      getProcessUserTaskData(processId, filename, environment.spaceId).then((data) => {
        let importData = defaultForm;
        if (typeof data === 'string') importData = data;

        actions.deserialize(importData);
      });
    }
  }, [processId, open, filename, environment]);

  useEffect(() => {
    if (iframeMaxWidth < 601) setIframeLayout('mobile');
    else setIframeLayout('computer');
  }, [iframeMaxWidth]);

  return (
    <Modal
      className={styles.BuilderModal}
      centered
      width={isMobile ? '100vw' : '90vw'}
      styles={{ body: { height: '85vh' } }}
      open={open}
      title="Edit User Task"
      okText="Save"
      onCancel={onClose}
      okButtonProps={{ disabled: isMobile }}
      onOk={() => {
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
          }
        }
      }}
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
          {!isMobile && iframeWasMounted && (
            <Col span={4}>
              <Sidebar iframeRef={iframeRef} />
            </Col>
          )}
          <Col
            ref={iframeContainerRef}
            className={styles.HtmlEditor}
            span={isMobile || !iframeWasMounted ? 24 : 20}
          >
            <IFrame
              id="user-task-builder-iframe"
              ref={iframeRef}
              width={iframeLayout === 'computer' || iframeMaxWidth <= 600 ? '100%' : '600px'}
              height="100%"
              style={{ border: 0, margin: 'auto' }}
              initialContent={iframeDocument}
              mountTarget="#mountHere"
              contentDidMount={() => {
                setIframeWasMounted(true);
                // will prevent that we focus the iframe when clicking into the empty space of its body which would prevent button clicks like Delete to register on the main document body
                iframeRef.current?.contentDocument?.body.addEventListener('mousedown', (e) =>
                  e.preventDefault(),
                );
              }}
            >
              <Frame />
            </IFrame>
          </Col>
        </AntRow>
      </div>
    </Modal>
  );
};

const UserTaskBuilder: React.FC<BuilderProps> = ({ processId, open, onClose }) => {
  const breakpoint = Grid.useBreakpoint();

  const isMobile = breakpoint.xs;

  return (
    <Editor
      resolver={{
        Header,
        Text,
        SubmitButton,
        Container,
        Row,
        Column,
        Input,
        CheckboxOrRadioGroup,
        Table,
        Image,
      }}
      enabled={!isMobile}
      handlers={(store: EditorStore) =>
        new CustomEventhandlers({
          store,
          isMultiSelectEnabled: () => false,
          removeHoverOnMouseleave: true,
        })
      }
      // TODO: maybe we can replace the automatic row creation and cleanup in the custom drag logic
      // onBeforeMoveEnd={()}
    >
      <AddUserControls
        name="user-task-editor"
        checker={{
          undo: (e) => e.ctrlKey && e.key === 'z',
          redo: (e) => e.ctrlKey && e.shiftKey && e.key === 'Z',
          delete: (e) => e.key === 'Delete',
        }}
      />
      <EditorModal processId={processId} open={open} onClose={onClose} />
    </Editor>
  );
};

export default UserTaskBuilder;
