'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { getProceedLanguageExtension } from '../monaco-typescript-language-extension';
import cn from 'classnames';
import styles from './monaco-editor.module.scss';

type MonacoEditorProps = {
  initialScript: string;
  onChange: () => void;
  disabled?: boolean;
  variables?: { name: string; type: string }[];
};

export type MonacoEditorRef = {
  insertTextOnCursor: (text: string) => void;
  reset: () => void;
  getCode: () => Promise<Record<'ts' | 'js' | 'xml', string | false> | undefined>;
  format: () => Promise<void>;
};

const MonacoEditor = forwardRef<MonacoEditorRef, MonacoEditorProps>(
  ({ initialScript, onChange, disabled = false, variables = [] }, ref) => {
    const monacoEditorRef = useRef<null | monaco.editor.IStandaloneCodeEditor>(null);
    const monacoRef = useRef<null | Monaco>(null);

    const [initialized, setInitialized] = useState(false);

    const handleEditorMount = (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
      monacoEditorRef.current = editor;
      monacoRef.current = monaco;

      monacoRef.current.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monacoRef.current.languages.typescript.ScriptTarget.ES2020,
        // Only include ES library, exclude DOM and browser APIs
        lib: ['es2020'],
        strictNullChecks: true,
        allowNonTsExtensions: true,
        moduleResolution: monacoRef.current.languages.typescript.ModuleResolutionKind.NodeJs,
      });

      monacoRef.current.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
        diagnosticCodesToIgnore: [
          1108, // return not inside function
          1375, // 'await' expressions are only allowed at the top level of a file
          1378, // Top-level 'await' expressions
        ],
      });

      setInitialized(true);
    };

    useEffect(() => {
      if (initialized) {
        const languageExtension = getProceedLanguageExtension(variables);

        const lib =
          monacoRef.current!.languages.typescript.typescriptDefaults.addExtraLib(languageExtension);

        return () => lib.dispose();
      }
    }, [initialized, variables]);

    useImperativeHandle(
      ref,
      () => {
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

        return {
          insertTextOnCursor: (text) => {
            const editorPositionRange = getEditorPositionRange();
            if (!editorPositionRange || !monacoEditorRef.current) return;

            monacoEditorRef.current.executeEdits('', [
              {
                range: editorPositionRange,
                text,
              },
            ]);
          },
          getCode: async () => {
            if (!monacoEditorRef.current || !monacoRef.current) return;
            const typescriptCode = monacoEditorRef.current.getValue();

            // Transpile TS code to JS
            const typescriptWorker =
              await monacoRef.current.languages.typescript.getTypeScriptWorker();
            const editorModel = monacoEditorRef.current.getModel();
            if (!editorModel) {
              throw new Error(
                'Could not get model from editor to transpile TypeScript code to JavaScript',
              );
            }
            const client = await typescriptWorker(editorModel.uri);
            const emitOutput = await client.getEmitOutput(editorModel.uri.toString());
            const javascriptCode = emitOutput.outputFiles[0].text;

            return {
              ts: typescriptCode,
              js: javascriptCode,
              xml: false,
            };
          },
          reset: () => monacoEditorRef.current?.setValue(initialScript),
          format: () =>
            monacoEditorRef.current
              ?.getAction('editor.action.formatDocument')
              ?.run() as Promise<void>,
        };
      },
      [initialScript],
    );

    return (
      <Editor
        defaultLanguage="typescript"
        value={initialScript}
        options={{
          wordWrap: 'on',
          wrappingStrategy: 'advanced',
          wrappingIndent: 'same',
          readOnly: disabled,
        }}
        onMount={handleEditorMount}
        onChange={() => onChange()}
        className={cn('Hide-Scroll-Bar', styles.MonacoEditor)}
      />
    );
  },
);

MonacoEditor.displayName = 'MonacoEditor';

export default MonacoEditor;
