import React, { useEffect, useMemo, useRef, useState } from 'react';

import styles from './index.module.scss';

import { Modal, Grid, Row as AntRow, Col } from 'antd';

import { Editor, Frame, useEditor, EditorStore } from '@craftjs/core';

import IFrame from 'react-frame-component';

import { Toolbar, EditorLayout } from './Toolbar';
import Sidebar from './_sidebar';

import * as Elements from './elements';

import { iframeDocument, defaultForm, toHtml } from './utils';

import CustomEventhandlers from './CustomCommandhandlers';
import useBoundingClientRect from '@/lib/useBoundingClientRect';

import {
  saveProcessUserTask,
  getProcessUserTaskData,
  getProcessStartFormData,
  saveProcessStartForm,
} from '@/lib/data/processes';
import useModelerStateStore from '../use-modeler-state-store';

import {
  generateUserTaskFileName,
  getUserTaskImplementationString,
  generateStartFormFileName,
} from '@proceed/bpmn-helper';
import { useEnvironment } from '@/components/auth-can';

import EditorDnDHandler from './DragAndDropHandler';
import { DiffResult, deepEquals } from '@/lib/helpers/javascriptHelpers';
import { updateFileDeletableStatus as updateImageRefCounter } from '@/lib/data/file-manager-facade';

import { is as bpmnIs } from 'bpmn-js/lib/util/ModelUtil';
import { Element as BpmnElement } from 'bpmn-js/lib/model/Types';

import { useCanEdit } from '../modeler';
import { Element } from 'diagram-js/lib/model/Types';

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

type FormStoringFunction = typeof saveProcessStartForm;
type FormFetchingFunction = typeof getProcessStartFormData;

export function canHaveForm(element?: Element) {
  if (!element) return false;
  if (bpmnIs(element, 'bpmn:UserTask')) return true;

  // allow setting the start form of a process when a start element is selected that is not typed
  // (no timer, signal, etc)
  if (!bpmnIs(element, 'bpmn:StartEvent')) return false;
  return !element.businessObject.eventDefinitions?.length;
}

const EditorModal: React.FC<BuilderModalProps> = ({
  processId,
  open,
  hasUnsavedChanges,
  onClose,
  onSave,
  onInit,
}) => {
  const { query, actions } = useEditor();

  const editingEnabled = useCanEdit();

  const environment = useEnvironment();

  const [iframeMounted, setIframeMounted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [iframeContainer, setIframeContainer] = useState<HTMLDivElement>();

  const [iframeLayout, setIframeLayout] = useState<EditorLayout>('computer');

  const { width: iframeMaxWidth } = useBoundingClientRect(iframeContainer, ['width']);

  const breakpoint = Grid.useBreakpoint();

  const isMobile = breakpoint.xs;

  const modeler = useModelerStateStore((state) => state.modeler);
  const selectedElementId = useModelerStateStore((state) => state.selectedElementId);

  const selectedElement = modeler && selectedElementId && modeler.getElement(selectedElementId);

  const affectedElement = useMemo(() => {
    if (modeler && selectedElement && canHaveForm(selectedElement)) {
      if (bpmnIs(selectedElement, 'bpmn:UserTask')) {
        return selectedElement;
      } else if (bpmnIs(selectedElement, 'bpmn:StartEvent')) {
        let element: Element | undefined = selectedElement;
        while (element) {
          if (bpmnIs(element, 'bpmn:Process')) return element;
          element = element.parent;
        }
      }
    }

    return undefined;
  }, [modeler, selectedElement]);

  const filename = useMemo(() => {
    if (affectedElement) {
      if (bpmnIs(affectedElement, 'bpmn:UserTask')) {
        return affectedElement.businessObject.fileName || generateUserTaskFileName();
      } else if (bpmnIs(affectedElement, 'bpmn:Process')) {
        return (
          affectedElement.businessObject.uiForNontypedStartEventsFileName ||
          generateStartFormFileName()
        );
      }
    }

    return undefined;
  }, [affectedElement]);

  useEffect(() => {
    if (filename && open) {
      let fetchData: FormFetchingFunction | undefined = undefined;

      if (bpmnIs(affectedElement, 'bpmn:UserTask')) fetchData = getProcessUserTaskData;
      else if (bpmnIs(affectedElement, 'bpmn:Process')) fetchData = getProcessStartFormData;

      if (fetchData)
        fetchData(processId, filename, environment.spaceId).then((data) => {
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
    if (modeler && affectedElement) {
      if (affectedElement) {
        const html = toHtml(json);

        let fileNameAttribute = '';
        let additionalChanges = {};
        let storingFunction: FormStoringFunction | undefined = undefined;

        if (bpmnIs(affectedElement, 'bpmn:UserTask')) {
          fileNameAttribute = 'fileName';
          additionalChanges = { implementation: getUserTaskImplementationString() };
          storingFunction = saveProcessUserTask;
        } else if (bpmnIs(affectedElement, 'bpmn:Process')) {
          fileNameAttribute = 'uiForNontypedStartEventsFileName';
          storingFunction = saveProcessStartForm;
        }

        if (fileNameAttribute && storingFunction) {
          if (filename !== affectedElement.businessObject[fileNameAttribute]) {
            modeler.getModeling().updateProperties(affectedElement as BpmnElement, {
              [fileNameAttribute]: filename,
              ...additionalChanges,
            });
          }
          storingFunction(processId, filename!, json, html, environment.spaceId).then(
            (res) => res && console.error(res.error),
          );
        }

        onSave();
      }
    }
  };

  let title = 'Edit Form';

  if (bpmnIs(affectedElement, 'bpmn:UserTask')) {
    title = 'Edit User Task Form';
  } else if (bpmnIs(affectedElement, 'bpmn:Process')) {
    title = 'Edit Process Start Form';
  }

  return (
    <Modal
      className={styles.BuilderModal}
      centered
      width={isMobile ? '100vw' : '90vw'}
      styles={{ body: { height: '85vh' } }}
      open={open}
      title={title}
      okText="Save"
      cancelText={hasUnsavedChanges ? 'Cancel' : 'Close'}
      onCancel={onClose}
      okButtonProps={{ disabled: !editingEnabled }}
      onOk={handleSave}
    >
      <EditorDnDHandler
        iframeRef={iframeRef}
        disabled={!iframeMounted || !editingEnabled}
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
            <Col
              style={{ border: '2px solid #d3d3d3', borderRadius: '8px' }}
              ref={(r) => {
                if (r && r != iframeContainer) {
                  setIframeContainer(r);
                }
              }}
              className={styles.HtmlEditor}
              span={isMobile ? 24 : 20}
            >
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

  const prevState = useRef({});

  const [modalApi, modalElement] = Modal.useModal();

  function updateImageReference(action: 'add' | 'delete', src: string) {
    const isDeleteAction = action === 'delete';
    updateImageRefCounter(
      // spaceId,
      // data?.user.id!,
      src,
      isDeleteAction,
      processId,
    );
  }

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
          Image: Elements.EditImage,
        }}
        enabled={!isMobile}
        handlers={(store: EditorStore) =>
          new CustomEventhandlers({
            store,
            isMultiSelectEnabled: () => false,
            removeHoverOnMouseleave: true,
          })
        }
        onNodesChange={(query) => {
          const current = JSON.parse(query.serialize());

          if (Object.keys(prevState.current).length !== 0) {
            const result = deepEquals(prevState.current, current, '', true) as null | DiffResult;

            if (result) {
              const { valueA, valueB, path } = result;
              const valueAHasSrc = valueA?.hasOwnProperty('src');
              const valueBHasSrc = valueB?.hasOwnProperty('src');

              // Handle image deletion
              if (valueAHasSrc && !valueBHasSrc) {
                console.log('image deleted');
                updateImageReference('delete', valueA.src);
              }

              // Handle image addition
              if (!valueAHasSrc && valueBHasSrc) {
                console.log('image added');
                updateImageReference('add', valueB.src);
              }

              // Handle image replacement
              if (path?.includes('props.src')) {
                console.log('image replaced');
                updateImageReference('add', valueB.src);
                updateImageReference('delete', valueA.src);
              }

              // Handle deleted and added image nodes
              if (!path) {
                [result.valueA, result.valueB].forEach((value, isAdding) => {
                  for (const key in value) {
                    const node = value[key];
                    if (node?.displayName === 'Image' && node.props?.hasOwnProperty('src')) {
                      console.log(`Image Node ${isAdding ? 'added' : 'deleted'}`, node.props);
                      updateImageReference(isAdding ? 'add' : 'delete', node.props.src);
                    }
                  }
                });
              }
            }
          }

          prevState.current = current;
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
