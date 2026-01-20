'use client';

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from 'react';
import dynamic from 'next/dynamic';
import {
  Button,
  Tooltip,
  Space,
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

import useModelerStateStore from '../use-modeler-state-store';
import {
  getProcessScriptTaskData,
  saveProcessScriptTask,
  deleteProcessScriptTask,
} from '@/lib/data/processes';
import { useEnvironment } from '@/components/auth-can';
import { generateScriptTaskFileName } from '@proceed/bpmn-helper';
import { type BlocklyEditorRefType } from './blockly-editor';
import { useQuery } from '@tanstack/react-query';
import { getErrorMessage, isUserErrorResponse, userError } from '@/lib/user-error';
import { wrapServerCall } from '@/lib/wrap-server-call';
import useProcessVariables from '../use-process-variables';
import ProcessVariableForm from '../variable-definition/process-variable-form';
import { useCanEdit } from '@/lib/can-edit-context';
const BlocklyEditor = dynamic(() => import('./blockly-editor'), { ssr: false });
import MonacoEditor, { MonacoEditorRef } from './monaco-editor';

export type ScriptEditorRef = {
  save: () => Promise<string | undefined>;
  reset: () => void;
  fillContainer: () => void;
};

type ScriptEditorProps = {
  processId: string;
  filename: undefined | string;
  /** If this is not passed the editor will be in read only mode */
  scriptTaskBpmnElement?: any;
  onChange?: (hasUnsavedChanges: boolean) => void;
};

const ScriptEditor = forwardRef<ScriptEditorRef, ScriptEditorProps>(
  ({ processId, filename: _filename, scriptTaskBpmnElement, onChange: _onChange }, ref) => {
    const [initialScript, setInitialScript] = useState('');
    const [isScriptValid, setIsScriptValid] = useState(true);
    const [selectedEditor, setSelectedEditor] = useState<null | 'JS' | 'blockly'>(null); // JS or blockly

    const scriptEditorContainerRef = useRef<HTMLDivElement>(null);

    const modeler = useModelerStateStore((state) => state.modeler);
    const _canEdit = useCanEdit();
    const isExecutable = useModelerStateStore((state) => state.isExecutable);
    const canEdit = !!scriptTaskBpmnElement && _canEdit && isExecutable;

    const environment = useEnvironment();
    const app = App.useApp();

    const blocklyRef = useRef<BlocklyEditorRefType>(null);
    const monacoEditorRef = useRef<MonacoEditorRef>(null);

    const { variables, addVariable } = useProcessVariables();
    const [showVariableForm, setShowVariableForm] = useState(false);

    const filename = useMemo(() => {
      if (modeler) {
        return _filename || generateScriptTaskFileName();
      }

      return undefined;
    }, [modeler, _filename]);

    const { data, isLoading, isError, refetch } = useQuery({
      queryFn: async () => {
        if (!filename) return ['', null] as const;

        // Check if script is stored in JS or blockly and set script and selected editor accordingly
        const [jsScript, blocklyScript] = await Promise.all([
          getProcessScriptTaskData(processId, filename, 'ts', environment.spaceId),
          getProcessScriptTaskData(processId, filename, 'xml', environment.spaceId),
        ]);

        const unsuccessful = +isUserErrorResponse(jsScript) + +isUserErrorResponse(blocklyScript);
        // If both request failed, it means that we're storing blockly + typescript code ->
        // inconsistent state
        if (unsuccessful === 0) throw new Error('Inconsistency in script storage');
        // If the two requests failed, it means this script task has no code associated to it yet
        if (unsuccessful === 2) return ['', null] as const;

        const scriptType = isUserErrorResponse(jsScript) ? 'blockly' : 'JS';
        const script = scriptType === 'JS' ? (jsScript as string) : (blocklyScript as string);

        return [script, scriptType] as const;
      },
      queryKey: ['processScriptTaskData', environment.spaceId, processId, filename],
    });

    const onChangeRef = useRef<(value: boolean) => void>();
    onChangeRef.current = _onChange;

    useEffect(() => {
      onChangeRef.current?.(false);
      setIsScriptValid(true);

      setInitialScript(data?.[0] ?? '');
      setSelectedEditor(data?.[1] ?? null);
    }, [data]);

    useImperativeHandle(
      ref,
      () => {
        const handleSave = async () => {
          if (!modeler || !filename || !selectedEditor) return;

          modeler.getModeling().updateProperties(scriptTaskBpmnElement, {
            fileName: filename,
          });

          if (selectedEditor === 'JS') {
            await monacoEditorRef.current?.format();
          }

          let errorMessage;

          await wrapServerCall({
            fn: async () => {
              const code = await (selectedEditor === 'JS'
                ? monacoEditorRef.current?.getCode()
                : blocklyRef.current?.getCode());
              if (!code) return userError('Invalid script, please try again');

              const promises = [];
              for (const [type, value] of Object.entries(code)) {
                if (value === false) {
                  promises.push(
                    deleteProcessScriptTask(processId, filename, type as any, environment.spaceId),
                  );
                } else {
                  promises.push(
                    saveProcessScriptTask(
                      processId,
                      filename,
                      type as any,
                      value,
                      environment.spaceId,
                    ),
                  );
                }
              }

              const results = await Promise.all(promises);

              // just use first error
              return results.find(isUserErrorResponse);
            },
            onSuccess: false,
            onError: (err) => {
              errorMessage = getErrorMessage(err);
            },
            app,
          });

          onChangeRef.current?.(false);

          return errorMessage;
        };

        return {
          save: handleSave,
          reset: () => {
            if (selectedEditor === 'JS') monacoEditorRef.current?.reset();
            if (selectedEditor === 'blockly') blocklyRef.current?.reset();
          },
          fillContainer: () => {
            if (selectedEditor === 'blockly') {
              blocklyRef.current?.fillContainer();
            }
          },
        };
      },
      [
        environment.spaceId,
        modeler,
        filename,
        processId,
        app,
        selectedEditor,
        scriptTaskBpmnElement,
      ],
    );

    const transformToCode = async () => {
      if (selectedEditor !== 'blockly' || !blocklyRef.current) return;

      const blocklyCode = blocklyRef.current.getCode();
      if (!blocklyCode) {
        app.message.error('Something went wrong!');
      } else {
        setInitialScript(blocklyCode.js);
        setSelectedEditor('JS');
      }
    };

    return (
      <div ref={scriptEditorContainerRef} style={{ height: '100%', width: '100%' }}>
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
        {!isError && !isLoading && !selectedEditor && (
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
                icon={
                  <IoExtensionPuzzleOutline style={{ transform: 'translateY(2px)' }} size={15} />
                }
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
                    Script syntax is valid
                  </Tag>
                ) : (
                  <Tag
                    icon={<ExclamationCircleOutlined />}
                    style={{ marginRight: 0 }}
                    color="warning"
                  >
                    Script is not valid. The script contains loosely arranged blocks. Connect these
                    to continue.
                  </Tag>
                )}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                paddingBlock: '0.5rem',
                border: '1px solid lightgrey',
                height: '100%',
                flexDirection: 'row-reverse',
                flexGrow: 1,
              }}
            >
              {canEdit && selectedEditor && (
                <div style={{ justifySelf: 'end', width: '16%' }}>
                  <Space
                    style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}
                  >
                    <Tooltip title="Open Script Task Documentation and API">
                      <Button
                        href="https://docs.proceed-labs.org/developer/script-task-api"
                        target="_blank"
                        rel="noopener"
                      >
                        Open Documentation
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
                        dataSource={variables}
                        renderItem={(item) => (
                          <List.Item style={{ padding: '0.75rem 0' }}>
                            <span>{item.name}</span>
                            <Space.Compact size="small">
                              <Button
                                icon={<FaArrowRight style={{ fontSize: '0.75rem' }} />}
                                onClick={() =>
                                  monacoEditorRef.current?.insertTextOnCursor(
                                    `variable.set('${item.name}', );\n`,
                                  )
                                }
                                disabled={!canEdit}
                              >
                                SET
                              </Button>
                              <Button
                                icon={<FaArrowRight style={{ fontSize: '0.75rem' }} />}
                                onClick={() =>
                                  monacoEditorRef.current?.insertTextOnCursor(
                                    `variable.get('${item.name}')\n`,
                                  )
                                }
                                disabled={!canEdit}
                              >
                                GET
                              </Button>
                            </Space.Compact>
                          </List.Item>
                        )}
                      />
                      <Button onClick={() => setShowVariableForm(true)}>Add Variable</Button>
                    </div>
                  )}
                </div>
              )}

              <ProcessVariableForm
                open={showVariableForm}
                variables={variables}
                onSubmit={(newVar) => {
                  addVariable(newVar);
                  setShowVariableForm(false);
                }}
                onCancel={() => setShowVariableForm(false)}
              />

              <div style={{ height: '100%', flexGrow: 1 }}>
                {selectedEditor === 'JS' ? (
                  <MonacoEditor
                    ref={monacoEditorRef}
                    initialScript={initialScript}
                    onChange={() => onChangeRef.current?.(true)}
                    disabled={!canEdit}
                  />
                ) : (
                  <BlocklyEditor
                    editorRef={blocklyRef}
                    initialXml={initialScript}
                    onChange={(isScriptValid, code) => {
                      if (code.xml && initialScript !== code.xml) {
                        onChangeRef.current?.(true);
                      }

                      setIsScriptValid(isScriptValid);
                    }}
                    readOnly={!canEdit}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

ScriptEditor.displayName = 'ScriptEditor';

export default ScriptEditor;
