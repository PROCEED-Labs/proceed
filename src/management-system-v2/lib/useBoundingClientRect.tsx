import { useLayoutEffect, useState } from 'react';

type DOMRectKeyType = 'x' | 'y' | 'bottom' | 'top' | 'left' | 'right' | 'width' | 'height';

type FullDOMRect = { [k in DOMRectKeyType]: number };

type PartialDOMRect<T extends ReadonlyArray<DOMRectKeyType>> = Pick<FullDOMRect, T[number]>;

/**
 * Hook that observes an element and triggers a rerender when the size of the element changes
 *
 * @param ref the element to observe
 * @param toWatch the properties of the DOMRect of the element that should trigger a rerender when changed (all others are ignored)
 * @returns the current value of the watched DOMRect properties
 */
function useBoundingClientRect<T extends ReadonlyArray<DOMRectKeyType>>(
  el: HTMLElement | undefined,
  toWatch: T,
): PartialDOMRect<T> {
  const [boundingBox, setBoundingBox] = useState(new DOMRect());

  useLayoutEffect(() => {
    if (el) {
      const bb = el.getBoundingClientRect();
      setBoundingBox(bb);

      let currentBB = bb;
      const observer = new ResizeObserver((entries) => {
        const newBB = entries[0].contentRect;

        // check for changes in the watched values
        if (
          toWatch.some((key) => {
            return currentBB[key] !== newBB[key];
          })
        ) {
          setBoundingBox(newBB);
          currentBB = newBB;
        }
      });

      observer.observe(el);

      () => observer.disconnect();
    }
  }, [el]);

  return boundingBox;
}

export default useBoundingClientRect;
