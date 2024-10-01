import { Node, ROOT_NODE, QueryMethods, WithoutPrivateActions, Element } from '@craftjs/core';
import { pointerWithin, ClientRect } from '@dnd-kit/core';
import { Active, DroppableContainer, RectMap } from '@dnd-kit/core/dist/store';
import { Coordinates } from '@dnd-kit/utilities';
import { RefObject } from 'react';
import { Row } from './elements';

type CraftQuery = ReturnType<typeof QueryMethods>;

type CollisionFuncType = {
  collisionRect: ClientRect;
  droppableRects: RectMap;
  droppableContainers: DroppableContainer[];
  pointerCoordinates: Coordinates | null;
  active: Active | null;
};

const droppableRectCache = new Map<string, ClientRect>();
export const clearDroppableRectCache = () => {
  droppableRectCache.clear();
};

type TransformedRectMap = Map<string, ClientRect>;

/**
 * Calculates the amount by which this column might shrink when the dragged element is removed from the document (the column might be the dragged element in which case its height is set to 0)
 * Inserts the transformed bounding client rect into the given rect map
 * Recursively calls the transform function on its child if the child is a container element
 *
 * @param column
 * @param query the craft query object which we need to get other nodes from the state
 * @param draggedNodeId
 * @param topOffset the amount by which the column will be shifted upwards due to elements above shrinking
 * @param rectMap the map that will contain the transformed bounding client rects of all elements in the end
 * @returns the amount by which the column shrinks
 */
function getTransformedColumnRect(
  column: Node,
  query: CraftQuery,
  draggedNodeId: string,
  topOffset: number,
  rectMap: TransformedRectMap,
) {
  if (!column?.dom) return;
  const rect = column.dom.getBoundingClientRect();

  let shrinkAmount = 0;
  if (column.id === draggedNodeId) shrinkAmount = rect.height;
  else {
    const child = query.node(column.data.nodes[0]).get();
    if (child && child.data.name === 'Container') {
      const childShrinkAmount = getTransformedContainerRect(
        child,
        query,
        draggedNodeId,
        topOffset,
        rectMap,
      );

      if (childShrinkAmount === undefined) return;
      shrinkAmount = childShrinkAmount;
    }
  }

  rectMap.set(column.id, {
    ...rect,
    top: rect.top - topOffset,
    bottom: rect.bottom - (topOffset + shrinkAmount),
    height: rect.height - shrinkAmount,
    left: rect.left,
    right: rect.right,
    width: rect.width,
  });

  return shrinkAmount;
}

/**
 * Calculates the amount by which this container might shrink when the dragged element (which might be contained in the container) is removed from the document
 * Inserts the transformed bounding client rect into the given rect map
 * Recursively calls the transform function on its child if the child is a container element
 *
 * @param container
 * @param query the craft query object which we need to get other nodes from the state
 * @param draggedNodeId
 * @param topOffset the amount by which the container will be shifted upwards due to elements above shrinking
 * @param rectMap the map that will contain the transformed bounding client rects of all elements in the end
 * @returns the amount by which the container shrinks
 */
function getTransformedContainerRect(
  container: Node,
  query: CraftQuery,
  draggedNodeId: string,
  topOffset: number,
  rectMap: TransformedRectMap,
) {
  if (!container?.dom) return;

  // we need to accumulate the amount by which the contained rows shrink
  let shrinkAmount = 0;
  for (const childRowId of container.data.nodes) {
    const childShrinkAmount = getTransformedRowRect(
      childRowId,
      query,
      draggedNodeId,
      topOffset + shrinkAmount,
      rectMap,
    );

    if (childShrinkAmount === undefined) return;
    shrinkAmount += childShrinkAmount;
  }

  const rect = container.dom.getBoundingClientRect();
  if (container.id === ROOT_NODE) rectMap.set(container.id, rect);
  else {
    rectMap.set(container.id, {
      top: rect.top - topOffset,
      bottom: rect.bottom - (topOffset + shrinkAmount),
      height: rect.height - shrinkAmount,
      left: rect.left,
      right: rect.right,
      width: rect.width,
    });
  }

  return shrinkAmount;
}

/**
 * Calculates the amount by which this row might shrink when the dragged element (which might be contained in the row) is removed from the document
 * Inserts the transformed bounding client rect into the given rect map
 * Recursively calls the transform function on its child if the child is a container element
 *
 * @param rowId
 * @param query the craft query object which we need to get other nodes from the state
 * @param draggedNodeId
 * @param topOffset the amount by which the row will be shifted upwards due to elements above shrinking
 * @param rectMap the map that will contain the transformed bounding client rects of all elements in the end
 * @returns the amount by which the row shrinks
 */
function getTransformedRowRect(
  rowId: string,
  query: CraftQuery,
  draggedNodeId: string,
  topOffset: number,
  rectMap: TransformedRectMap,
) {
  const row = query.node(rowId).get();
  if (!row?.dom) return;

  let currentFlexRowStart = -1;
  const flexRows: { child: Node; rect: ClientRect }[][] = [];
  // we need to accumulate the shrinking in each flex row in case we have wrapping inside the row (e.g. in mobile view where the elements are displayed below each other)
  for (const childId of row.data.nodes) {
    const child = query.node(childId).get();
    if (!child?.dom) return;
    const childRect = child.dom.getBoundingClientRect();
    if (childRect.top !== currentFlexRowStart) {
      flexRows.push([{ child, rect: childRect }]);
      currentFlexRowStart = childRect.top;
    } else flexRows[flexRows.length - 1].push({ child, rect: childRect });
  }

  let shrinkAmount = 0;
  for (const flexRow of flexRows) {
    let highestChild: Node | undefined = undefined;
    let highestChildHeight = 0;
    let secondHighestChildHeight = 0;
    const childShrinkAmounts: { [childId: string]: number } = {};
    for (const { child, rect } of flexRow) {
      const childShrinkAmount = getTransformedColumnRect(
        child,
        query,
        draggedNodeId,
        topOffset + shrinkAmount,
        rectMap,
      );
      if (childShrinkAmount === undefined) return;
      childShrinkAmounts[child.id] = childShrinkAmount;
      if (rect.height >= highestChildHeight) {
        secondHighestChildHeight = highestChildHeight;
        highestChild = child;
        highestChildHeight = rect.height;
      }
    }

    if (highestChild) {
      shrinkAmount += Math.min(
        childShrinkAmounts[highestChild.id]!,
        highestChildHeight - secondHighestChildHeight,
      );
    }
  }

  const rect = row.dom.getBoundingClientRect();
  rectMap.set(row.id, {
    ...rect,
    top: rect.top - topOffset,
    bottom: rect.bottom - (topOffset + shrinkAmount),
    height: rect.height - shrinkAmount,
    left: rect.left,
    right: rect.right,
    width: rect.width,
  });

  return shrinkAmount;
}

/**
 * This will adjust the rects of some elements to handle some edge cases
 *
 * @param nodeId
 * @param query the craft query object we use to get the nodes from crafts inner state
 * @param rect the rect to adapt
 * @param rectMap the rects of all elements
 * @returns the rect which potentially changed bounds
 */
function adaptNodeRect(
  nodeId: string,
  query: CraftQuery,
  rect: ClientRect,
  rectMap: TransformedRectMap,
) {
  const node = query.node(nodeId).get();
  if (!node) return rect;

  if (node.data.name === 'Container') {
    // if the node is a container we want to ensure that it is targeted instead of its parent container and row when an item is dragged inside
    if (node.data.parent) {
      const parentColumn = query.node(node.data.parent).get();
      const parentColumnRect = rectMap.get(parentColumn.id);
      const parentRowRect = rectMap.get(parentColumn.data.parent!);

      if (parentRowRect && parentColumnRect) {
        rect.top = parentRowRect.top;
        rect.bottom = parentRowRect.bottom;
        rect.height = parentRowRect.height;
        rect.left = parentColumnRect.left - 3;
        rect.right = parentColumnRect.right + 3;
      }
    }
  } else if (node.data.name === 'Row') {
    // treat rows as if they extend to their parents (container) border horizontally
    if (node.data.parent) {
      const parentContainerRect = rectMap.get(node.data.parent);
      if (parentContainerRect) {
        rect.left = parentContainerRect.left;
        rect.right = parentContainerRect.right;
        rect.width = parentContainerRect.width;
      }
    }
  }

  return rect;
}

function getDroppableRects(query: CraftQuery, draggedNode: Node | null) {
  if (!droppableRectCache.size) {
    clearDroppableRectCache();

    const rects: TransformedRectMap = new Map();
    const res = getTransformedContainerRect(
      query.node(ROOT_NODE).get(),
      query,
      draggedNode ? draggedNode.id : '',
      0,
      rects,
    );
    if (res === undefined) return null;

    for (const [id, rect] of rects.entries()) {
      droppableRectCache.set(id, adaptNodeRect(id, query, rect, rects));
    }
  }

  return droppableRectCache;
}

function getCustomPointerCoordinates(
  pointerCoordinates: Coordinates,
  iframeRef: RefObject<HTMLIFrameElement>,
  draggedNodeRect?: ClientRect,
) {
  let { x, y } = pointerCoordinates;
  // it seems as if dnd-kit calculates the pointer position based on the context where the drag event started
  const iframe = iframeRef.current;
  if (!iframe) return pointerCoordinates;
  const { left: iframeLeft, top: iframeTop } = iframe.getBoundingClientRect();
  if (!draggedNodeRect) {
    // transform the coordinates to the iframe context if we are creating a new element (dragging started outside the iframe)
    x -= iframeLeft;
    y -= iframeTop;
  } else {
    // if we are dragging an existing element we want to use the upper border of the element for vertical intersection tests
    y = draggedNodeRect.top;
  }

  return { x, y };
}

export const customCollisionFactory =
  (isCreating: boolean, query: CraftQuery, iframeRef: RefObject<HTMLIFrameElement>) =>
  ({ collisionRect, droppableContainers, pointerCoordinates, active }: CollisionFuncType) => {
    if (!active?.id || !pointerCoordinates) return [];

    let draggedNode: Node | null = null;
    if (!isCreating) {
      draggedNode = query.node(active.id.toString()).get();
    }

    const droppableRects = getDroppableRects(query, draggedNode);
    if (!droppableRects) return [];

    const { x: pointerX, y: pointerY } = getCustomPointerCoordinates(
      pointerCoordinates,
      iframeRef,
      isCreating ? undefined : collisionRect,
    );

    const collisions = pointerWithin({
      active,
      collisionRect,
      droppableContainers,
      droppableRects,
      pointerCoordinates: { x: pointerX, y: pointerY },
    });

    return collisions.map((collision) => ({
      ...collision,
      data: { ...collision.data, pointer: { x: pointerX, y: pointerY } },
    }));
  };

export const getNewPositionFactory =
  (query: CraftQuery, mobileView: boolean) =>
  (draggedNode: Node | null, targetNode: Node, position: { x: number; y: number }) => {
    let index = 0;

    // helper function to iterate over all children of a node
    function targetIndexInNode(targetNode: Node, comp: (rect: ClientRect) => boolean) {
      let index = 0;

      targetNode.data.nodes.forEach((childId, i) => {
        const childNodeRect = droppableRectCache.get(childId)!;

        if (childNodeRect && comp(childNodeRect)) index = i + 1;
      });

      return index;
    }

    if (targetNode.data.name === 'Row') {
      const isNewParentRow = !draggedNode || draggedNode.data.parent !== targetNode.id;

      // we are either creating an element or moving to another row
      if (isNewParentRow) {
        if (mobileView) {
          index = targetIndexInNode(
            targetNode,
            (newSiblingRect) => position.y > newSiblingRect.top + newSiblingRect.height / 2,
          );
        } else {
          index = targetIndexInNode(
            targetNode,
            (newSiblingRect) => position.x > newSiblingRect.left + newSiblingRect.width / 2,
          );
        }
      } else {
        // we are sorting the elements in a row
        const draggedNodeParentRow = query.node(draggedNode.data.parent!).get();
        const currentIndex = draggedNodeParentRow.data.nodes.findIndex(
          (id) => id === draggedNode.id,
        );

        if (mobileView) {
          index = targetIndexInNode(targetNode, (siblingRect) => position.y > siblingRect.top);
        } else {
          index = targetIndexInNode(targetNode, (siblingRect) => position.x > siblingRect.left);
          // TODO: this will not work when the columns can have different sizes (which is the reason this is not used for the mobile view)
          if (index > 0) index--;
          const isBefore = currentIndex < index;
          if (isBefore) index++;
        }
      }
    } else {
      // targeting a container => find the last row that is above the "cursor"
      index = targetIndexInNode(targetNode, (rowRect) => position.y > rowRect.top);

      // check if this new position actually changes the visible state of the editor
      if (draggedNode) {
        const draggedNodeParentRow = query.node(draggedNode.data.parent!).get();

        // if the current parent row is already at the target position in the target node
        // and there are also no sibling nodes that the dragged node could be separated from, do nothing
        const parentRowIndexInTargetContainer = targetNode.data.nodes.findIndex(
          (id) => id === draggedNodeParentRow.id,
        );

        if (
          draggedNodeParentRow.data.nodes.length === 1 &&
          parentRowIndexInTargetContainer >= 0 &&
          (parentRowIndexInTargetContainer === index ||
            parentRowIndexInTargetContainer === index - 1)
        ) {
          targetNode = draggedNodeParentRow;
          index = 0;
        }
      }
    }

    return { newParent: targetNode, index };
  };

/**
 * If we target a container when moving or creating an element we actually want to enclose the element inside a row at the target position in the container
 * @param targetContainer the container to create the row in
 * @param index the index in the container at which to create the row
 * @param actionHandler craft js object that allows us to create the row
 * @param query craft js object that provide functionality to access the craft js state (and helper functions)
 * @returns the newly created row node
 */
function createParentRow(
  targetContainer: Node,
  index: number,
  actionHandler: Pick<WithoutPrivateActions, 'addNodeTree'>,
  query: CraftQuery,
) {
  // when moving into a container we need to create a new row that is the actual target of the drop
  actionHandler.addNodeTree(
    query.parseReactElement(<Element is={Row} canvas />).toNodeTree(),
    targetContainer.id,
    index,
  );

  const updatedContainer = query.node(targetContainer.id).get();
  return query.node(updatedContainer.data.nodes[index]).get();
}

export function addNewElement(
  { data }: Active,
  newParent: Node,
  index: number,
  actionHandler: Pick<WithoutPrivateActions, 'addNodeTree'>,
  query: CraftQuery,
) {
  if (newParent.data.name === 'Container') {
    newParent = createParentRow(newParent, index, actionHandler, query);
    index = 0;
  }

  // create the craft js data structure for the element and add it to the editor
  const tree = query.parseReactElement(data.current!.element).toNodeTree();
  actionHandler.addNodeTree(tree, newParent.id, index);
}

export function moveElement(
  dragNode: Node,
  newParent: Node,
  newIndex: number,
  actionHandler: Pick<WithoutPrivateActions, 'addNodeTree' | 'move' | 'delete'>,
  query: CraftQuery,
) {
  const currentParentRow = query.node(dragNode.data.parent!).get();
  const currentIndex = currentParentRow.data.nodes.findIndex((id) => id === dragNode.id);

  // check if the positioning has changed
  if (newParent.id !== currentParentRow.id) {
    if (newParent.data.name === 'Container') {
      newParent = createParentRow(newParent, newIndex, actionHandler, query);
      newIndex = 0;
    }
    // move the node to the new row
    actionHandler.move(dragNode.id, newParent.id, newIndex);
    // if the row we move out of would be empty after the move then remove that row
    if (currentParentRow.data.nodes.length === 1) actionHandler.delete(currentParentRow.id);
    // invalidate the cache
    // TODO: do this in some smarter way (currently the recomputation seems to occasionally run before the changes are applied when done without the timeout)
    setTimeout(clearDroppableRectCache, 50);
  } else {
    if (newIndex !== currentIndex) {
      // reposition inside the same row
      actionHandler.move(dragNode.id, currentParentRow.id, newIndex);
      // invalidate the cache
      // TODO: do this in some smarter way (currently the recomputation seems to occasionally run before the changes are applied when done without the timeout)
      setTimeout(clearDroppableRectCache, 50);
    }
  }
}
