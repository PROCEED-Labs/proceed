import useModelerStateStore from '@/lib/use-modeler-state-store';
import '@toast-ui/editor/dist/toastui-editor.css';

import { Editor, Viewer } from '@toast-ui/react-editor';
import React, { useEffect, useState } from 'react';
import BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';

import { CloseOutlined } from '@ant-design/icons';

import { EditOutlined } from '@ant-design/icons';

import { Drawer, Grid, Modal, Space } from 'antd';

const DescriptionSection: React.FC<{ description: string; selectedElement: any }> = ({
  description,
  selectedElement,
}) => {
  const editorRef: React.RefObject<any> = React.useRef();
  const modalEditorRef: React.RefObject<any> = React.useRef();
  const drawerEditorRef: React.RefObject<any> = React.useRef();

  const modeler = useModelerStateStore((state) => state.modeler);

  const [showPopupEditor, setShowPopupEditor] = useState(false);

  const breakpoint = Grid.useBreakpoint();

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

  useEffect(() => {
    if (drawerEditorRef.current) {
      const editor = drawerEditorRef.current as Editor;
      const editorInstance = editor.getInstance();

      editorInstance.setMarkdown(description);
    }
  }, [description, drawerEditorRef]);

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

      {breakpoint.xs ? (
        <Drawer
          open={showPopupEditor}
          width={'100vw'}
          styles={{ body: { padding: 0, margin: 0 } }}
          closeIcon={false}
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Description</span>
              <CloseOutlined
                onClick={() => {
                  setShowPopupEditor(false);
                }}
              ></CloseOutlined>
            </div>
          }
        >
          <Editor
            previewStyle="tab"
            autofocus={true}
            height="100%"
            viewer={true}
            initialEditType="wysiwyg"
            initialValue={description}
            ref={drawerEditorRef}
            onChange={() => {
              const editor = drawerEditorRef.current as Editor;
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
        </Drawer>
      ) : (
        <Modal
          width="75vw"
          className="editor-modal"
          styles={{ body: { height: '75vh' } }}
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
      )}
    </Space>
  );
};

export default DescriptionSection;
