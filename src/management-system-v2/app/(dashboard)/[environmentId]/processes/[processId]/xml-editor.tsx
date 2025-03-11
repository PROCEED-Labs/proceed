'use client';

import React, { FC, useRef, useState } from 'react';

import { useParams, useSearchParams } from 'next/navigation';
import { Modal, Button, Tooltip, Flex, Popconfirm, Space, message } from 'antd';
import {
  SearchOutlined,
  DownloadOutlined,
  CopyOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Typography } from 'antd';
const { Title } = Typography;

import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

import { moddle } from '@proceed/bpmn-helper';

import { debounce } from '@/lib/utils';
import { downloadFile } from '@/lib/process-export/util';

type XmlEditorProps = {
  bpmn?: string;
  canSave: boolean;
  onClose: () => void;
  onSaveXml: (bpmn: string) => Promise<void>;
  process: { name: string; id: string };
  versionName?: string;
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
          endColumn: column + 1,
          message,
        },
      };
    }
  }

  // check for bpmn related mistakes (nonconformity with the underlying model [e.g. unknown elements or attributes])
  const { warnings } = await moddle.fromXML(bpmn);
  return { warnings };
}

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
  const [saveState, setSaveState] = useState<'error' | 'warning' | 'none'>('none');
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [editWarningVisible, setEditWarningVisible] = useState(false);
  const [saveConfirmVisible, setSaveConfirmVisible] = useState(false);

  const handleEditorMount = (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
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
      setSaveState('none');
      const bpmn = editorRef.current.getValue();
      const errors = [];
      const { error: bpmnError, warnings } = await checkBpmn(bpmn);
      const { error: definitionIdChangeError } = await checkDefinitionIdChange(bpmn);

      if (bpmnError) errors.push(bpmnError);
      if (definitionIdChangeError) errors.push(definitionIdChangeError);

      if (errors.length > 0) {
        setSaveState('error');
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
        setSaveState('warning');
      }
    }

    return true;
  }

  const checkDefinitionIdChange = async (bpmn: string) => {
    const currentDefinitionIdMatch = bpmn.match(/id="([^"]*)"/) || bpmn.match(/id='([^']*)'/);
    if (currentDefinitionIdMatch && currentDefinitionIdMatch[1] !== process.id) {
      const idAttributeIndex = bpmn.indexOf(currentDefinitionIdMatch[0]);
      const textBeforeMatch = bpmn.substring(0, idAttributeIndex);
      const lines = textBeforeMatch.split('\n');
      const line = lines.length;
      const column = lines[lines.length - 1].length + 1;

      return {
        error: {
          startLineNumber: line,
          endLineNumber: line,
          startColumn: column,
          endColumn: column + currentDefinitionIdMatch[0].length,
          message: 'Modification of definitionId is not allowed!',
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

  const selectedVersionId = parseInt(useSearchParams().get('version') ?? '-1');

  const handleDownload = async () => {
    if (editorRef.current) {
      let filename = process.name || process.id || 'process';

      if (versionName !== undefined) {
        filename += `_version_${versionName || selectedVersionId}`;
      }

      await downloadFile(
        `${filename}.bpmn`,
        new Blob([editorRef.current.getValue()], { type: 'application/xml' }),
      );
    }
  };

  const toggleEditMode = () => {
    if (isReadOnly) {
      setEditWarningVisible(true);
    }
  };

  const confirmEditMode = () => {
    setIsReadOnly(false);
    setEditWarningVisible(false);
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
          Ok
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
        <Button type="primary">Ok</Button>
      </Popconfirm>
    ),
    normal: (
      <Button key="save-button" type="primary" onClick={handleValidationAndSave}>
        Ok
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
            <Typography.Text type="secondary">{isReadOnly ? 'Read only' : 'Edit'}</Typography.Text>
            <Space.Compact>
              {isReadOnly && canSave && (
                <Tooltip title="Enter Edit Mode">
                  <Button icon={<EditOutlined />} onClick={toggleEditMode} />
                </Tooltip>
              )}
              <Tooltip title="Download">
                <Button icon={<DownloadOutlined />} onClick={handleDownload} />
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
          ((!canSave || saveState === 'error') && saveButton['disabled']) ||
            (saveState === 'warning' && saveButton['warning']) ||
            saveButton['normal'],
        ]}
      >
        <Editor
          defaultLanguage="xml"
          value={bpmn}
          options={{
            wordWrap: 'on',
            wrappingStrategy: 'advanced',
            wrappingIndent: 'same',
            readOnly: isReadOnly,
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
