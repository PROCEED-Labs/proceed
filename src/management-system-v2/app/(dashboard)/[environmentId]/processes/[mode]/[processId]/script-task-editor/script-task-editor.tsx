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
import { isUserErrorResponse, userError } from '@/lib/user-error';
import { wrapServerCall } from '@/lib/wrap-server-call';
import useProcessVariables from '../use-process-variables';
import ProcessVariableForm from '../variable-definition/process-variable-form';
import { useCanEdit } from '@/lib/can-edit-context';
const BlocklyEditor = dynamic(() => import('./blockly-editor'), { ssr: false });
import MonacoEditor, { MonacoEditorRef } from './monaco-editor';

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

  const modeler = useModelerStateStore((state) => state.modeler);
  const canEdit = useCanEdit();

  const environment = useEnvironment();
  const app = App.useApp();

  const blocklyRef = useRef<BlocklyEditorRefType>(null);
  const monacoEditorRef = useRef<MonacoEditorRef>(null);

  const { variables, addVariable } = useProcessVariables();
  const [showVariableForm, setShowVariableForm] = useState(false);

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
      // If both request failed, it means that we're storing blockly + typescript code ->
      // inconsistent state
      if (unsuccessful === 0) throw new Error('Inconsistency in script storage');
      // If the two requests failed, it means this script task has no code associated to it yet
      if (unsuccessful === 2) return ['', null] as const;

      const scriptType = isUserErrorResponse(jsScript) ? 'blockly' : 'JS';
      const script = scriptType === 'JS' ? (jsScript as string) : (blocklyScript as string);

      return [script, scriptType] as const;
    },
    // Refetch on close to update the script if it was changed
    enabled: !open,
    queryKey: ['processScriptTaskData', environment.spaceId, processId, filename],
  });

  useEffect(() => {
    setHasUnsavedChanges(false);
    setIsScriptValid(true);

    setInitialScript(data?.[0] ?? '');
    setSelectedEditor(data?.[1] ?? null);
  }, [data]);

  const handleSave = async () => {
    if (saving || !modeler || !filename || !selectedElement || !selectedEditor) return;

    modeler.getModeling().updateProperties(selectedElement, {
      fileName: filename,
    });

    setSaving(true);
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
              saveProcessScriptTask(processId, filename, type as any, value, environment.spaceId),
            );
          }
        }

        const results = await Promise.all(promises);

        // just use first error
        return results.find(isUserErrorResponse);
      },
      onSuccess: () => {
        app.message.success('Script saved');
        onClose();
      },
      app,
    });

    setHasUnsavedChanges(false);
    setSaving(false);
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
        onCancel: () => {
          onClose();
          // discard changes
          // no change was saved to the script -> script is opened again -> no props change -> Editors keep changes
          // (if changes where made, the props of the editors would change and the editors would reset)
          if (selectedEditor === 'JS') monacoEditorRef.current?.reset();
          if (selectedEditor === 'blockly') blocklyRef.current?.reset();

          setHasUnsavedChanges(false);
        },
      });
    }
  };

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
    <Modal
      open={open}
      centered
      width="90vw"
      styles={{ body: { height: '85vh', marginTop: '0.5rem' }, header: { margin: 0 } }}
      title={
        <span style={{ fontSize: '1.5rem' }}>
          {`${canEdit ? 'Edit Script Task' : 'Script Task'}: ${filename}`}
        </span>
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
      afterOpenChange={(open) => {
        if (open && selectedEditor === 'blockly') blocklyRef.current?.fillContainer();
      }}
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
                        Open Script Task AP
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
                </Col>
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

              <Col span={20}>
                {selectedEditor === 'JS' ? (
                  <MonacoEditor
                    ref={monacoEditorRef}
                    initialScript={initialScript}
                    onChange={() => setHasUnsavedChanges(true)}
                    disabled={!canEdit}
                  />
                ) : (
                  <BlocklyEditor
                    editorRef={blocklyRef}
                    initialXml={initialScript}
                    onChange={(isScriptValid, code) => {
                      if (code.xml && initialScript !== code.xml) setHasUnsavedChanges(true);

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
