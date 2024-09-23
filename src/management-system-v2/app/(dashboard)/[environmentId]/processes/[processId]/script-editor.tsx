'use client';

import React, { FC, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Button, Tooltip, Space, Row, Col, Input, Divider, List } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { FaArrowRight } from 'react-icons/fa';

const { Search } = Input;

import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import languageExtension from './languageExtension.js';
import useModelerStateStore from './use-modeler-state-store';
import { getProcessScriptTaskData, saveProcessScriptTask } from '@/lib/data/processes';
import { useEnvironment } from '@/components/auth-can';
import { generateScriptTaskFileName } from '@proceed/bpmn-helper';

type ScriptEditorProps = {
  processId: string;
  open: boolean;
  onClose: () => void;
  selectedElement: any;
};

const ScriptEditor: FC<ScriptEditorProps> = ({ processId, open, onClose, selectedElement }) => {
  const editorRef = useRef<null | monaco.editor.IStandaloneCodeEditor>(null);
  const monacoRef = useRef<null | Monaco>(null);
  const [script, setScript] = useState('');
  const modeler = useModelerStateStore((state) => state.modeler);
  const environment = useEnvironment();

  const filename = useMemo(() => {
    if (modeler && selectedElement && selectedElement.type === 'bpmn:ScriptTask') {
      return (
        (selectedElement.businessObject.fileName as string | undefined) ||
        generateScriptTaskFileName()
      );
    }

    return undefined;
  }, [modeler, selectedElement]);

  useEffect(() => {
    if (filename && open) {
      getProcessScriptTaskData(processId, filename, environment.spaceId).then((res) => {
        if (typeof res === 'string') {
          setScript(res);
        }
      });
    }
  }, [processId, open, filename, environment]);

  const handleEditorMount = (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const defaultOptions =
      monacoRef.current.languages.typescript.javascriptDefaults.getCompilerOptions();

    monacoRef.current.languages.typescript.javascriptDefaults.setCompilerOptions({
      ...defaultOptions,
      target: monacoRef.current.languages.typescript.ScriptTarget.ES2017,
      lib: ['es2017'],
    });

    monacoRef.current.languages.typescript.javascriptDefaults.addExtraLib(languageExtension);
    monacoRef.current.editor.createModel(languageExtension, 'typescript');
  };

  const handleSave = () => {
    if (modeler && editorRef.current) {
      const scriptText = editorRef.current.getValue();
      if (selectedElement && filename) {
        modeler.getModeling().updateProperties(selectedElement, {
          fileName: filename,
        });

        saveProcessScriptTask(processId, filename, scriptText, environment.spaceId).then(
          (res) => res && console.error(res.error),
        );
      }
    }
  };

  const handleCopyToClipboard = () => {
    if (editorRef.current) {
      navigator.clipboard.writeText(editorRef.current.getValue());
    }
  };

  const getEditorPositionRange = () => {
    if (editorRef.current && monacoRef.current) {
      const position = editorRef.current.getPosition();
      if (position) {
        return new monacoRef.current.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column,
        );
      }
    }
    return null;
  };

  return (
    <Modal
      open={open}
      centered
      width="90vw"
      styles={{ body: { height: '85vh' }, header: { margin: 0 } }}
      title={<span style={{ fontSize: '1.5rem' }}>Edit Script Task</span>}
      okText="Save"
      cancelText="Close"
      onCancel={onClose}
      onOk={handleSave}
    >
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Row style={{ paddingBlock: '0.5rem' }}>
          <Col span={4}></Col>
          <Col span={20}>
            <Space style={{ width: '100%', justifyContent: 'end' }}>
              <Tooltip title="Open Script Task API for further reference">
                <Button> Open Script Task API </Button>
              </Tooltip>
              <Tooltip title="Copy to Clipboard">
                <Button icon={<CopyOutlined />} onClick={handleCopyToClipboard} />
              </Tooltip>
            </Space>
          </Col>
        </Row>
        <Row style={{ flexGrow: 1 }}>
          <Col span={4}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingRight: '1.5rem',
              }}
            >
              <Divider style={{ margin: '0px' }}>Variables</Divider>
              <List
                size="small"
                header={<Search size="middle" placeholder="Search for variables"></Search>}
                dataSource={['VariableA', 'VariableB', 'VariableC']}
                renderItem={(item) => (
                  <List.Item style={{ padding: '0.75rem 0' }}>
                    <span>{item}</span>
                    <Space.Compact size="small">
                      <Button
                        icon={<FaArrowRight style={{ fontSize: '0.75rem' }} />}
                        onClick={() => {
                          const editorPositionRange = getEditorPositionRange();
                          if (editorPositionRange && editorRef.current) {
                            editorRef.current.executeEdits('', [
                              {
                                range: editorPositionRange,
                                text: `variable.set('${item}', '');\n`,
                              },
                            ]);
                          }
                        }}
                      >
                        SET
                      </Button>
                      <Button
                        icon={<FaArrowRight style={{ fontSize: '0.75rem' }} />}
                        onClick={() => {
                          const editorPositionRange = getEditorPositionRange();
                          if (editorPositionRange && editorRef.current) {
                            editorRef.current.executeEdits('', [
                              {
                                range: editorPositionRange,
                                text: `variable.get('${item}');\n`,
                              },
                            ]);
                          }
                        }}
                      >
                        GET
                      </Button>
                    </Space.Compact>
                  </List.Item>
                )}
              ></List>
            </div>
          </Col>
          <Col span={20} style={{ paddingTop: '0.5rem', border: '2px solid lightgrey' }}>
            <Editor
              defaultLanguage="typescript"
              value={script}
              options={{
                wordWrap: 'on',
                wrappingStrategy: 'advanced',
                wrappingIndent: 'same',
              }}
              onMount={handleEditorMount}
              className="Hide-Scroll-Bar"
            />
          </Col>
        </Row>
      </div>
    </Modal>
  );
};

export default ScriptEditor;
