import useModelerStateStore from './use-modeler-state-store';
import '@toast-ui/editor/dist/toastui-editor.css';

import { Editor, Viewer } from '@toast-ui/react-editor';
import React, { useEffect, useState } from 'react';

import { EditOutlined, CloseOutlined } from '@ant-design/icons';

import { Button, Divider, Drawer, Grid, Modal, Space } from 'antd';
import TextEditor from '@/components/text-editor';

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
    const modeling = modeler!.getModeling();
    const bpmnFactory = modeler!.getFactory();

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
      <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>
        <Viewer ref={viewerRef} initialValue={description}></Viewer>
      </div>

      <Modal
        width={breakpoint.xs ? '100vw' : '75vw'}
        style={{ maxWidth: '1200px' }}
        centered
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
    </Space>
  );
};

export default DescriptionSection;
