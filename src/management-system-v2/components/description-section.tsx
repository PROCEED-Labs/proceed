import useModelerStateStore from '@/lib/use-modeler-state-store';
import '@toast-ui/editor/dist/toastui-editor.css';

import { Editor, Viewer } from '@toast-ui/react-editor';
import React, { useEffect, useState } from 'react';
import BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';

import { EditOutlined } from '@ant-design/icons';

import { Modal, Space } from 'antd';

const DescriptionSection: React.FC<{ description: string; selectedElement: any }> = ({
  description,
  selectedElement,
}) => {
  const editorRef: React.RefObject<any> = React.useRef();
  const modalEditorRef: React.RefObject<any> = React.useRef();

  const modeler = useModelerStateStore((state) => state.modeler);

  const [showPopupEditor, setShowPopupEditor] = useState(false);

  useEffect(() => {
    if (editorRef.current) {
      const editor = editorRef.current as Editor;
      const editorInstance = editor.getInstance();

      editorInstance.setMarkdown(description);
    }
  }, [description, editorRef]);

  useEffect(() => {
    if (modalEditorRef.current) {
      const editor = modalEditorRef.current as Editor;
      const editorInstance = editor.getInstance();

      editorInstance.setMarkdown(description);
    }
  }, [description, modalEditorRef]);

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
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <b style={{ marginRight: '0.3em' }}>Description</b>
        <EditOutlined
          onClick={() => {
            setShowPopupEditor(true);
          }}
        ></EditOutlined>
      </div>
      <div style={{ height: '30vh', overflowY: 'scroll' }}>
        <Viewer ref={editorRef} initialValue={description}></Viewer>
      </div>

      <Modal
        width="50vw"
        className="editor-modal"
        styles={{ body: { height: '50vh' } }}
        open={showPopupEditor}
        title={null}
        footer={null}
        onCancel={() => setShowPopupEditor(false)}
      >
        <Editor
          previewStyle="tab"
          autofocus={true}
          height="100%"
          viewer={true}
          initialEditType="wysiwyg"
          initialValue={description}
          ref={modalEditorRef}
          onChange={() => {
            const editor = modalEditorRef.current as Editor;
            const editorInstance = editor.getInstance();
            const content = editorInstance.getMarkdown();
            updateDescription(content);
          }}
          toolbarItems={[
            ['heading', 'bold', 'italic'],
            ['hr', 'quote'],
            ['ul', 'ol', 'indent', 'outdent'],
            ['table', 'link'],
            ['code', 'codeblock'],
            ['scrollSync'],
          ]}
        />
      </Modal>
    </Space>
  );
};

export default DescriptionSection;
