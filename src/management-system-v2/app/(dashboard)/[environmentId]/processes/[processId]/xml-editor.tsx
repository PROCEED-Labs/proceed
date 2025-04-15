'use client';

import React, { FC, useRef, useState } from 'react';

import { Modal, Button, Tooltip, Flex, Popconfirm, Space, message, Alert } from 'antd';
import { SearchOutlined, CopyOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
const { Title } = Typography;

import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

import { moddle } from '@proceed/bpmn-helper';

import { debounce } from '@/lib/utils';
import { downloadFile } from '@/lib/process-export/util';
import { MdOutlineEditOff, MdOutlineModeEdit, MdRedo, MdUndo } from 'react-icons/md';

type XmlEditorProps = {
  bpmn?: string;
  canSave: boolean;
  onClose: () => void;
  onSaveXml: (bpmn: string) => Promise<void>;
  process: { name: string; id: string };
  versionName?: string;
};

type EditorError = {
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
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
          endColumn: column + match[0].length,
          message,
        },
      };
    }
  }

  // check for bpmn related mistakes (nonconformity with the underlying model [e.g. unknown elements or attributes])
  const { warnings } = await moddle.fromXML(bpmn);
  return { warnings };
}

/*
 Gets the line and column position for a given match in the BPMN string
 */
const getErrorPosition = (bpmn: string, matchString: string, matchIndex: number) => {
  const textBeforeMatch = bpmn.substring(0, matchIndex);
  const lines = textBeforeMatch.split('\n');
  const lineNumber = lines.length;
  const columnNumber = lines[lines.length - 1].length + 1;

  return {
    startLineNumber: lineNumber,
    endLineNumber: lineNumber,
    startColumn: columnNumber,
    endColumn: columnNumber + matchString.length,
  };
};

const XmlEditor: FC<XmlEditorProps> = ({
  bpmn,
  canSave,
  onClose,
  onSaveXml,
  process,
  versionName,
}) => {
  const editorRef = useRef<null | monaco.editor.IStandaloneCodeEditor>(null);
  const monacoRef = useRef<null | Monaco>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [saveState, setSaveState] = useState<SaveStateType>({
    state: 'none',
    errorMessages: [],
    errorLocations: [],
  });
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [editWarningVisible, setEditWarningVisible] = useState(false);
  const [saveConfirmVisible, setSaveConfirmVisible] = useState(false);

  // Overlay for readonly mode
  const toggleOverlay = (show: boolean) => {
    if (!editorRef.current) return;
    const editorElement = editorRef.current.getDomNode();
    if (!editorElement) return;

    if (overlayRef.current && overlayRef.current.parentElement) {
      overlayRef.current.parentElement.removeChild(overlayRef.current);
      overlayRef.current = null;
    }

    if (show) {
      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'rgba(200, 200, 200, 0.3)';
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '10';

      editorElement.style.position = 'relative';
      editorElement.appendChild(overlay);
      overlayRef.current = overlay;
    }
  };

  const handleEditorMount = (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Apply overlay if in read-only mode
    if (isReadOnly) {
      toggleOverlay(true);
    }
  };

  const handleSave = async () => {
    if (editorRef.current) {
      const newBpmn = editorRef.current.getValue();

      await onSaveXml(newBpmn);
      onClose();
    }
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
      const bpmn = editorRef.current.getValue();

      const errors: EditorError[] = [];
      const errorMessages: string[] = [];
      const errorLocations: string[] = [];

      const { error: bpmnError, warnings } = await checkBpmn(bpmn);
      const { error: definitionIdChangeError } = await checkDefinitionIdChange(bpmn, process.id);
      const { error: processNameError } = await checkProcessNameDefinitionAttribute(bpmn);

      if (bpmnError) {
        errors.push(bpmnError);
        errorMessages.push(bpmnError.message);
        errorLocations.push(`Line ${bpmnError.startLineNumber}, Column ${bpmnError.startColumn}`);
      }

      if (definitionIdChangeError) {
        errors.push(definitionIdChangeError);
        errorMessages.push(definitionIdChangeError.message);
        errorLocations.push(
          `Line ${definitionIdChangeError.startLineNumber}, Column ${definitionIdChangeError.startColumn}`,
        );
      }
      if (processNameError) {
        errors.push(processNameError);
        errorMessages.push(processNameError.message);
        errorLocations.push(
          `Line ${processNameError.startLineNumber}, Column ${processNameError.startColumn}`,
        );
      }

      if (errors.length > 0) {
        setSaveState({
          state: 'error',
          errorMessages,
          errorLocations,
        });
        // add new error markings
        errors.map((error) => {
          if (error) {
            monacoRef.current!.editor.setModelMarkers(editorRef.current!.getModel()!, 'owner', [
              { ...error, severity: monacoRef.current!.MarkerSeverity.Error },
            ]);
          }
        });

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

  const checkDefinitionIdChange = async (bpmn: string, expectedId: string) => {
    const idMatch = bpmn.match(/id=["']([^"']*)["']/i);
    if (idMatch && idMatch[1] !== expectedId) {
      return {
        error: {
          ...getErrorPosition(bpmn, idMatch[0], bpmn.indexOf(idMatch[0])),
          message: 'Modification of definitionId is not allowed!',
        },
      };
    }
    return { error: null };
  };

  const checkProcessNameDefinitionAttribute = async (bpmn: string) => {
    const definitionsMatch = bpmn.match(/<definitions\s([^>]*)>/i);

    if (!definitionsMatch) {
      return {
        error: {
          startLineNumber: 1,
          endLineNumber: 1,
          startColumn: 1,
          endColumn: 1,
          message: 'BPMN must contain a definitions tag',
        },
      };
    }

    const nameMatch = definitionsMatch[1].match(/\bname\s*=\s*["']([^"']*)["']/i);

    if (!nameMatch) {
      return {
        error: {
          ...getErrorPosition(bpmn, definitionsMatch[0], bpmn.indexOf(definitionsMatch[0])),
          message: 'Process name attribute is missing in definitions tag',
        },
      };
    }

    if (!nameMatch[1]?.trim()) {
      return {
        error: {
          ...getErrorPosition(bpmn, nameMatch[0], bpmn.indexOf(nameMatch[0])),
          message: 'Process name cannot be null or empty!',
        },
      };
    }

    return { error: null };
  };

  // run the validation when something changes and add code highlighting (with debounce)
  const handleChange = debounce(() => validateProcess(), 100);

  const handleValidationAndSave = async () => {
    if (editorRef.current && monacoRef.current) {
      const newBpmn = editorRef.current.getValue();

      if (!newBpmn) {
        onClose();
        return;
      }

      const { error } = await checkBpmn(newBpmn);

      if (!error) {
        !isReadOnly ? setSaveConfirmVisible(true) : handleSave();
      }
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
    }
    if (!isReadOnly) {
      setIsReadOnly(true);
      toggleOverlay(true);
    }
  };

  const confirmEditMode = () => {
    setIsReadOnly(false);
    setEditWarningVisible(false);
    toggleOverlay(false);
  };

  const getAlertMessage = () => {
    if (saveState.state === 'error' && saveState.errorMessages.length > 0) {
      return (
        <div>
          <strong>XML Error{saveState.errorMessages.length > 1 ? 's' : ''}:</strong>
          <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
            {saveState.errorMessages.map((msg, index) => (
              <li key={index}>
                {msg}{' '}
                <span style={{ fontWeight: 'bold' }}>({saveState.errorLocations[index]})</span>
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

  // display different information for the save button and handle its click differently based on the current state of the editor (error / warnings / no issues)
  const saveButton = {
    disabled: (
      <Tooltip
        key="tooltip-save-button"
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
    ),
    warning: (
      <Popconfirm
        key="warning-save-button"
        title="Warning"
        description={
          <span>
            There are unrecognized attributes or <br /> elements in the BPMN. Save anyway?
          </span>
        }
        onConfirm={handleValidationAndSave}
        okText="Save"
        cancelText="Cancel"
      >
        <Button type="primary">Save</Button>
      </Popconfirm>
    ),
    normal: (
      <Button key="save-button" type="primary" onClick={handleValidationAndSave}>
        Save
      </Button>
    ),
  };

  return (
    <>
      <Modal
        open={!!bpmn}
        onOk={handleValidationAndSave}
        onCancel={onClose}
        centered
        width="85vw"
        title={
          <Flex justify="space-between">
            <Title level={3}>BPMN XML</Title>
            <Typography.Text type="secondary">
              Mode: {isReadOnly ? 'Read only' : 'Edit'}
            </Typography.Text>
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
          </Flex>
        }
        closeIcon={false}
        footer={[
          <Button key="close-button" onClick={onClose}>
            Cancel
          </Button>,
          ((!canSave || saveState.state === 'error') && saveButton['disabled']) ||
            (saveState.state === 'warning' && saveButton['warning']) ||
            saveButton['normal'],
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

      {/* Save Confirmation Modal */}
      {!isReadOnly && canSave && (
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
            <Button key="save" type="primary" onClick={handleSave}>
              Save
            </Button>,
          ]}
        >
          <p>
            Note: Saving changes done directly in the XML will completely overwrite and re-import
            the current process.
          </p>
        </Modal>
      )}
    </>
  );
};

export default XmlEditor;
