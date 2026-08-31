'use client';

import { Popover, Tag } from 'antd';
import { useLayoutEffect, useRef, useState } from 'react';
import SpaceLink from '@/components/space-link';

export type TagItem = { id: string; name: string; href?: string };

function renderTag(item: TagItem) {
  const tag = (
    <Tag key={item.id} style={{ marginInlineEnd: 0 }}>
      {item.name}
    </Tag>
  );
  return item.href ? (
    <SpaceLink href={item.href} key={item.id} style={{ cursor: 'pointer' }}>
      {tag}
    </SpaceLink>
  ) : (
    tag
  );
}

export function TagList({ items }: { items: TagItem[] }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [visibleCount, setVisibleCount] = useState(items.length);

  useLayoutEffect(() => {
    if (!containerRef.current || !measureRef.current) return;

    const container = containerRef.current;
    const measurer = measureRef.current;

    function recalculate() {
      const containerWidth = container.offsetWidth;
      const tagEls = Array.from(measurer.children) as HTMLElement[];
      if (tagEls.length === 0) return;

      // width reserved for the "+N" overflow tag
      const overflowTagWidth = 40;

      let usedWidth = 0;
      let count = 0;

      for (let i = 0; i < tagEls.length; i++) {
        const tagWidth = tagEls[i].offsetWidth + 4; // + gap
        const remainingCount = tagEls.length - (i + 1);
        const reserve = remainingCount > 0 ? overflowTagWidth : 0;

        if (usedWidth + tagWidth + reserve <= containerWidth) {
          usedWidth += tagWidth;
          count++;
        } else {
          break;
        }
      }

      setVisibleCount(Math.max(count, items.length > 0 ? 1 : 0));
    }

    recalculate();

    const observer = new ResizeObserver(() => recalculate());
    observer.observe(container);

    return () => observer.disconnect();
  }, [items]);

  if (!items || items.length === 0) return null;

  const visible = items.slice(0, visibleCount);
  const hidden = items.slice(visibleCount);

  return (
    <span
      ref={containerRef}
      style={{
        display: 'flex',
        flexWrap: 'nowrap',
        gap: 4,
        alignItems: 'center',
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* hidden measurer: renders all tags off-screen to get their natural widths */}
      <span
        ref={measureRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          whiteSpace: 'nowrap',
          top: -9999,
          left: -9999,
          display: 'flex',
          gap: 4,
        }}
      >
        {items.map(renderTag)}
      </span>

      {visible.map(renderTag)}
      {hidden.length > 0 && (
        <Popover
          content={
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 240 }}>
              {items.map(renderTag)}
            </div>
          }
          trigger="hover"
        >
          <Tag style={{ cursor: 'pointer', marginInlineEnd: 0 }}>+{hidden.length}</Tag>
        </Popover>
      )}
    </span>
  );
}
