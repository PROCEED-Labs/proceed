'use client';

import React, { FC, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Modal,
  Button,
  Tooltip,
  Space,
  Row,
  Col,
  Input,
  Divider,
  List,
  Tag,
  Popconfirm,
} from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { FaArrowRight } from 'react-icons/fa';
import { CheckCircleOutlined, ExclamationCircleOutlined, FormOutlined } from '@ant-design/icons';

import { MdOutlineTransform } from 'react-icons/md';

import { IoExtensionPuzzleOutline } from 'react-icons/io5';

const { Search } = Input;

import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import languageExtension from './languageExtension.js';
import useModelerStateStore from './use-modeler-state-store';
import {
  getProcessScriptTaskData,
  saveProcessScriptTask,
  deleteProcessScriptTask,
} from '@/lib/data/processes';
import { useEnvironment } from '@/components/auth-can';
import { generateScriptTaskFileName } from '@proceed/bpmn-helper';
import { BlocklyEditorRefType } from './blockly-editor';
const BlocklyEditor = dynamic(() => import('./blockly-editor'), { ssr: false });

type ScriptEditorProps = {
  processId: string;
  open: boolean;
  onClose: () => void;
  selectedElement: any;
};

const ScriptEditor: FC<ScriptEditorProps> = ({ processId, open, onClose, selectedElement }) => {
  const monacoEditorRef = useRef<null | monaco.editor.IStandaloneCodeEditor>(null);
  const monacoRef = useRef<null | Monaco>(null);
  const [initialScript, setInitialScript] = useState('');
  const [isScriptValid, setIsScriptValid] = useState(true);
  const modeler = useModelerStateStore((state) => state.modeler);
  const environment = useEnvironment();
  const [selectedEditor, setSelectedEditor] = useState<null | 'JS' | 'blockly'>(null); // JS or blockly

  const blocklyRef = useRef<BlocklyEditorRefType>(null);

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
    setInitialScript('');
    setSelectedEditor(null);
    if (filename && open) {
      // Check if script is stored in JS or blockly and set script and selected editor accordingly
      getProcessScriptTaskData(processId, filename, 'ts', environment.spaceId).then((res) => {
        if (typeof res === 'string') {
          setInitialScript(res);
          setSelectedEditor('JS');
        }
      });
      getProcessScriptTaskData(processId, filename, 'xml', environment.spaceId).then((res) => {
        if (typeof res === 'string') {
          setInitialScript(res);
          setSelectedEditor('blockly');
        }
      });
    }
  }, [processId, open, filename, environment]);

  const handleEditorMount = (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
    monacoEditorRef.current = editor;
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

  const handleSave = async () => {
    if (modeler && filename && selectedElement) {
      modeler.getModeling().updateProperties(selectedElement, {
        fileName: filename,
      });

      if (selectedEditor === 'JS') {
        await storeJSScript();
      } else if (selectedEditor === 'blockly') {
        await storeBlocklyScript();
      }
    }
  };

  const storeJSScript = async () => {
    if (filename && monacoEditorRef.current && monacoRef.current) {
      const typescriptCode = monacoEditorRef.current.getValue();

      // Transpile TS code to JS
      const typescriptWorker = await monacoRef.current.languages.typescript.getTypeScriptWorker();
      const editorModel = monacoEditorRef.current.getModel();
      if (!editorModel) {
        throw new Error(
          'Could not get model from editor to transpile TypeScript code to JavaScript',
        );
      }
      const client = await typescriptWorker(editorModel.uri);
      const emitOutput = await client.getEmitOutput(editorModel.uri.toString());
      const javascriptCode = emitOutput.outputFiles[0].text;

      await deleteProcessScriptTask(processId, filename, 'xml', environment.spaceId).then(
        (res) => res && console.error(res.error),
      );
      await saveProcessScriptTask(
        processId,
        filename,
        'ts',
        typescriptCode,
        environment.spaceId,
      ).then((res) => res && console.error(res.error));
      await saveProcessScriptTask(
        processId,
        filename,
        'js',
        javascriptCode,
        environment.spaceId,
      ).then((res) => res && console.error(res.error));
    }
  };

  const storeBlocklyScript = async () => {
    if (filename && isScriptValid && blocklyRef.current) {
      const blocklyCode = blocklyRef.current.getCode();

      const scriptTaskStoragePromises = [
        deleteProcessScriptTask(processId, filename, 'ts', environment.spaceId),
        saveProcessScriptTask(processId, filename, 'xml', blocklyCode.xml, environment.spaceId),
        saveProcessScriptTask(processId, filename, 'js', blocklyCode.js, environment.spaceId),
      ];

      return Promise.allSettled(scriptTaskStoragePromises).then((results) => {
        results.forEach((res) => {
          if (res.status === 'fulfilled' && res.value) {
            console.error(res.value.error);
          }

          if (res.status === 'rejected') {
            console.error(res.reason);
          }
        });
      });
    }
  };

  const handleCopyToClipboard = () => {
    if (monacoEditorRef.current) {
      navigator.clipboard.writeText(monacoEditorRef.current.getValue());
    }
  };

  const getEditorPositionRange = () => {
    if (monacoEditorRef.current && monacoRef.current) {
      const position = monacoEditorRef.current.getPosition();
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

  const transformToCode = async () => {
    if (blocklyRef.current) {
      const blocklyCode = blocklyRef.current.getCode();
      setInitialScript(blocklyCode.js);
      setSelectedEditor('JS');
    }
  };

  return (
    <Modal
      open={open}
      centered
      width="90vw"
      styles={{ body: { height: '85vh' }, header: { margin: 0 } }}
      title={<span style={{ fontSize: '1.5rem' }}>Edit Script Task</span>}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>Close</Button>
          <Button disabled={!isScriptValid} type="primary" onClick={handleSave}>
            Save
          </Button>
        </Space>
      }
    >
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {selectedEditor && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'end',
              marginBottom: '0.5rem',
            }}
          >
            {isScriptValid ? (
              <Tag icon={<CheckCircleOutlined></CheckCircleOutlined>} color="success">
                Script is valid
              </Tag>
            ) : (
              <Tag icon={<ExclamationCircleOutlined />} color="warning">
                Script is not valid. The script contains loosely arranged blocks. Connect these to
                continue.
              </Tag>
            )}

            {selectedEditor === 'blockly' && (
              <Popconfirm
                placement="bottomLeft"
                title="Are you sure you want to switch to JS Editor?"
                description="Your blocks will be transformed to JS Code. This can not be reverted!"
                onConfirm={() => transformToCode()}
              >
                <Button
                  icon={
                    <MdOutlineTransform
                      style={{ transform: 'translateY(2px)' }}
                    ></MdOutlineTransform>
                  }
                  disabled={!isScriptValid}
                  size="small"
                  danger
                >
                  Switch to JS Editor
                </Button>
              </Popconfirm>
            )}
          </div>
        )}
        <div style={{ flexGrow: 1 }}>
          {selectedEditor === 'JS' ? (
            <Row style={{ paddingBlock: '0.5rem', border: '1px solid lightgrey', height: '100%' }}>
              <Col span={4}>
                <Space style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                  <Tooltip title="Open Script Task API for further reference">
                    <Button> Open Script Task API </Button>
                  </Tooltip>
                  <Tooltip title="Copy to Clipboard">
                    <Button icon={<CopyOutlined />} onClick={handleCopyToClipboard} />
                  </Tooltip>
                </Space>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
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
                              if (editorPositionRange && monacoEditorRef.current) {
                                monacoEditorRef.current.executeEdits('', [
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
                              if (editorPositionRange && monacoEditorRef.current) {
                                monacoEditorRef.current.executeEdits('', [
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
              <Col span={20}>
                <Editor
                  defaultLanguage="typescript"
                  value={initialScript}
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
          ) : selectedEditor === 'blockly' ? (
            <BlocklyEditor
              editorRef={blocklyRef}
              initialXml={initialScript}
              onChange={(isScriptValid: boolean | ((prevState: boolean) => boolean), code: any) => {
                setIsScriptValid(isScriptValid);
              }}
            ></BlocklyEditor>
          ) : (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
              }}
            >
              <Space
                style={{
                  backgroundColor: '#e0e0e0',
                  padding: '3rem',
                  borderRadius: '10px',
                  border: '1px dashed grey',
                }}
              >
                <Button icon={<FormOutlined size={15} />} onClick={() => setSelectedEditor('JS')}>
                  JS Editor
                </Button>
                <Button
                  icon={
                    <IoExtensionPuzzleOutline style={{ transform: 'translateY(2px)' }} size={15} />
                  }
                  onClick={() => setSelectedEditor('blockly')}
                >
                  Blockly Editor
                </Button>
              </Space>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ScriptEditor;
