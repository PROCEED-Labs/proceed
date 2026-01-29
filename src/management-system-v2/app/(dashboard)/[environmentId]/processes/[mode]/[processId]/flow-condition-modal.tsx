import React, { useEffect, useRef, useState } from 'react';

import { is as bpmnIs, isAny as bpmnIsAny, Element } from 'bpmn-js/lib/util/ModelUtil';
import { Checkbox, Form, Input, Modal } from 'antd';
import useModelerStateStore from './use-modeler-state-store';
import { Editor, Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import languageExtension from './monaco-typescript-language-extension.js';
import styles from './flow-condition-modal.module.scss';
import cn from 'classnames';

export function isConditionalFlow(element?: Element) {
  return (
    element &&
    bpmnIs(element, 'bpmn:SequenceFlow') &&
    element.source &&
    bpmnIsAny(element.source, ['bpmn:ExclusiveGateway', 'bpmn:InclusiveGateway'])
  );
}

function isDefaultFlow(element?: Element) {
  if (!element || !isConditionalFlow(element)) return false;

  return element.source.businessObject.default === element.businessObject;
}

function getConditionString(element?: Element) {
  if (!element || !isConditionalFlow(element)) return '';

  return element.businessObject.conditionExpression
    ? element.businessObject.conditionExpression.body
    : '';
}

type FlowConditionModalProps = {
  element?: Element;
  open: boolean;
  onClose: () => void;
  readOnly?: boolean;
};

const FlowConditionModal: React.FC<FlowConditionModalProps> = ({
  element,
  open,
  onClose,
  readOnly = false,
}) => {
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const monacoEditorRef = useRef<null | monaco.editor.IStandaloneCodeEditor>(null);
  const monacoRef = useRef<null | Monaco>(null);

  const modeler = useModelerStateStore((state) => state.modeler);

  useEffect(() => {
    if (element && isConditionalFlow(element)) {
      setDescription(element.businessObject.name);
      setIsDefault(isDefaultFlow(element));
      monacoEditorRef.current?.setValue(getConditionString(element));
    }
  }, [element, open]);

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

    monacoEditorRef.current.setValue(getConditionString(element));

    monacoRef.current.languages.typescript.javascriptDefaults.addExtraLib(languageExtension);
    monacoRef.current.editor.createModel(languageExtension, 'typescript');

    editor.onKeyDown((e) => {
      if (e.keyCode == monaco.KeyCode.Enter) e.preventDefault();
    });
  };

  const handleSubmit = () => {
    if (!modeler || !element) return;

    const modeling = modeler.getModeling();
    const factory = modeler.getFactory();

    if (isDefault) {
      modeling.updateProperties(element.source, {
        default: element.businessObject,
      });
    }
    if (!isDefault && isDefaultFlow(element)) {
      modeling.updateProperties(element.source, {
        default: null,
      });
    }

    const condition = monacoEditorRef.current?.getValue();
    const conditionExpression =
      condition && !isDefault ? factory.create('bpmn:FormalExpression', { body: condition }) : null;
    modeling.updateProperties(element, {
      name: description,
      conditionExpression,
    });

    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        centered
        title={<span style={{ fontSize: '1.5rem' }}>Gateway Condition</span>}
        onCancel={() => onClose()}
        onOk={() => handleSubmit()}
      >
        <Form layout="vertical">
          <Form.Item label="Description">
            <Input
              value={description}
              disabled={readOnly}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Form.Item>
          <Form.Item label="Condition">
            <div
              style={{
                border: '1px solid #d9d9d9',
                height: '32px',
                padding: '0.25rem 0.6875rem',
                borderRadius: '0.375rem',
                cursor: isDefault || readOnly ? 'not-allowed' : undefined,
                backgroundColor: isDefault || readOnly ? 'rgb(245, 245, 245)' : undefined,
              }}
            >
              <Editor
                defaultValue=""
                defaultLanguage="typescript"
                theme="vs-light"
                options={{
                  readOnly: isDefault || readOnly,
                  automaticLayout: true,
                  fontSize: 14,
                  wordWrap: 'off',
                  lineNumbers: 'off',
                  lineNumbersMinChars: 0,
                  overviewRulerLanes: 0,
                  lineDecorationsWidth: 0,
                  hideCursorInOverviewRuler: true,
                  glyphMargin: false,
                  folding: false,
                  scrollBeyondLastColumn: 0,
                  scrollbar: { horizontal: 'hidden', vertical: 'hidden' },
                  renderLineHighlight: 'none',
                  find: {
                    addExtraSpaceOnTop: false,
                    autoFindInSelection: 'never',
                    seedSearchStringFromSelection: 'never',
                  },
                  minimap: { enabled: false },
                }}
                onMount={handleEditorMount}
                className={cn({ [styles.DisabledConditionInput]: isDefault || readOnly })}
              />
            </div>
          </Form.Item>
          <Form.Item label="Default">
            <Checkbox
              checked={isDefault}
              disabled={readOnly}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default FlowConditionModal;
