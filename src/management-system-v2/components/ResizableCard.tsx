import React, { useState, useEffect, PropsWithChildren } from 'react';
import { Card, CardProps } from 'antd';

type ResizableCardProps = CardProps &
  PropsWithChildren<{
    initialWidth: number;
    minWidth: number;
    maxWidth: number;
  }>;

const ResizableCard: React.FC<ResizableCardProps> = ({
  children,
  initialWidth,
  minWidth,
  maxWidth,
  ...props
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [width, setWidth] = useState(initialWidth);

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
    <Card
      {...props}
      style={{
        ...props.style,
        width: width,
        overflowY: 'scroll',
      }}
    >
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
    </Card>
  );
};

export default ResizableCard;
