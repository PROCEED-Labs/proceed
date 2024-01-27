import { Viewer, ViewerProps } from '@toast-ui/react-editor';
import React, { useEffect, useRef } from 'react';

const TextViewer: React.FC<ViewerProps> = (viewerProps) => {
  const viewerRef = useRef<Viewer>(null);

  useEffect(() => {
    if (viewerRef.current) {
      const viewer = viewerRef.current as Viewer;
      const viewerInstance = viewer.getInstance();

      viewerInstance.setMarkdown(viewerProps.initialValue || '');
    }
  }, [viewerProps.initialValue, viewerRef]);

  return <Viewer ref={viewerRef} {...viewerProps}></Viewer>;
};

export default TextViewer;
