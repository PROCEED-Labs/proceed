'use client';

import { FC, useEffect, useMemo, useRef, useState } from 'react';
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
  App,
  Spin,
  Result,
} from 'antd';
import { FaArrowRight } from 'react-icons/fa';
import { CheckCircleOutlined, ExclamationCircleOutlined, FormOutlined } from '@ant-design/icons';
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
import { type BlocklyEditorRefType } from './blockly-editor';
import { useCanEdit } from './modeler';
import { useQuery } from '@tanstack/react-query';
import { isUserErrorResponse, userError } from '@/lib/user-error';
import { wrapServerCall } from '@/lib/wrap-server-call';
const BlocklyEditor = dynamic(() => import('./blockly-editor'), { ssr: false });

type ScriptEditorProps = {
  processId: string;
  open: boolean;
  onClose: () => void;
  selectedElement: any;
};

const ScriptEditor: FC<ScriptEditorProps> = ({ processId, open, onClose, selectedElement }) => {
  const [initialScript, setInitialScript] = useState('');
  const [isScriptValid, setIsScriptValid] = useState(true);
  const [selectedEditor, setSelectedEditor] = useState<null | 'JS' | 'blockly'>(null); // JS or blockly
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const monacoEditorRef = useRef<null | monaco.editor.IStandaloneCodeEditor>(null);
  const monacoRef = useRef<null | Monaco>(null);

  const modeler = useModelerStateStore((state) => state.modeler);
  const canEdit = useCanEdit();

  const environment = useEnvironment();
  const app = App.useApp();

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

  const { data, isLoading, isError, refetch } = useQuery({
    queryFn: async () => {
      if (!filename) return ['', null] as const;

      // Check if script is stored in JS or blockly and set script and selected editor accordingly
      const [jsScript, blocklyScript] = await Promise.all([
        getProcessScriptTaskData(processId, filename, 'ts', environment.spaceId),
        getProcessScriptTaskData(processId, filename, 'xml', environment.spaceId),
      ]);

      const unsuccessful = +isUserErrorResponse(jsScript) + +isUserErrorResponse(blocklyScript);
      if (unsuccessful === 0) throw new Error('Inconsistency in script storage');
      if (unsuccessful === 2) return ['', null] as const;

      const scriptType = isUserErrorResponse(jsScript) ? 'blockly' : 'JS';
      const script = scriptType === 'JS' ? (jsScript as string) : (blocklyScript as string);

      return [script, scriptType] as const;
    },
    queryKey: ['processScriptTaskData', environment.spaceId, processId, filename],
  });

  useEffect(() => {
    setHasUnsavedChanges(false);
    setInitialScript('');
    setSelectedEditor(null);
    setIsScriptValid(true);
    setInitialScript(data?.[0] ?? '');
    setSelectedEditor(data?.[1] ?? null);
  }, [data]);

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
    if (saving || !modeler || !filename || !selectedElement || !selectedEditor) return;

    modeler.getModeling().updateProperties(selectedElement, {
      fileName: filename,
    });

    setSaving(true);
    await wrapServerCall({
      fn: async () => {
        const responses = await (selectedEditor === 'JS' ? storeJSScript() : storeBlocklyScript());
        if (!responses) return userError('Invalid script, please try again');

        // just use first error
        return responses.find(isUserErrorResponse);
      },
      onSuccess: 'Script saved',
      app,
    });

    setHasUnsavedChanges(false);
    setSaving(false);
  };

  const storeJSScript = async () => {
    if (!filename || !monacoEditorRef.current || !monacoRef.current) return;
    const typescriptCode = monacoEditorRef.current.getValue();

    // Transpile TS code to JS
    const typescriptWorker = await monacoRef.current.languages.typescript.getTypeScriptWorker();
    const editorModel = monacoEditorRef.current.getModel();
    if (!editorModel) {
      throw new Error('Could not get model from editor to transpile TypeScript code to JavaScript');
    }
    const client = await typescriptWorker(editorModel.uri);
    const emitOutput = await client.getEmitOutput(editorModel.uri.toString());
    const javascriptCode = emitOutput.outputFiles[0].text;

    return await Promise.all([
      deleteProcessScriptTask(processId, filename, 'xml', environment.spaceId),
      saveProcessScriptTask(processId, filename, 'ts', typescriptCode, environment.spaceId),
      saveProcessScriptTask(processId, filename, 'js', javascriptCode, environment.spaceId),
    ]);
  };

  const storeBlocklyScript = async () => {
    if (!filename || !isScriptValid || !blocklyRef.current) return;

    const blocklyCode = blocklyRef.current.getCode();

    return await Promise.all([
      deleteProcessScriptTask(processId, filename, 'ts', environment.spaceId),
      saveProcessScriptTask(processId, filename, 'xml', blocklyCode.xml, environment.spaceId),
      saveProcessScriptTask(processId, filename, 'js', blocklyCode.js, environment.spaceId),
    ]);
  };

  const handleClose = () => {
    if (!canEdit || !hasUnsavedChanges) {
      onClose();
    } else {
      app.modal.confirm({
        title: 'You have unsaved changes!',
        content: 'Are you sure you want to close without saving?',
        onOk: () => handleSave().then(onClose),
        okText: 'Save',
        cancelText: 'Discard',
        onCancel: onClose,
      });
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
      styles={{ body: { height: '85vh', marginTop: '0.5rem' }, header: { margin: 0 } }}
      title={
        <span style={{ fontSize: '1.5rem' }}>{canEdit ? 'Edit Script Task' : 'Script Task'}</span>
      }
      onCancel={handleClose}
      footer={
        <Space>
          <Button onClick={handleClose}>Close</Button>
          {canEdit && (
            <Button disabled={!isScriptValid} loading={saving} type="primary" onClick={handleSave}>
              Save
            </Button>
          )}
        </Space>
      }
    >
      {/* Error display */}
      {isError && (
        <Result
          status="error"
          title="Something went wrong"
          subTitle="Something went wrong while fetching the script data. Please try again."
          extra={
            <Button type="primary" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      )}

      {/* Loading Screen */}
      {!isError && isLoading && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
          }}
        >
          <Spin size="large" spinning />
        </div>
      )}

      {/* Initial editor selection */}
      {!isLoading && !selectedEditor && (
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
            <Button
              icon={<IoExtensionPuzzleOutline style={{ transform: 'translateY(2px)' }} size={15} />}
              onClick={() => setSelectedEditor('blockly')}
            >
              No-Code Block Editor
            </Button>
            <Button icon={<FormOutlined size={15} />} onClick={() => setSelectedEditor('JS')}>
              JavaScript Editor
            </Button>
          </Space>
        </div>
      )}

      {/* Editor */}
      {!isLoading && !isError && selectedEditor && (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {canEdit && selectedEditor && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.25rem',
              }}
            >
              {selectedEditor === 'blockly' && (
                <Popconfirm
                  placement="bottomLeft"
                  title="Are you sure you want to switch to JS Editor?"
                  description="Your blocks will be transformed to JS Code. This can not be reverted!"
                  onConfirm={() => transformToCode()}
                >
                  <Button disabled={!isScriptValid} size="small" danger>
                    Switch to JavaScript Editor
                  </Button>
                </Popconfirm>
              )}
              {isScriptValid ? (
                <Tag
                  icon={<CheckCircleOutlined></CheckCircleOutlined>}
                  style={{ marginRight: 0 }}
                  color="success"
                >
                  Script is valid
                </Tag>
              ) : (
                <Tag
                  icon={<ExclamationCircleOutlined />}
                  style={{ marginRight: 0 }}
                  color="warning"
                >
                  Script is not valid. The script contains loosely arranged blocks. Connect these to
                  continue.
                </Tag>
              )}
            </div>
          )}
          <div style={{ flexGrow: 1 }}>
            <Row
              style={{
                paddingBlock: '0.5rem',
                border: '1px solid lightgrey',
                height: '100%',
                flexDirection: selectedEditor === 'blockly' ? 'row-reverse' : 'row',
              }}
            >
              {selectedEditor && (
                <Col span={4} style={{ justifySelf: 'end' }}>
                  <Space
                    style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}
                  >
                    <Tooltip title="Open Script Task API for further reference">
                      <Button
                        href="https://docs.proceed-labs.org/developer/bpmn/bpmn-script-task#api"
                        target="_blank"
                        rel="noopener"
                      >
                        Open Script Task API
                      </Button>
                    </Tooltip>
                  </Space>
                  {selectedEditor === 'JS' && (
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
                                disabled={!canEdit}
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
                                disabled={!canEdit}
                              >
                                GET
                              </Button>
                            </Space.Compact>
                          </List.Item>
                        )}
                      ></List>
                    </div>
                  )}
                </Col>
              )}

              <Col span={20}>
                {selectedEditor === 'JS' ? (
                  <Editor
                    defaultLanguage="typescript"
                    value={initialScript}
                    options={{
                      wordWrap: 'on',
                      wrappingStrategy: 'advanced',
                      wrappingIndent: 'same',
                      readOnly: !canEdit,
                    }}
                    onMount={handleEditorMount}
                    className="Hide-Scroll-Bar"
                  />
                ) : (
                  <BlocklyEditor
                    editorRef={blocklyRef}
                    initialXml={initialScript}
                    onChange={(
                      isScriptValid: boolean | ((prevState: boolean) => boolean),
                      code: any,
                    ) => {
                      if (
                        (code.xml && initialScript !== code.xml) ||
                        (code.ts && initialScript !== code.ts)
                      ) {
                        setHasUnsavedChanges(true);
                      }
                      setIsScriptValid(isScriptValid);
                    }}
                    blocklyOptions={{
                      readOnly: !canEdit,
                    }}
                  />
                )}
              </Col>
            </Row>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ScriptEditor;
