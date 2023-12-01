import React, {
  useState,
  useEffect,
  PropsWithChildren,
  CSSProperties,
  forwardRef,
  useImperativeHandle,
  Dispatch,
  SetStateAction,
} from 'react';

type ResizableElementProps = PropsWithChildren<{
  initialWidth: number;
  minWidth: number;
  maxWidth: number;
  style?: CSSProperties;
}>;

export type ResizableElementRefType = Dispatch<SetStateAction<number>>;

let isResizing = false;
const ResizableElement = forwardRef<ResizableElementRefType, ResizableElementProps>(
  function ResizableElement({ children, initialWidth, minWidth, maxWidth, style = {} }, ref) {
    const [width, setWidth] = useState(initialWidth);

    useImperativeHandle(ref, () => setWidth);

    const onMouseDown = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      isResizing = true;
    };

    const onMouseUp = (e: MouseEvent) => {
      isResizing = false;
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
  },
);

export default ResizableElement;
