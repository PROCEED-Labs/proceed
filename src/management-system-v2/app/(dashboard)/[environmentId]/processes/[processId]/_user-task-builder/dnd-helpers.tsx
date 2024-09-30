import { Node, ROOT_NODE, QueryMethods, WithoutPrivateActions, Element } from '@craftjs/core';
import { pointerWithin, ClientRect, getClientRect } from '@dnd-kit/core';
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

let nodeRectCache: Map<string, ClientRect> | null = null;

export const clearNodeRectCache = () => {
  nodeRectCache = null;
};

function getColumnRect(node: Node) {
  if (!node.dom) return;
  const rect = getClientRect(node.dom);

  return rect;
}

function getRowRect(query: CraftQuery, node: Node) {
  if (!node.dom) return;
  const rect = getClientRect(node.dom);

  // treat rows as if they extend to their parents (container) border horizontally
  if (node.data.parent) {
    const parentContainer = query.node(node.data.parent!).get();
    const parentContainerRect = parentContainer.dom?.getBoundingClientRect();
    if (parentContainerRect) {
      rect.left = parentContainerRect.left;
      rect.right = parentContainerRect.right;
      rect.width = parentContainerRect.width;
    }
  }

  return rect;
}

function getContainerRect(query: CraftQuery, node: Node) {
  if (!node.dom) return;
  const rect = getClientRect(node.dom);

  if (node.id !== ROOT_NODE) {
    // if the node is a container we want to ensure that it is targeted instead of its parent container and row when an item is dragged inside
    if (node.data.parent) {
      const parentColumn = query.node(node.data.parent).get();
      const parentColumnRect = parentColumn.dom?.getBoundingClientRect();
      const parentRow = query.node(parentColumn.data.parent!).get();
      const parentRowRect = parentRow.dom?.getBoundingClientRect();

      if (parentRowRect && parentColumnRect) {
        rect.top = parentRowRect.top;
        rect.bottom = parentRowRect.bottom;
        rect.height = parentRowRect.height;
        rect.left = parentColumnRect.left;
        rect.right = parentColumnRect.right;
      }
    }
  }

  return rect;
}

/**
 *  Returns the bounds of a node transformed to the requirements of our drag and drop logic
 *
 * @param query craft js query methods
 * @param node the node for which we try to get bounds
 * @returns the bounds of the node
 */
function getNodeRect(query: CraftQuery, node: Node) {
  // fallback for when we cannot get bounds for some reason (missing dom element in craft for example)
  let rect: ClientRect = { top: 0, bottom: 0, left: 0, right: 0, height: 0, width: 0 };
  if (node.data.name === 'Column') rect = getColumnRect(node) || rect;
  if (node.data.name === 'Row') rect = getRowRect(query, node) || rect;
  if (node.data.name === 'Container') rect = getContainerRect(query, node) || rect;

  return rect;
}

function getDroppableRects(query: CraftQuery, droppableIds: string[], draggedNode: Node | null) {
  if (droppableIds.some((id) => !nodeRectCache?.has(id))) {
    clearNodeRectCache();
    const droppableRects = new Map<string, ClientRect>();
    for (const id of droppableIds) {
      // writing our own bounding box calculation that uses the correct offsets when moving elements and caching it so the values are only recomputed when necessary
      const dropNodeId = id.toString();
      const dropNode = query.node(dropNodeId).get();
      let dropNodeDom = dropNode?.dom;
      // we need to wait until the node is available throught craft js and the dom element is available as well
      if (!dropNodeDom) return null;

      if (draggedNode) {
        // block elements inside the dragged element from becoming drop targets
        if (isNested(query, draggedNode.id, dropNode)) continue;
      }

      let rect = getNodeRect(query, dropNode);

      if (!rect) return null;

      // when we are dragging an element calculate the bounding boxes as they would be without the dragged element
      if (draggedNode) {
        if (!draggedNode) return null;
        const draggedNodeRect = draggedNode.dom?.getBoundingClientRect();

        if (draggedNodeRect) {
          let offset = getTargetOffsetAfterMove(
            query,
            draggedNode.id,
            dropNodeId,
            draggedNodeRect,
            rect,
          );

          rect = {
            ...rect,
            height: rect.height - offset.bottom,
            top: rect.top - offset.top,
            bottom: rect.bottom - offset.bottom,
          };
        }
      }
      droppableRects.set(dropNodeId, rect);
      nodeRectCache = droppableRects;
    }
  }

  return nodeRectCache;
}

function isNested(query: CraftQuery, potentialContainerId: string, potentiallyNested: Node) {
  let ancestor = potentiallyNested;
  while (ancestor.data.parent) {
    if (ancestor.data.parent === potentialContainerId) {
      return true;
    }
    ancestor = query.node(ancestor.data.parent).get();
  }
}

/**
 * This function is used to calculate the most likely changes to a target elements bounding box if the dragged element would be removed from its current position
 */
const getTargetOffsetAfterMove = (
  query: CraftQuery,
  draggedNodeId: string,
  targetNodeId: string,
  draggedNodeRect: ClientRect,
  targetNodeRect: ClientRect,
) => {
  const offset = { top: 0, bottom: 0 };

  // the root node should be unaffected by the node being moved
  if (targetNodeId === ROOT_NODE) return offset;

  // if the target element ends above the current position of the dragged element it should not be affected by the element being removed from its current position
  if (targetNodeRect.bottom <= draggedNodeRect.top) return offset;

  const draggedNode = query.node(draggedNodeId).get();
  const targetNode = query.node(targetNodeId).get();

  // get the ancestry path from the element to the root
  let ancestors = [];
  let curr: Node | undefined = draggedNode;
  while (curr) {
    ancestors.push(curr);

    if (curr.data.parent) {
      curr = query.node(curr.data.parent).get();
    } else curr = undefined;
  }

  if (targetNode.data.parent) curr = query.node(targetNode.data.parent).get();
  let shrinkNodeIndex = 0;
  while (curr) {
    const indexInAncestors = ancestors.findIndex((ancestor) => ancestor.id === curr!.id);
    if (indexInAncestors > -1) {
      // we want the first container of the dragged node that also is a sibling of the target node since that should be the one affecting the target node on shrink
      // this might be the target node itself if it contains the dragged node
      shrinkNodeIndex = indexInAncestors - 1;
      break;
    }

    if (curr.data.parent) {
      curr = query.node(curr.data.parent).get();
    } else curr = undefined;
  }

  // we calculate the amount the previously found node will shrink when the dragged node is being removed
  let shrinkAmount = 0;
  for (let i = 0; i < shrinkNodeIndex; ++i) {
    const shrinkNode = ancestors[i];

    // find the sibling of the node that might shrink that has the biggest height
    let highestSiblingHeight = 0;
    const shrinkNodeParent = query.node(shrinkNode.data.parent!).get();
    shrinkNodeParent.data.nodes
      .map((id) => query.node(id).get())
      .forEach((sibling) => {
        if (sibling.id !== shrinkNode.id) {
          if (sibling.dom) {
            const { height, top: sTop } = sibling.dom.getBoundingClientRect();
            if (sTop === draggedNodeRect.top && highestSiblingHeight < height)
              highestSiblingHeight = height;
          }
        }
      });

    if (!shrinkNode.dom) return offset;

    // if one of the siblings is higher than the node then removing/shrinking the node is inconsequential for nodes that follow vertically or for any containing elements
    if (shrinkNode.dom.getBoundingClientRect().height < highestSiblingHeight) return offset;

    if (shrinkNode.id === draggedNode.id)
      // for the content of the node containing our dragged node we can shrink to the size of the largest sibling
      shrinkAmount = draggedNodeRect.height - highestSiblingHeight;
    // for all nodes containing the dragged node we can only shrink as mush as we did in the contained or less if there is a sibling with less of a height difference
    else
      shrinkAmount = Math.min(
        shrinkAmount,
        shrinkNode.dom.getBoundingClientRect().height - highestSiblingHeight,
      );

    if (!shrinkAmount) break;
  }

  // if we are looking at a container that wraps the element the offset only affects the bottom border
  offset.bottom = shrinkAmount;

  if (targetNodeRect.top > draggedNodeRect.top) {
    // otherwise the offset also affects the elements upper border
    offset.top = shrinkAmount;
  }

  return offset;
};

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

    const droppableRects = getDroppableRects(
      query,
      droppableContainers.map(({ id }) => id.toString()),
      draggedNode,
    );
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
        const childNode = query.node(childId).get();
        const childNodeRect = childNode.dom?.getBoundingClientRect();

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
    setTimeout(clearNodeRectCache, 50);
  } else {
    if (newIndex !== currentIndex) {
      // reposition inside the same row
      actionHandler.move(dragNode.id, currentParentRow.id, newIndex);
      // invalidate the cache
      // TODO: do this in some smarter way (currently the recomputation seems to occasionally run before the changes are applied when done without the timeout)
      setTimeout(clearNodeRectCache, 50);
    }
  }
}
