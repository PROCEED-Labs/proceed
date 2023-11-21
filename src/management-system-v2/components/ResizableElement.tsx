import React, { useState, useEffect, PropsWithChildren, CSSProperties } from 'react';

type ResizableElementProps = PropsWithChildren<{
  initialWidth: number;
  minWidth: number;
  maxWidth: number;
  style?: CSSProperties;
}>;

const ResizableElement: React.FC<ResizableElementProps> = ({
  children,
  initialWidth,
  minWidth,
  maxWidth,
  style = {},
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [width, setWidth] = useState(initialWidth);

  useEffect(() => {
    setWidth(initialWidth);
  }, [initialWidth]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
  };

  const onMouseUp = (e: MouseEvent) => {
    setIsResizing(false);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (isResizing) {
      let offsetRight = document.body.offsetWidth - (e.clientX - document.body.offsetLeft);

      if (offsetRight > minWidth && offsetRight < maxWidth) {
        setWidth(offsetRight);
      }
    }
  };

  useEffect(() => {
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  });

  return (
    <div
      style={{
        ...style,
        width: width,
      }}
    >
      {/* This is used to resize the element  */}
      <div
        style={{
          position: 'absolute',
          width: '5px',
          padding: '4px 0 0',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 100,
          cursor: 'ew-resize',
        }}
        onMouseDown={onMouseDown}
      />
      {children}
    </div>
  );
};

export default ResizableElement;
