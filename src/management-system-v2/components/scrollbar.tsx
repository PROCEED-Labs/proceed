import React, { FC, useEffect, useState, useRef, useCallback } from 'react';

type ScrollBarType = {
  children: React.ReactNode;
  width: string;
};

const ScrollBar: FC<ScrollBarType> = ({ children, width }) => {
  const [scrollHeight, setScrollHeight] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const newScrollHeight = (clientHeight / scrollHeight) * 100;
      const newScrollPosition =
        (scrollTop / (scrollHeight - clientHeight)) * (100 - newScrollHeight);

      setScrollHeight(newScrollHeight);
      setScrollPosition(newScrollPosition);
    }
  }, []);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging && containerRef.current && thumbRef.current) {
        const { clientY } = e;
        const { top, height } = containerRef.current.getBoundingClientRect();
        const thumbHeight = thumbRef.current.clientHeight;

        let newScrollTop =
          ((clientY - top - thumbHeight / 2) / (height - thumbHeight)) *
          containerRef.current.scrollHeight;

        newScrollTop = Math.max(newScrollTop, 0);
        newScrollTop = Math.min(
          newScrollTop,
          containerRef.current.scrollHeight - containerRef.current.clientHeight,
        );

        containerRef.current.scrollTop = newScrollTop;
      }
    },
    [isDragging],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, isDragging]);

  useEffect(() => {
    handleScroll();
  }, [handleScroll]);

  return (
    <div style={{ display: 'flex', height: '95%', width: '100%' }}>
      <div
        className="Hide-Scroll-Bar"
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          overflowY: 'scroll',
          width: `calc(100% - ${width})`,
        }}
      >
        {children}
      </div>
      <div
        style={{
          width,
          height: '100%',
          position: 'relative',
          marginLeft: '4px',
        }}
      >
        <div
          ref={thumbRef}
          onMouseDown={handleMouseDown}
          style={{
            position: 'absolute',
            top: `${scrollPosition}%`,
            width: '80%',
            height: `${scrollHeight}%`,
            backgroundColor: '#888',
            borderRadius: '8px',
            cursor: 'grab',
          }}
        />
      </div>
    </div>
  );
};

export default ScrollBar;
