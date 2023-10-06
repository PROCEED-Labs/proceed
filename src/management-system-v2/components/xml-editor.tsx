'use client';

import React, { FC, useRef } from 'react';

import { Modal } from 'antd';
import { Typography } from 'antd';
const { Title } = Typography;

import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

type XmlEditorProps = {
  bpmn?: string;
  canSave: boolean;
  onClose: () => void;
  onSaveXml: (bpmn: string) => void;
};

const XmlEditor: FC<XmlEditorProps> = ({ bpmn, canSave, onClose, onSaveXml }) => {
  const editorRef = useRef<null | monaco.editor.IStandaloneCodeEditor>(null);

  const handleEditorMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  };

  const handleSave = async () => {
    if (editorRef.current) {
      const newBpmn = editorRef.current.getValue();
      onSaveXml(newBpmn);
    }
  };

  return (
    <Modal
      open={!!bpmn}
      onOk={handleSave}
      onCancel={onClose}
      centered
      width="85vw"
      cancelText="Close"
      okText="Save"
      title={<Title level={3}>BPMN XML</Title>}
      okButtonProps={{ disabled: !canSave }}
      closeIcon={false}
    >
      <Editor
        defaultLanguage="xml"
        value={bpmn}
        options={{
          wordWrap: 'on',
          wrappingStrategy: 'advanced',
          wrappingIndent: 'same',
        }}
        onMount={handleEditorMount}
        height="85vh"
      />
    </Modal>
  );
};

export default XmlEditor;
