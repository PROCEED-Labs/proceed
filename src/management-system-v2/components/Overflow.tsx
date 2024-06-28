import React, { ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Button, Dropdown } from 'antd';

import { EllipsisOutlined } from '@ant-design/icons';

import useBoundingClientRect from '@/lib/useBoundingClientRect';

export type OverFlowSpaceItem = {
  key: string;
  label: ReactNode;
};

export type OverflowProps = {
  /** The elements to put into the container */
  items: OverFlowSpaceItem[];
  /** The container to watch for overflowing (if none is given a div will be created as a default container) */
  containerRef?: React.RefObject<HTMLElement>;
  /** How the elements that fit into the size of the container should be rendered */
  renderVisibleItem?: (item: OverFlowSpaceItem) => ReactNode;
  /** A replacement for the elements that would not fit the container currently (the result will be considered when calculating what fits as it is put into the visible part of the container) */
  renderHidden?: (items: OverFlowSpaceItem[]) => ReactNode;
};

/**
 * A Component that handles content that might overflow its container
 */
const Overflow: React.FC<OverflowProps> = ({
  items,
  containerRef,
  renderVisibleItem = (item: OverFlowSpaceItem) => (
    <span style={{ width: 'max-content' }} key={item.key}>
      {item.label}
    </span>
  ),
  renderHidden = (items: OverFlowSpaceItem[]) => (
    <Dropdown menu={{ items }}>
      <Button type="text" icon={<EllipsisOutlined />} />
    </Dropdown>
  ),
}) => {
  const [itemWidths, setItemWidths] = useState<number[]>([]);
  const [hiddenIndicatorWidth, setHiddenIndicatorWidth] = useState(0);
  const [currentOverFlowIndex, setCurrentOverFlowIndex] = useState(-2);

  // either use the given container ref or create a default div container and reference that
  const defaultRef = useRef<HTMLDivElement>(null);
  const ref = containerRef || defaultRef;

  // watch changes to the size of the container element
  const { width: containerWidth } = useBoundingClientRect(ref, ['width']);

  useEffect(() => {
    // initialize the width of all items and the element that is rendered in place of overflowing items
    // TODO: recalculate the values if the items or the indicator rendering function change
    // (cannot easily do this without content currently in the overflow being reset)
    if (ref.current && !itemWidths.length) {
      const children = Array.from(ref.current.children);
      const rects = children.slice(0, items.length).map((child) => child.getBoundingClientRect());
      setItemWidths(
        rects.map(({ left, right }, index) => {
          if (!index) return right - left;

          return right - rects[index - 1].right;
        }),
      );
      if (children.length > items.length) {
        setHiddenIndicatorWidth(children[children.length - 1].getBoundingClientRect().width);
      }
    }
  }, [items]);

  useLayoutEffect(() => {
    // calculate what is currently visible
    if (ref.current && itemWidths.length) {
      let accWidth = 0;
      const firstHidden = itemWidths.findIndex((childWidth, index) => {
        accWidth += childWidth;

        if (index === itemWidths.length - 1) return containerWidth < accWidth;

        return containerWidth < accWidth + hiddenIndicatorWidth;
      });

      if (currentOverFlowIndex === firstHidden) return;

      setCurrentOverFlowIndex(firstHidden);
    }
  }, [itemWidths, containerWidth, hiddenIndicatorWidth]);

  const [visible, hidden] = useMemo(() => {
    const visible = currentOverFlowIndex < 0 ? items : items.slice(0, currentOverFlowIndex);
    const hidden = currentOverFlowIndex < 0 ? [] : items.slice(currentOverFlowIndex);

    return [visible, hidden];
  }, [items, currentOverFlowIndex]);

  // if a ref is given we expect the container to be defined outside this component
  if (!containerRef) {
    return (
      <div ref={defaultRef}>
        {visible.map(renderVisibleItem)}
        {(!itemWidths.length || !!hidden.length) && renderHidden(hidden)}
      </div>
    );
  } else {
    return (
      <>
        {visible.map(renderVisibleItem)}
        {(currentOverFlowIndex === -2 || !!hidden.length) && renderHidden(hidden)}
      </>
    );
  }
};

export default Overflow;
