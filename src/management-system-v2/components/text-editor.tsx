import { Editor, EditorProps } from '@toast-ui/react-editor';
import { Tabs } from 'antd';
import React, { RefObject, useEffect } from 'react';
import styles from './text-editor.module.scss';

// IMPORTANT: This component is a wrapper around the Viewer component from
// @toast-ui/react-editor, which cannot be used directly since it uses
// `navigator` at the top-level module scope. Using next/dynamic to import the
// viewer doesn't work as expected because next/dynamic doesn't support refs.
// This component is a workaround to this issue by using the viewer component
// directly (with working refs) and optionally exposing that ref with a custom
// prop name. Then, other components can use this component through next/dynamic
// instead of the viewer directly, and pass the ref prop to it as needed.

// This component cannot receive a ref named "ref", it has to be called
// "editorRef" or similar because next/dynamic doesn't support "ref".
const TextEditor = ({
  initialValue,
  editorRef,
  ...editorProps
}: EditorProps & { editorRef: RefObject<Editor> }) => {
  useEffect(() => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const editorInstance = editor.getInstance();

      if (initialValue && initialValue.length > 0) {
        editorInstance.setMarkdown(initialValue);
      } else {
        editorInstance.reset();
      }
    }
  }, [initialValue]);

  return (
    <div className={styles.EditorContainer}>
      <Editor
        ref={editorRef}
        initialValue={initialValue}
        previewStyle="tab"
        autofocus={true}
        viewer={true}
        initialEditType="wysiwyg"
        toolbarItems={[
          ['heading', 'bold', 'italic'],
          ['hr', 'quote'],
          ['ul', 'ol', 'indent', 'outdent'],
          ['table', 'link'],
          ['code', 'codeblock'],
          ['scrollSync'],
        ]}
        usageStatistics={false}
        {...editorProps}
      />
      <div style={{ display: 'flex', justifyContent: 'start' }}>
        <Tabs
          tabPosition="bottom"
          tabBarStyle={{ marginTop: 0 }}
          tabBarGutter={0}
          defaultActiveKey="editor"
          size="small"
          type="card"
          onChange={(value) => {
            const editor = editorRef.current!;
            const editorInstance = editor.getInstance();
            if (value === 'source') {
              editorInstance.changeMode('markdown');
            } else if (value === 'editor') {
              editorInstance.changeMode('wysiwyg');
            }
          }}
          items={[
            { label: 'Source', key: 'source' },
            { label: 'Editor', key: 'editor' },
          ]}
        ></Tabs>
      </div>
    </div>
  );
};

export default TextEditor;
