import { Editor as EditorClass, EditorProps } from '@toast-ui/react-editor';
import { Tabs } from 'antd';
import React, { FC, RefAttributes, forwardRef, useEffect } from 'react';
import styles from './text-editor.module.scss';
import dynamic from 'next/dynamic';

// Editor uses `navigator` in top level scope, which is not available in server side rendering.
const ToastUIEditor = dynamic(() => import('./toastui-editor').then((res) => res.ToastUIEditor), {
  ssr: false,
});

const TextEditor = forwardRef<EditorClass, EditorProps>(function TextEditor(props, ref) {
  const editorRef = ref as React.MutableRefObject<EditorClass>;
  useEffect(() => {
    if (editorRef.current) {
      const editor = editorRef.current as EditorClass;
      const editorInstance = editor.getInstance();

      if (props.initialValue && props.initialValue.length > 0) {
        editorInstance.setMarkdown(props.initialValue);
      } else {
        editorInstance.reset();
      }
    }
  }, [editorRef, props.initialValue]);

  return (
    <div className={styles.EditorContainer}>
      <ToastUIEditor
        editorRef={editorRef}
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
        {...props}
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
            const editor = editorRef.current as EditorClass;
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
}) as FC<RefAttributes<EditorClass> & EditorProps>;

export default TextEditor;
