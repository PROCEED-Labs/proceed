import useModelerStateStore from './use-modeler-state-store';
import '@toast-ui/editor/dist/toastui-editor.css';
import type { Editor as EditorClass, Viewer as ViewerClass } from '@toast-ui/react-editor';
import React, { useEffect, useState } from 'react';
import { EditOutlined } from '@ant-design/icons';
import { Divider, Grid, Modal, Space } from 'antd';
import dynamic from 'next/dynamic';
const TextViewer = dynamic(() => import('@/components/text-viewer'), { ssr: false });
const TextEditor = dynamic(() => import('@/components/text-editor'), { ssr: false });

const DescriptionSection: React.FC<{ selectedElement: any }> = ({ selectedElement }) => {
  const description =
    (selectedElement.businessObject.documentation &&
      selectedElement.businessObject.documentation[0]?.text) ||
    '';
  const modalEditorRef = React.useRef<EditorClass>(null);
  const modeler = useModelerStateStore((state) => state.modeler);
  const [showPopupEditor, setShowPopupEditor] = useState(false);
  const breakpoint = Grid.useBreakpoint();

  const onSubmit = (editorRef: React.RefObject<EditorClass>) => {
    const editor = editorRef.current as EditorClass;
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
        <TextViewer initialValue={description}></TextViewer>
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
        <TextEditor editorRef={modalEditorRef} initialValue={description}></TextEditor>
      </Modal>
    </Space>
  );
};

export default DescriptionSection;
