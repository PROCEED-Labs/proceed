import useModelerStateStore from '@/lib/use-modeler-state-store';
import '@toast-ui/editor/dist/toastui-editor.css';

import { Editor, Viewer } from '@toast-ui/react-editor';
import React, { useEffect, useState } from 'react';
import BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';

import { EditOutlined, CloseOutlined } from '@ant-design/icons';

import { Button, Divider, Drawer, Grid, Modal, Space } from 'antd';
import TextEditor from './text-editor';

const DescriptionSection: React.FC<{ description: string; selectedElement: any }> = ({
  description,
  selectedElement,
}) => {
  const viewerRef = React.useRef<Viewer>(null);
  const modalEditorRef = React.useRef<Editor>(null);
  const drawerEditorRef = React.useRef<Editor>(null);

  const modeler = useModelerStateStore((state) => state.modeler);

  const [showPopupEditor, setShowPopupEditor] = useState(false);

  const breakpoint = Grid.useBreakpoint();

  useEffect(() => {
    if (viewerRef.current) {
      const viewer = viewerRef.current as Viewer;
      const viewerInstance = viewer.getInstance();

      viewerInstance.setMarkdown(description);
    }
  }, [description, viewerRef]);

  const onSubmit = (editorRef: React.RefObject<Editor>) => {
    const editor = editorRef.current as Editor;
    const editorInstance = editor.getInstance();
    const content = editorInstance.getMarkdown();
    updateDescription(content);
    setShowPopupEditor(false);
  };

  const updateDescription = (text: string) => {
    const modeling = modeler!.get('modeling') as Modeling;
    const bpmnFactory = modeler!.get('bpmnFactory') as BpmnFactory;

    if (text) {
      const documentationElement = bpmnFactory.create('bpmn:Documentation', {
        text,
      });
      modeling.updateProperties(selectedElement as any, { documentation: [documentationElement] });
    } else {
      modeling.updateProperties(selectedElement as any, { documentation: null });
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Divider style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
        <span style={{ marginRight: '0.3em' }}>Description</span>
        <EditOutlined
          onClick={() => {
            setShowPopupEditor(true);
          }}
        ></EditOutlined>
      </Divider>
      <div style={{ maxHeight: '30vh', overflowY: 'auto' }}>
        <Viewer ref={viewerRef} initialValue={description}></Viewer>
      </div>

      {breakpoint.md ? (
        <Modal
          width="75vw"
          className="editor-modal"
          styles={{ body: { height: '75vh' } }}
          open={showPopupEditor}
          title="Edit Description"
          okText="Save"
          onOk={() => onSubmit(modalEditorRef)}
          onCancel={() => setShowPopupEditor(false)}
        >
          <TextEditor ref={modalEditorRef} initialValue={description}></TextEditor>
        </Modal>
      ) : (
        <Drawer
          open={showPopupEditor}
          width={'100vw'}
          styles={{ body: { padding: 0, marginBottom: '1rem', overflowY: 'hidden' } }}
          closeIcon={false}
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Edit Description</span>
              <CloseOutlined onClick={() => setShowPopupEditor(false)}></CloseOutlined>
            </div>
          }
          footer={
            <Space style={{ display: 'flex', justifyContent: 'end' }}>
              <Button
                onClick={() => {
                  setShowPopupEditor(false);
                }}
              >
                Cancel
              </Button>
              <Button type="primary" onClick={() => onSubmit(drawerEditorRef)}>
                Save
              </Button>
            </Space>
          }
        >
          <TextEditor ref={drawerEditorRef} initialValue={description}></TextEditor>
        </Drawer>
      )}
    </Space>
  );
};

export default DescriptionSection;
