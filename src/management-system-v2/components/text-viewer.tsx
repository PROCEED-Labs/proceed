import { Viewer as ViewerClass, ViewerProps } from '@toast-ui/react-editor';
import dynamic from 'next/dynamic';
import React, { useEffect, useRef } from 'react';

// Editor uses `navigator` in top level scope, which is not available in server side rendering.
const Viewer = dynamic(() => import('@toast-ui/react-editor').then((res) => res.Viewer), {
  ssr: false,
});

const TextViewer: React.FC<ViewerProps> = (viewerProps) => {
  const viewerRef = useRef<ViewerClass>(null);

  useEffect(() => {
    if (viewerRef.current) {
      const viewer = viewerRef.current as ViewerClass;
      const viewerInstance = viewer.getInstance();

      viewerInstance.setMarkdown(viewerProps.initialValue || '');
    }
  }, [viewerProps.initialValue, viewerRef]);

  return <Viewer ref={viewerRef} {...viewerProps}></Viewer>;
};

export default TextViewer;
