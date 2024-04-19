import { useIntervalLock } from '@/lib/useIntervalLock';
import React, { FC, useEffect, useState, useRef, useCallback, use, MouseEventHandler } from 'react';
import styles from './scrollbar.module.scss';
import classNames from 'classnames';

type ScrollBarType = {
  children: React.ReactNode;
  width?: string;
  threshold?: number;
  reachedEndCallBack?: () => void;
  maxCallInterval?: number;
};

const [maxThumbHeight, minThumbHeight] = [15, 5]; /* In % */

const ScrollBar: FC<ScrollBarType> = ({
  children,
  width = '12px',
  threshold,
  reachedEndCallBack,
  maxCallInterval,
}) => {
  const [thumbHeight, setThumbHeight] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  const maxInterval = maxCallInterval || 500;
  const scrolledToTH = useIntervalLock(reachedEndCallBack, maxInterval);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const newThumbHeight = Math.min(
        Math.max((clientHeight / scrollHeight) * 100, minThumbHeight),
        maxThumbHeight,
      );
      const newScrollPosition =
        (scrollTop / (scrollHeight - clientHeight)) * (100 - newThumbHeight);

      if (reachedEndCallBack) {
        const th = threshold || 0.8;

        if (scrollTop / (scrollHeight - clientHeight) > th) {
          scrolledToTH();
        }
      }

      setThumbHeight(newThumbHeight);
      setScrollPosition(newScrollPosition);
      setIsOverflowing(scrollHeight > clientHeight);
    }
  }, [reachedEndCallBack, scrolledToTH, threshold]);

  const handleScrollbarClick: MouseEventHandler<HTMLDivElement> = useCallback((e) => {
    if (containerRef.current && thumbRef.current) {
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
          ((clientY - top - thumbHeight) / (height - thumbHeight)) *
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
    /* Timeout for DOM to load content first */
    setTimeout(() => {
      handleScroll();
    }, 100);
  }, [handleScroll]);

  return (
    <div style={{ position: 'relative', display: 'flex', height: '95%', width: '100%' }}>
      <div
        className="Hide-Scroll-Bar"
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          overflowY: 'scroll',
          width: `calc(100% - ${width})`,
        }}
        data-proceed-scroll="Scroll-Bar-Viewport"
      >
        {children}
      </div>
      {isOverflowing && (
        <div
          className={classNames(styles.Scrollbar, { [styles.Dragging]: isDragging })}
          style={{
            width: `${width}`,
            height: '100%',
            position: 'relative',
            marginLeft: '4px',
            borderRadius: '8px',
          }}
          onDoubleClick={handleScrollbarClick}
        >
          <div
            ref={thumbRef}
            onMouseDown={handleMouseDown}
            style={{
              position: 'absolute',
              top: `${scrollPosition}%`,
              width: '80%',
              marginLeft: '10%',
              height: `${thumbHeight}%`,
              backgroundColor: '#888',
              borderRadius: '8px',
              cursor: 'grab',
            }}
          />
        </div>
      )}
    </div>
  );
};

// Helper function to find first ancestor with custom attribute
// Traverses up the DOM tree
// Here: data-scroll
const findParentWithAttribute = (
  element: HTMLElement | null,
  attribute: string,
): HTMLElement | null => {
  if (!element || element.tagName === 'BODY') {
    return null;
  }
  return element.getAttribute(attribute)
    ? element
    : findParentWithAttribute(element.parentElement, attribute);
};

/**
 * The next Scrollbar ancestor will be used as the viewport or, if there is none, the viewport of the client
 * @param watchElement ref to element to watch
 * @param margin top and bottom margin of viewport in px or %, defaults to 50%
 * @param once whether the returned value should remain true once it has been set to true, defaults to true
 * @returns boolean:  whether the element is visible or not
 */
export const useLazyLoading = (
  watchElement: React.MutableRefObject<HTMLElement | null>,
  margin: string = '50%',
  once: boolean = true,
) => {
  const [isVisible, setIsVisible] = useState(false);
  const viewport = useRef<HTMLElement | null>(null);

  /* viewport = null -> defaults to the browser viewport */

  useEffect(() => {
    const element = watchElement.current;
    if (!element) return;

    viewport.current = findParentWithAttribute(element, 'data-proceed-scroll');

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting || entry.intersectionRatio > 0);
        if (once && (entry.isIntersecting || entry.intersectionRatio > 0)) {
          observer.unobserve(element);
        }
      },
      {
        root: viewport.current,
        rootMargin: `${margin} 0%`,
        // threshold: 0.5,
      },
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [margin, once, watchElement]);

  return isVisible;
};

export default ScrollBar;
