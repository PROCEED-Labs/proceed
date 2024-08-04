import { useEditor, Node, ROOT_NODE, Element } from '@craftjs/core';
import {
  DndContext,
  pointerWithin,
  useSensor,
  useSensors,
  KeyboardSensor,
  PointerSensor,
  DragOverlay,
  ClientRect,
  Collision,
} from '@dnd-kit/core';
import { Active, DroppableContainer, RectMap } from '@dnd-kit/core/dist/store';
import { Coordinates } from '@dnd-kit/utilities';
import { useCallback, useRef, useState } from 'react';
import Row from './Row';
import { createPortal } from 'react-dom';

type CollisionFuncType = {
  collisionRect: ClientRect;
  droppableRects: RectMap;
  droppableContainers: DroppableContainer[];
  pointerCoordinates: Coordinates | null;
  active: Active | null;
};

type EditorDnDHandlerProps = React.PropsWithChildren & {
  disabled: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  mobileView: boolean;
};

// handler for the drag and drop handling of existing editor elements
const EditorDnDHandler: React.FC<EditorDnDHandlerProps> = ({
  iframeRef,
  children,
  disabled,
  mobileView,
}) => {
  const { query, actions } = useEditor();
  const [active, setActive] = useState('');
  // craft js allows us to bundle multiple events together so when we do undo after dragging with
  // multiple repositions we return to the initial position
  const needNewHistoryBundle = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 50, tolerance: 10 } }),
    useSensor(KeyboardSensor),
  );

  /**
   * This function is used to calculate the most likely changes to a target elements bounding box if the dragged element would be removed from its current position
   */
  const getTargetOffsetAfterMove = useCallback(
    (
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
          // we want the first container of the dragged node that also is a sibling of the target node since that should be the on affecting the target node on shrink
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
    },
    [query],
  );

  const isCreating = /^create-.*-button$/.test(active);

  const customCollision = useCallback(
    ({
      collisionRect,
      droppableRects,
      droppableContainers,
      pointerCoordinates,
      active,
    }: CollisionFuncType) => {
      let collisions: Collision[] = [];
      if (!active?.id || !pointerCoordinates) return [];

      let draggedNode: Node | null = null;
      if (!isCreating) {
        draggedNode = query.node(active.id.toString()).get();
      }

      // treat rows as if they extend to their parents border
      droppableRects.forEach((val, key) => {
        const node = query.node(key.toString()).get();
        if (node && node.data.name === 'Row') {
          const parentContainer = query.node(node.data.parent!).get();
          const parentContainerRect = parentContainer.dom?.getBoundingClientRect();
          if (parentContainerRect) {
            droppableRects.set(key, {
              ...val,
              left: parentContainerRect.left,
              right: parentContainerRect.right,
              width: parentContainerRect.width,
            });
          }
        }
      });

      let { x: pointerX, y: pointerY } = pointerCoordinates;
      // it seems as if dnd-kit calculates the pointer position based on the context where the drag event started
      const iframe = iframeRef.current;
      if (!iframe) return [];
      const { left: iframeLeft, top: iframeTop } = iframe.getBoundingClientRect();
      if (isCreating) {
        // transform the coordinates to the iframe context if we are creating a new element (dragging started outside the iframe)
        pointerX -= iframeLeft;
        pointerY -= iframeTop;

        // we are not moving anything so we can use the current bounding rects
        collisions = pointerWithin({
          active,
          collisionRect,
          droppableContainers,
          droppableRects,
          pointerCoordinates: { x: pointerX, y: pointerY },
        });
      } else {
        // if we are dragging an existing element we want to use the upper border of the element for vertical intersection tests
        pointerY = collisionRect.top;

        if (!draggedNode) return [];

        const draggedNodeRect = draggedNode.dom?.getBoundingClientRect();
        if (!draggedNodeRect) return [];

        // if we are moving upwards we can just use the current bounding rects since we dont interact with vertically following elements or with bottom borders of elements containing the dragged node
        if (collisionRect.top < draggedNodeRect.top) {
          collisions = pointerWithin({
            active,
            collisionRect,
            droppableContainers,
            droppableRects,
            pointerCoordinates: { x: pointerX, y: pointerY },
          });
        } else {
          // otherwise we compute bounding boxes as they would be if the element was removed (or at least shrunk to the size of it smallest sibling)
          // this is to prevent jumps when an element that is substantially larger than its siblings is moved out of its container row
          let offsetRects: typeof droppableRects = new Map();

          droppableRects.forEach((val, key) => {
            const targetId = key.toString();

            const targetNode = query.node(targetId).get();
            if (!targetNode) return;
            const targetNodeRect = targetNode.dom?.getBoundingClientRect();
            if (!targetNodeRect) return;
            let offset = getTargetOffsetAfterMove(
              draggedNode.id,
              targetId,
              draggedNodeRect,
              targetNodeRect,
            );

            const offsetRect = {
              ...val,
              height: val.height - offset.bottom,
              top: val.top - offset.top,
              bottom: val.bottom - offset.bottom,
            };

            offsetRects.set(key, offsetRect);
          });

          collisions = pointerWithin({
            active,
            collisionRect,
            droppableRects: offsetRects,
            droppableContainers,
            pointerCoordinates: { x: pointerX, y: pointerY },
          });
        }
      }

      return collisions.map((collision) => ({
        ...collision,
        data: { ...collision.data, pointer: { x: pointerX, y: pointerY } },
      }));
    },
    [query, isCreating],
  );

  const getNewPosition = useCallback(
    (draggedNode: Node | null, targetNode: Node, position: { x: number; y: number }) => {
      let index = 0;

      // helper function to iterate over all chilren of a node
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
      }

      return { newParent: targetNode, index };
    },
    [mobileView],
  );

  const getActionHandler = useCallback(() => {
    if (needNewHistoryBundle.current) {
      // if this is the first action (element creation/initial position change) create a new entry on the history stack
      needNewHistoryBundle.current = false;
      return actions;
    }

    // ensure that all (position) changes done in a single drag are handled as one by undo and redo
    return actions.history.merge();
  }, []);

  if (disabled) return <>{children}</>;

  // this is the target for the image we see on the cursor when dragging
  const overlay = (
    <DragOverlay>
      {active ? (
        <div
          id="dnd-drag-overlay"
          style={{
            overflow: 'visible',
            backgroundColor: 'white',
            border: !isCreating ? '2px solid lightgrey' : undefined,
          }}
        ></div>
      ) : null}
    </DragOverlay>
  );

  return (
    <DndContext
      collisionDetection={customCollision}
      sensors={sensors}
      onDragStart={(event) => {
        needNewHistoryBundle.current = true;
        setActive(event.active.id.toString());
        if (isCreating) iframeRef.current!.style.pointerEvents = 'none';
      }}
      onDragCancel={() => {
        if (isCreating) iframeRef.current!.style.pointerEvents = '';
        setActive('');
      }}
      onDragEnd={(event) => {
        const { active, collisions } = event;
        if (isCreating) iframeRef.current!.style.pointerEvents = '';
        else return;
        setActive('');

        if (!active.data.current || !collisions?.length) return;

        const [collision] = collisions;
        const { data } = collision;
        if (!data) return;

        const pointer = data.pointer as { x: number; y: number };

        const dropNodeId = collision.id.toString();
        let dropNode = query.node(dropNodeId).get();

        if (!dropNode) return;

        let { newParent, index } = getNewPosition(null, dropNode, pointer);

        if (newParent.data.name === 'Container') {
          // when moving into a container we need to create a new row that is the actual target of drop
          getActionHandler().addNodeTree(
            query.parseReactElement(<Element is={Row} canvas />).toNodeTree(),
            newParent.id,
            index,
          );

          const updatedContainer = query.node(newParent.id).get();
          newParent = query.node(updatedContainer.data.nodes[index]).get();
          index = 0;
        }

        // create the craft js data structure for the element and add it to the editor
        const tree = query.parseReactElement(active.data.current.element).toNodeTree();
        getActionHandler().addNodeTree(tree, newParent.id, index);
      }}
      onDragMove={(event) => {
        const { active, over, collisions } = event;

        if (isCreating || !over || !collisions?.length) return;

        const [collision] = collisions;
        const { data } = collision;
        if (!data) return;

        const pointer = data.pointer as { x: number; y: number };

        const dragNode = query.node(active.id.toString()).get();
        const overNode = query.node(over.id.toString()).get();
        if (!overNode) return;
        const currentParentRow = query.node(dragNode.data.parent!).get();
        const currentIndex = currentParentRow.data.nodes.findIndex((id) => id === dragNode.id);

        let { newParent, index: newIndex } = getNewPosition(dragNode, overNode, pointer);

        // check if the positioning has changed
        if (newParent.id !== currentParentRow.id) {
          if (newParent.data.name === 'Container') {
            // when moving into a container we need to create a new row that is the actual target of move since we require columns to be inside rows
            getActionHandler().addNodeTree(
              query.parseReactElement(<Element is={Row} canvas />).toNodeTree(),
              newParent.id,
              newIndex,
            );
            const updatedContainer = query.node(newParent.id).get();
            newParent = query.node(updatedContainer.data.nodes[newIndex]).get();
            newIndex = 0;
          }

          // move the node to the new row
          getActionHandler().move(dragNode.id, newParent.id, newIndex);
          // if the row we move out of would be empty after the move then remove that row
          if (currentParentRow.data.nodes.length === 1)
            getActionHandler().delete(currentParentRow.id);
        } else {
          if (newIndex !== currentIndex) {
            // reposition inside the same row
            getActionHandler().move(dragNode.id, currentParentRow.id, newIndex);
          }
        }
      }}
    >
      {children}
      {!!active &&
        (isCreating ? overlay : createPortal(overlay, iframeRef.current?.contentDocument!.body!))}
    </DndContext>
  );
};

export default EditorDnDHandler;
