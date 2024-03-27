import { Viewer as ViewerClass, ViewerProps } from '@toast-ui/react-editor';
import dynamic from 'next/dynamic';
import React, { forwardRef, useEffect, useRef } from 'react';

// Editor uses `navigator` in top level scope, which is not available in server side rendering.
const ToastUIViewer = dynamic(() => import('./toastui-editor').then((res) => res.ToastUIViewer), {
  ssr: false,
});

const TextViewer = forwardRef<ViewerClass, ViewerProps>(function TextViewer(props, ref) {
  const viewerRef = ref as React.MutableRefObject<ViewerClass>;

  useEffect(() => {
    if (viewerRef.current) {
      const viewer = viewerRef.current as ViewerClass;
      const viewerInstance = viewer.getInstance();

      viewerInstance.setMarkdown(props.initialValue || '');
    }
  }, [props.initialValue, viewerRef]);

  return <ToastUIViewer viewerRef={viewerRef} {...props}></ToastUIViewer>;
});

export default TextViewer;
