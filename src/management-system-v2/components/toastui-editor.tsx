/**
 * Wrapper for the toastUI editor.
 * This is needed due to handling of references for dynamic imports of modules.
 * See: https://stackoverflow.com/questions/63469232/forwardref-error-when-dynamically-importing-a-module-in-next-js
 */

import React from 'react';
import { Editor, EditorProps, Viewer, ViewerProps } from '@toast-ui/react-editor';

const ToastUIEditor: React.FC<{ editorRef: any } & EditorProps> = ({ editorRef, ...props }) => {
  return <Editor {...props} ref={editorRef}></Editor>;
};

const ToastUIViewer: React.FC<{ viewerRef: any } & ViewerProps> = ({ viewerRef, ...props }) => {
  return <Viewer {...props} ref={viewerRef}></Viewer>;
};

export { ToastUIEditor, ToastUIViewer };
