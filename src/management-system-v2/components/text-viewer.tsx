import { Viewer, ViewerProps } from '@toast-ui/react-editor';
import React, { useEffect, useRef } from 'react';

// IMPORTANT: This component is a wrapper around the Viewer component from
// @toast-ui/react-editor, which cannot be used directly since it uses
// `navigator` at the top-level module scope. Using next/dynamic to import the
// viewer doesn't work as expected because next/dynamic doesn't support refs.
// This component is a workaround to this issue by using the viewer component
// directly (with working refs) and optionally exposing that ref with a custom
// prop name. Then, other components can use this component through next/dynamic
// instead of the viewer directly, and pass the ref prop to it as needed.

// This component cannot receive a ref named "ref", it has to be called
// "viewerRef" or similar because next/dynamic doesn't support "ref".
const TextViewer = (viewerProps: ViewerProps) => {
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
