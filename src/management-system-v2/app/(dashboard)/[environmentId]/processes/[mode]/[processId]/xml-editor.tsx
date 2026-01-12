'use client';

import React, { FC, useEffect, useRef, useState } from 'react';

import { Modal, Button, Tooltip, Flex, Popconfirm, Space, Alert } from 'antd';
import {
  SearchOutlined,
  CopyOutlined,
  ExclamationCircleOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { Typography } from 'antd';
const { Title } = Typography;

import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

import { getDefinitionsId, getDefinitionsName, moddle } from '@proceed/bpmn-helper';

import { debounce } from '@/lib/utils';
import { MdOutlineEditOff, MdOutlineModeEdit, MdRedo, MdUndo } from 'react-icons/md';
import { hashString } from '@/lib/helpers/javascriptHelpers';

type XmlEditorProps = {
  bpmn?: string;
  canSave: boolean;
  onClose: () => void;
  onSaveXml: (bpmn: string) => Promise<void>;
  process: { name: string; id: string };
  versionName?: string;
};

type EditorError = {
  startLineNumber?: number;
  endLineNumber?: number;
  startColumn?: number;
  endColumn?: number;
  message: string;
};

type SaveStateType = {
  state: 'error' | 'warning' | 'none';
  errorMessages: string[];
  errorLocations: string[];
  warnings?: any[];
};

/**
 * Checks for syntax errors in the bpmn as well as for moddle warnings
 *
 * @param bpmn
 * @returns found syntax errors or warnings
 */
async function checkBpmn(bpmn: string) {
  // check the bpmn (xml) for syntax errors using the domparser
  try {
    const domParser = new DOMParser();
    var dom = domParser.parseFromString(bpmn, 'text/xml');
    const parserErrors = dom.getElementsByTagName('parsererror');
    if (parserErrors.length) {
      const match = parserErrors[0].textContent!.match(
        /This page contains the following errors:error on line (\d+) at column (\d+): (.+)\nBelow is a rendering of the page up to the first error./,
      );

      if (match) {
        // convert the positional information into a format that can be passed to the monaco editor
        let [_, lineString, columnString, message] = match;
        const line = parseInt(lineString);
        const column = parseInt(columnString);
        return {
          error: {
            startLineNumber: line,
            endLineNumber: line,
            startColumn: column,
            endColumn: column + message.length,
            message,
          },
        };
      }
    }

    // check for bpmn related mistakes (nonconformity with the underlying model [e.g. unknown elements or attributes])
    const { warnings } = await moddle.fromXML(bpmn);
    return { warnings };
  } catch (error: any) {
    // only firefox throws this error
    if (error.message.includes('unparsable content')) {
      return {
        error: {
          message: error.message,
        },
      };
    }
    return {
      error: {
        message: 'Unexpected error occured:' + error.message,
      },
    };
  }
}

const checkDefinitionIdChange = async (bpmn: string, expectedId: string) => {
  try {
    const currentId = await getDefinitionsId(bpmn);
    if (currentId && currentId !== expectedId) {
      return {
        error: {
          message: 'Modification of definitionId is not allowed!',
        },
      };
    }
    return { error: null };
  } catch (error: any) {
    // handle unparsable content error thrown by getDefinitionsId if xml is malformed (eg. missing closing tag)
    // errors like missing closing tags is already accounted by checkBpmn function (see above)
    if (error.message.includes('unparsable content')) {
      return { error: null };
    }
    return { error: { message: 'Unexpected error occured: ' + error.message } };
  }
};

const checkProcessNameDefinitionAttribute = async (bpmn: string) => {
  try {
    const definitionsMatch = bpmn.match(/<definitions\s([^>]*)>/i);
    if (!definitionsMatch) {
      return {
        error: {
          message: 'BPMN must contain a definitions tag',
        },
      };
    }

    const nameMatch = await getDefinitionsName(bpmn);
    if (!nameMatch) {
      return {
        error: {
          message: 'Process name attribute is missing in definitions tag',
        },
      };
    }

    return { error: null };
  } catch (error: any) {
    // handle unparsable content error thrown by getDefinitionsName if xml is malformed(eg. missing closing tag).
    // errors like missing closing tags is already accounted by checkBpmn function (see above)
    if (error.message.includes('unparsable content')) {
      return { error: null };
    }
    return { error: { message: 'Unexpected error occured: ' + error.message } };
  }
};

// display different information for the save button and handle its click differently based on the current state of the editor (error / warnings / no issues)
const XmlEditorSaveButton: FC<{
  isReadOnly: boolean;
  hasChanges: boolean;
  saveState: SaveStateType;
  handleSave: () => void;
  handleClose: () => void;
}> = ({ isReadOnly, saveState, hasChanges, handleSave, handleClose }) => {
  if (!isReadOnly) {
    if (saveState.state === 'error') {
      return (
        <Tooltip placement="top" title="Fix the syntax errors in the bpmn before saving!">
          <Button key="disabled-save-button" type="primary" disabled>
            Save
          </Button>
        </Tooltip>
      );
    } else if (saveState.state === 'warning') {
      return (
        <Popconfirm
          title="Warning"
          description={
            <span>
              There are unrecognized attributes or <br /> elements in the BPMN. Save anyway?
            </span>
          }
          onConfirm={handleSave}
          okText="Save"
          cancelText="Cancel"
        >
          <Button type="primary">Save</Button>
        </Popconfirm>
      );
    } else if (hasChanges) {
      return (
        <Button type="primary" onClick={handleSave}>
          Save
        </Button>
      );
    }
  }

  return (
    <Button type="primary" onClick={handleClose}>
      Ok
    </Button>
  );
};

const XmlEditor: FC<XmlEditorProps> = ({ bpmn, canSave, onClose, onSaveXml, process }) => {
  const editorRef = useRef<null | monaco.editor.IStandaloneCodeEditor>(null);
  const monacoRef = useRef<null | Monaco>(null);

  const currentBpmnRef = useRef<string>(bpmn || '');

  useEffect(() => {
    if (bpmn) currentBpmnRef.current = bpmn;
  }, [bpmn]);

  const [saveState, setSaveState] = useState<SaveStateType>({
    state: 'none',
    errorMessages: [],
    errorLocations: [],
  });
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [editWarningVisible, setEditWarningVisible] = useState(false);
  const [saveConfirmVisible, setSaveConfirmVisible] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [unsavedChangesWarningVisible, setUnsavedChangesWarningVisible] = useState(false);

  const handleEditorMount = (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  const handleClose = () => {
    setIsReadOnly(true);
    setEditWarningVisible(false);
    setSaveConfirmVisible(false);
    onClose();
  };

  function discardChanges() {
    if (editorRef.current && currentBpmnRef.current) {
      // TODO: bpmn is the value when the modal was opened, the user might have already made
      // changes and saved them which would not be handled correctly by the following code
      editorRef.current.setValue(currentBpmnRef.current);
    }
  }

  const handleCancel = () => {
    discardChanges();
    handleClose();
  };

  const isBpmnValid = async () => {
    if (editorRef.current && monacoRef.current) {
      const newBpmn = editorRef.current.getValue();

      if (!newBpmn) return false;

      const { error } = await checkBpmn(newBpmn);

      if (error) return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (editorRef.current) {
      const newBpmn = editorRef.current.getValue();

      await onSaveXml(newBpmn);
      currentBpmnRef.current = newBpmn;
      setHasChanges(false);
    }
  };

  const saveAndClose = async () => {
    await handleSave();
    handleClose();
  };

  async function validateProcess() {
    if (editorRef.current && monacoRef.current) {
      // reset error markings in the editor
      monacoRef.current.editor.setModelMarkers(editorRef.current.getModel()!, 'owner', []);
      setSaveState({
        state: 'none',
        errorMessages: [],
        errorLocations: [],
      });
      const newBpmn = editorRef.current.getValue();

      setHasChanges(newBpmn !== currentBpmnRef.current);

      const errors: EditorError[] = [];
      const errorMessages: string[] = [];
      const errorLocations: string[] = [];

      const { error: bpmnError, warnings } = await checkBpmn(newBpmn);
      const { error: definitionIdChangeError } = await checkDefinitionIdChange(newBpmn, process.id);
      const { error: processNameError } = await checkProcessNameDefinitionAttribute(newBpmn);

      if (bpmnError) {
        errors.push(bpmnError);
        errorMessages.push(bpmnError.message);
        bpmnError.startLineNumber
          ? errorLocations.push(
              `Line ${bpmnError.startLineNumber}, Column ${bpmnError.startColumn}`,
            )
          : null;
      }

      if (definitionIdChangeError) {
        errors.push(definitionIdChangeError);
        errorMessages.push(definitionIdChangeError.message);
      }
      if (processNameError) {
        errors.push(processNameError);
        errorMessages.push(processNameError.message);
      }

      if (errors.length > 0) {
        setSaveState({
          state: 'error',
          errorMessages,
          errorLocations,
        });

        monacoRef.current!.editor.setModelMarkers(
          editorRef.current!.getModel()!,
          'owner',
          errors
            .filter(
              (error): error is Required<EditorError> =>
                error.startLineNumber !== undefined &&
                error.endLineNumber !== undefined &&
                error.startColumn !== undefined &&
                error.endColumn !== undefined,
            )
            .map((error) => ({
              ...error,
              severity: monacoRef.current!.MarkerSeverity.Error,
            })),
        );

        return false;
      } else if (warnings && warnings.length) {
        setSaveState({
          state: 'warning',
          errorMessages: [],
          errorLocations: [],
          warnings: warnings,
        });
      }
    }

    return true;
  }

  // run the validation when something changes and add code highlighting (with debounce)
  const handleChange = debounce(() => validateProcess(), 100);

  const handleValidationAndSave = async () => {
    if (await isBpmnValid()) {
      hasChanges ? setSaveConfirmVisible(true) : saveAndClose();
    }
  };

  const handleCopyToClipboard = () => {
    if (editorRef.current) {
      navigator.clipboard.writeText(editorRef.current.getValue());
    }
  };

  const toggleEditMode = () => {
    if (isReadOnly) {
      setEditWarningVisible(true);
    } else if (hasChanges) {
      setUnsavedChangesWarningVisible(true);
    } else {
      setIsReadOnly(true);
    }
  };

  const confirmEditMode = () => {
    setIsReadOnly(false);
    setEditWarningVisible(false);
  };

  const getAlertMessage = () => {
    if (saveState.state === 'error' && saveState.errorMessages.length > 0) {
      return (
        <div>
          <strong>XML Error{saveState.errorMessages.length > 1 ? 's' : ''}:</strong>
          <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
            {saveState.errorMessages.map((msg, index) => (
              <li key={index}>
                {msg}
                {saveState.errorLocations[index] && (
                  <span style={{ fontWeight: 'bold' }}>({saveState.errorLocations[index]})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      );
    } else if (
      saveState.state === 'warning' &&
      saveState.warnings &&
      saveState.warnings.length > 0
    ) {
      return (
        <div>
          <strong>Warning{saveState.warnings.length > 1 ? 's' : ''}:</strong>
          <span>
            There are {saveState.warnings.length} unrecognized attributes or elements in the BPMN.
          </span>
        </div>
      );
    }
    return '';
  };

  return (
    <>
      <Modal
        open={!!bpmn}
        onOk={handleValidationAndSave}
        onCancel={handleCancel}
        centered
        styles={{ body: { position: 'relative' } }}
        width="85vw"
        title={
          <Flex align="center" style={{ marginBottom: '15px' }}>
            <Title level={3} style={{ marginBottom: 0 }}>
              BPMN XML
            </Title>
            <div style={{ flexGrow: 1 }} />
            <Typography.Text type="secondary">
              Mode: {isReadOnly ? 'Read only' : 'Edit'}
            </Typography.Text>
            <div style={{ flexGrow: 1 }} />
            <Space.Compact>
              {isReadOnly && canSave && (
                <Tooltip title="Enter Edit Mode">
                  <Button icon={<MdOutlineModeEdit />} onClick={toggleEditMode} />
                </Tooltip>
              )}
              {!isReadOnly && (
                <Tooltip title="Exit Edit Mode">
                  <Button icon={<MdOutlineEditOff />} onClick={toggleEditMode} />
                </Tooltip>
              )}

              <Tooltip title="Undo">
                <Button
                  disabled={isReadOnly}
                  icon={<MdUndo />}
                  onClick={() => {
                    editorRef.current?.trigger(null, 'undo', null);
                  }}
                ></Button>
              </Tooltip>
              <Tooltip title="Redo">
                <Button
                  disabled={isReadOnly}
                  icon={<MdRedo />}
                  onClick={() => {
                    editorRef.current?.trigger(null, 'redo', null);
                  }}
                ></Button>
              </Tooltip>

              <Tooltip title="Copy to Clipboard">
                <Button icon={<CopyOutlined />} onClick={handleCopyToClipboard} />
              </Tooltip>
              <Tooltip title="Search">
                <Button
                  icon={<SearchOutlined />}
                  onClick={() => {
                    if (editorRef.current) editorRef.current.getAction('actions.find')?.run();
                  }}
                />
              </Tooltip>
            </Space.Compact>
            <Button
              className="ant-modal-close-x"
              type="text"
              style={{ color: 'rgba(0,0,0,0.45)', position: 'relative', right: '-8px' }}
              icon={<CloseOutlined />}
              onClick={handleCancel}
            />
          </Flex>
        }
        closeIcon={false}
        footer={[
          hasChanges ? (
            <Button key="close-button" onClick={handleCancel}>
              Cancel
            </Button>
          ) : undefined,
          <XmlEditorSaveButton
            key="save-button"
            isReadOnly={isReadOnly}
            hasChanges={hasChanges}
            saveState={saveState}
            handleSave={handleValidationAndSave}
            handleClose={handleClose}
          />,
        ]}
      >
        {saveState.state !== 'none' && (
          <Alert message={getAlertMessage()} type={saveState.state} banner showIcon />
        )}{' '}
        <Editor
          defaultLanguage="xml"
          value={bpmn}
          options={{
            wordWrap: 'on',
            wrappingStrategy: 'advanced',
            wrappingIndent: 'same',
            readOnly: isReadOnly,
            theme: 'vs',
          }}
          onMount={handleEditorMount}
          onChange={handleChange}
          height="85vh"
          className="Hide-Scroll-Bar"
        />
        {isReadOnly && (
          <div
            className="readonly-overlay"
            style={{
              position: 'absolute',
              top: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(200, 200, 200, 0.3)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />
        )}
      </Modal>

      {/* Edit Warning Modal */}
      <Modal
        title={
          <>
            <ExclamationCircleOutlined style={{ color: 'red' }} /> Caution
          </>
        }
        open={editWarningVisible}
        onCancel={() => setEditWarningVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setEditWarningVisible(false)}>
            Cancel
          </Button>,
          <Button key="proceed" type="primary" onClick={confirmEditMode}>
            Edit Anyway
          </Button>,
        ]}
      >
        <p>
          You are opening the edit mode. Direct changes to the XML should only be made by experts,
          as this can have unforeseen consequences for the process.
        </p>
      </Modal>

      {canSave && (
        <>
          {/* Modal that handles the return to read-only if there are unsaved changes */}
          <Modal
            title="Unsaved changes"
            open={unsavedChangesWarningVisible}
            closable
            onCancel={() => setUnsavedChangesWarningVisible(false)}
            footer={
              <Space style={{ display: 'flex', justifyContent: 'end', marginTop: '12px' }}>
                <Button
                  onClick={() => {
                    discardChanges();
                    setIsReadOnly(true);
                    setUnsavedChangesWarningVisible(false);
                  }}
                >
                  Discard
                </Button>
                <XmlEditorSaveButton
                  isReadOnly={isReadOnly}
                  hasChanges={hasChanges}
                  saveState={saveState}
                  handleSave={async () => {
                    if (await isBpmnValid()) {
                      await handleSave();
                      setIsReadOnly(true);
                    }
                    setUnsavedChangesWarningVisible(false);
                  }}
                  handleClose={() => {}}
                />
              </Space>
            }
          >
            You have made changes to the xml. Save them or discard them to return to read-only mode.
          </Modal>

          {/* Save Confirmation Modal */}
          <Modal
            title={
              <>
                <ExclamationCircleOutlined style={{ color: 'red' }} /> Save Changes
              </>
            }
            open={saveConfirmVisible}
            onCancel={() => setSaveConfirmVisible(false)}
            footer={[
              <Button key="cancel" onClick={() => setSaveConfirmVisible(false)}>
                Cancel
              </Button>,
              <Button key="save" type="primary" onClick={saveAndClose}>
                Save
              </Button>,
            ]}
          >
            <p>
              Note: Saving changes done directly in the XML will completely overwrite and re-import
              the current process.
            </p>
          </Modal>
        </>
      )}
    </>
  );
};

export default XmlEditor;
