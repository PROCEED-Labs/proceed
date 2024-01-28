'use client';

import { CssSize, cssSizeToPixel } from '@/lib/css-units-helper';
import React, {
  useState,
  useEffect,
  PropsWithChildren,
  CSSProperties,
  forwardRef,
  useImperativeHandle,
} from 'react';

type ResizableElementProps = PropsWithChildren<{
  initialWidth: number;
  minWidth: CssSize;
  maxWidth: CssSize;
  onWidthChange?: (width: number) => void;
  style?: CSSProperties;
  lock?: boolean;
}>;

export type ResizableElementRefType = (
  size: CssSize | { width?: CssSize; minWidth?: CssSize; maxWidth?: CssSize },
) => void;

let isResizing = false;
const ResizableElement = forwardRef<ResizableElementRefType, ResizableElementProps>(
  function ResizableElement(
    { children, initialWidth, minWidth, maxWidth, style = {}, onWidthChange, lock = false },
    ref,
  ) {
    const [width, setWidth] = useState(initialWidth);
    const [minWidth, setMinWidth] = useState(initialMinWidth);
    const [maxWidth, setMaxWidth] = useState(initialMaxWidth);

    useImperativeHandle(
      ref,
      () => (size: CssSize | { width?: CssSize; minWidth?: CssSize; maxWidth?: CssSize }) => {
        if (typeof size === 'object') {
          const { width, minWidth, maxWidth } = size;
          if (width) {
            setWidth(cssSizeToPixel(width));
          }

          if (minWidth) {
            setMinWidth(minWidth);
          }

          if (maxWidth) {
            setMaxWidth(maxWidth);
          }
        } else {
          setWidth(cssSizeToPixel(size));
        }
      },
    );

    const onMouseDown = (e: { stopPropagation: () => void; preventDefault: () => void }) => {
      e.stopPropagation();
      e.preventDefault();
      isResizing = true;
    };

    const onMouseUp = () => {
      isResizing = false;
    };

    const onUserMovement = (clientX: number) => {
      if (isResizing && !lock) {
        let offsetRight = document.body.offsetWidth - (clientX - document.body.offsetLeft);

        const minPixels = cssSizeToPixel(minWidth);
        const maxPixels = cssSizeToPixel(maxWidth);

        if (offsetRight > minPixels && offsetRight < maxPixels) {
          setWidth(offsetRight);
          if (onWidthChange) onWidthChange(width);
        }
      }
    };

    useEffect(() => {
      const onMouseMove = (e: MouseEvent) => onUserMovement(e.clientX);
      const onTouchMove = (e: TouchEvent) =>
        onUserMovement(e.touches[e.touches.length - 1].clientX);

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('touchmove', onTouchMove);
      document.addEventListener('mouseup', onMouseUp);

      return () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
    });

    return (
      <div
        style={{
          ...style,
          width,
          maxWidth,
          minWidth,
        }}
      >
        <div
          style={{
            position: 'relative',
            height: '100%',
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
              cursor: lock ? 'default' : 'ew-resize',
            }}
            onMouseDown={onMouseDown}
            onTouchStart={onMouseDown}
          />
          {children}
        </div>
      </div>
    );
  },
);

export default ResizableElement;
