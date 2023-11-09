'use client';

import React, { FC, useRef, useState } from 'react';

import { Modal, Alert, Button, Space, Tooltip, Flex } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
const { Title } = Typography;

import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

import { moddle } from '@proceed/bpmn-helper';

type XmlEditorProps = {
  bpmn?: string;
  canSave: boolean;
  onClose: () => void;
  onSaveXml: (bpmn: string) => void;
};

async function checkBpmn(bpmn: string) {
  const domParser = new DOMParser();
  var dom = domParser.parseFromString(bpmn, 'text/xml');
  const parserErrors = dom.getElementsByTagName('parsererror');
  if (parserErrors.length) {
    const match = parserErrors[0].textContent!.match(
      /This page contains the following errors:error on line (\d+) at column (\d+): (.+)\nBelow is a rendering of the page up to the first error./,
    );

    if (match) {
      let [_, lineString, columnString, message] = match;
      const line = parseInt(lineString);
      const column = parseInt(columnString);
      return {
        error: {
          startLineNumber: line,
          endLineNumber: line,
          startColumn: column,
          endColumn: column + 1,
          message,
        },
      };
    }
  }

  const { warnings } = await moddle.fromXML(bpmn);
  // TODO: how do we want to show which warnings exist to the user?
  return { warnings };
}

// found here: https://www.freecodecamp.org/news/javascript-debounce-example/
// TODO: should we use a library or create our own with functions like this that will be used frequently
function debounce(func: Function) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), 300);
  };
}

const XmlEditor: FC<XmlEditorProps> = ({ bpmn, canSave, onClose, onSaveXml }) => {
  const editorRef = useRef<null | monaco.editor.IStandaloneCodeEditor>(null);
  const monacoRef = useRef<null | Monaco>(null);
  const [saveInfoState, setSaveInfoState] = useState<'error' | 'warning' | 'none'>('none');
  const [hasError, setHasError] = useState(false);

  const handleEditorMount = (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  const handleSave = async () => {
    if (editorRef.current) {
      const newBpmn = editorRef.current.getValue();

      onSaveXml(newBpmn);
    }
    setSaveInfoState('none');
  };

  async function validateProcess() {
    if (editorRef.current && monacoRef.current) {
      monacoRef.current.editor.setModelMarkers(editorRef.current.getModel()!, 'owner', []);
      setHasError(false);
      const bpmn = editorRef.current.getValue();

      const { error } = await checkBpmn(bpmn);

      if (error) {
        setHasError(true);
        monacoRef.current.editor.setModelMarkers(editorRef.current.getModel()!, 'owner', [
          { ...error, severity: monacoRef.current.MarkerSeverity.Error },
        ]);

        return false;
      }
    }

    return true;
  }

  // run the validation when something changes and add code highlighting (with debounce)
  const handleChange = debounce(() => validateProcess());

  const handleValidationAndSave = async () => {
    if (editorRef.current && monacoRef.current) {
      const newBpmn = editorRef.current.getValue();

      const { error, warnings } = await checkBpmn(newBpmn);

      if (error || (warnings && warnings.length)) {
        setSaveInfoState(error ? 'error' : 'warning');
      } else {
        handleSave();
      }
    }
  };

  let alertText = '';

  if (saveInfoState === 'error') {
    alertText = 'Cannot save the bpmn due to syntax errors.';
  } else if (saveInfoState === 'warning') {
    alertText = 'Found non-breaking issues within the bpmn. Save anyway?';
  }

  return (
    <Modal
      open={!!bpmn}
      onOk={handleValidationAndSave}
      onCancel={onClose}
      centered
      width="85vw"
      title={
        <Flex justify="space-between">
          <Title level={3}>BPMN XML</Title>
          <Button
            icon={<SearchOutlined />}
            onClick={() => {
              if (editorRef.current) editorRef.current.getAction('actions.find')?.run();
            }}
          />
        </Flex>
      }
      closeIcon={false}
      footer={[
        <Button key="close-button" onClick={onClose}>
          Close
        </Button>,
        !canSave || hasError ? (
          <Tooltip
            key="save-button-tooltip"
            placement="top"
            title={
              !canSave
                ? 'Already versioned bpmn cannot be changed!'
                : 'Fix the syntax errors in the bpmn before saving!'
            }
          >
            <Button key="disabled-save-button" type="primary" disabled>
              Save
            </Button>
          </Tooltip>
        ) : (
          <Button key="save-button" type="primary" onClick={handleValidationAndSave}>
            Save
          </Button>
        ),
      ]}
    >
      <Editor
        defaultLanguage="xml"
        value={bpmn}
        options={{
          wordWrap: 'on',
          wrappingStrategy: 'advanced',
          wrappingIndent: 'same',
          readOnly: !canSave,
        }}
        onMount={handleEditorMount}
        onChange={handleChange}
        height="85vh"
      />
      {saveInfoState !== 'none' && (
        <Modal
          open={true}
          footer={null}
          centered
          closeIcon={false}
          onCancel={() => setSaveInfoState('none')}
          maskClosable
          style={{ pointerEvents: 'auto' }}
          modalRender={() => (
            <Alert
              showIcon
              message={alertText}
              type={saveInfoState}
              action={
                saveInfoState === 'warning' && (
                  <Space direction="vertical">
                    <Button size="small" danger ghost block onClick={handleSave}>
                      Save
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => setSaveInfoState('none')}
                      block
                    >
                      Cancel
                    </Button>
                  </Space>
                )
              }
            />
          )}
        />
      )}
    </Modal>
  );
};

export default XmlEditor;
