import useModelerStateStore from './use-modeler-state-store';
import '@toast-ui/editor/dist/toastui-editor.css';
import type { Editor as EditorClass, Viewer as ViewerClass } from '@toast-ui/react-editor';
import React, { useEffect, useState } from 'react';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Divider, Grid, Modal, Space } from 'antd';
import dynamic from 'next/dynamic';
import ScrollBar from '@/components/scrollbar';
const TextViewer = dynamic(() => import('@/components/text-viewer'), { ssr: false });
const TextEditor = dynamic(() => import('@/components/text-editor'), { ssr: false });

const DescriptionSection: React.FC<{ selectedElement: any; readOnly?: boolean }> = ({
  selectedElement,
  readOnly = false,
}) => {
  const [description, setDescription] = useState('');

  useEffect(() => {
    const newDescription =
      (selectedElement.businessObject.documentation &&
        (selectedElement.businessObject.documentation[0]?.text as string)) ||
      '';
    setDescription(newDescription);
  }, [selectedElement.businessObject.documentation]);

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

    setDescription(text || '');
  };

  return (
    <Space
      direction="vertical"
      style={{ width: '100%' }}
      role="group"
      aria-labelledby="description-title"
    >
      <Divider style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
        <span id="description-title" style={{ marginRight: '0.3em' }}>
          Description
        </span>
      </Divider>

      {description ? (
        <div
          style={{
            backgroundColor: '#fafafa',
            border: '1px solid #f0f0f0',
            borderRadius: '0.5rem',
            padding: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              style={{ fontSize: '0.75rem' }}
              type="text"
              size="small"
              icon={
                <EditOutlined
                  onClick={() => {
                    setShowPopupEditor(true);
                  }}
                ></EditOutlined>
              }
              disabled={readOnly}
            ></Button>
          </div>
          <ScrollBar>
            <div
              style={{ maxHeight: '40vh' }}
              role="textbox"
              aria-label="description-viewer"
              onClick={() => {
                setShowPopupEditor(true);
              }}
            >
              <TextViewer initialValue={description}></TextViewer>
            </div>
          </ScrollBar>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            style={{ fontSize: '0.75rem' }}
            type="text"
            size="small"
            icon={<PlusOutlined></PlusOutlined>}
            onClick={() => {
              setShowPopupEditor(true);
            }}
            disabled={readOnly}
          >
            Add Description
          </Button>
        </div>
      )}

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
