import { useEditor, Node, ROOT_NODE, Element } from '@craftjs/core';
import {
  DndContext,
  closestCenter,
  closestCorners,
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
import { SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Coordinates } from '@dnd-kit/utilities';
import { useCallback, useState } from 'react';
import Row from './Row';

type CollisionFuncType = {
  collisionRect: ClientRect;
  droppableRects: RectMap;
  droppableContainers: DroppableContainer[];
  pointerCoordinates: Coordinates | null;
  active: Active | null;
};

// handler for the drag and drop handling of existing editor elements
const DragAndDropHandler: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { query, actions } = useEditor();
  const [active, setActive] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const getTargetOffsetAfterMove = useCallback(
    (
      draggedNodeId: string,
      targetNodeId: string,
      dragShadowRect: ClientRect,
      draggedNodeRect: ClientRect,
      targetNodeRect: ClientRect,
    ) => {
      // if we move up following elements should not be affected
      if (dragShadowRect.top < draggedNodeRect.top) return 0;

      // if the target element is above the current position of the dragged element moving the dragged element down should not change the current targets position vertically
      if (targetNodeRect.top <= draggedNodeRect.top) return 0;

      const draggedNode = query.node(draggedNodeId).get();

      // get all elements from the element itself to the root
      let ancestors = [];
      let curr: Node | undefined = draggedNode;
      while (curr) {
        ancestors.push(curr);

        if (curr.data.parent) {
          curr = query.node(curr.data.parent).get();
        } else curr = undefined;
      }

      const targetNode = query.node(targetNodeId).get();
      if (targetNode.data.parent) curr = query.node(targetNode.data.parent).get();
      // we try to find the first child in the common ancestor that contains the dragged node and which might shrink due to the dragged node being removed
      let shrinkNodeIndex = 0;
      while (curr) {
        const indexInAncestors = ancestors.findIndex((ancestor) => ancestor.id === curr!.id);

        if (indexInAncestors > -1) {
          // we want the first non common ancestor of the dragged node since that should be the on affecting the target node on shrink
          shrinkNodeIndex = indexInAncestors - 1;
          break;
        }

        if (curr.data.parent) {
          curr = query.node(curr.data.parent).get();
        } else curr = undefined;
      }

      let offset = 0;
      for (let i = 0; i < shrinkNodeIndex; ++i) {
        const shrinkNode = ancestors[i];
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

        if (!shrinkNode.dom) return 0;

        // if one of the sibling is higher than the node then removing/shrinking the node is inconsequential for nodes that follow vertically
        if (shrinkNode.dom.getBoundingClientRect().height < highestSiblingHeight) return 0;

        if (shrinkNode.id === draggedNode.id)
          offset =
            draggedNodeRect.height > highestSiblingHeight
              ? draggedNodeRect.height - highestSiblingHeight
              : 0;
        else
          offset = Math.min(
            offset,
            shrinkNode.dom.getBoundingClientRect().height - highestSiblingHeight,
          );

        if (!offset) break;
      }

      return offset;
    },
    [query],
  );

  const customCollision = useCallback(
    ({
      collisionRect,
      droppableRects,
      droppableContainers,
      pointerCoordinates,
      active,
    }: CollisionFuncType) => {
      const collisions: Collision[] = [];
      if (!active || !pointerCoordinates) return [];

      for (const droppableContainer of droppableContainers) {
        const { id } = droppableContainer;
        const rect = droppableRects.get(id);

        if (!rect) continue;

        // early exit when an element is being checked against one of its children or itself
        const droppableNode = query.node(id.toString()).get();
        let ancestor: Node | undefined = undefined;
        if (droppableNode.data.parent) ancestor = query.node(droppableNode.data.parent).get();

        // dragging should not affect containers and the content of containers that the mouse is not inside of
        if (droppableNode.data.name === 'Container') {
          if (pointerCoordinates.x < rect.left || pointerCoordinates.x > rect.right) continue;
        } else if (ancestor) {
          const ancestorContainer = query.node(ancestor.data.parent!).get();
          const ancestorContainerRect = ancestorContainer.dom?.getBoundingClientRect();
          console.log(pointerCoordinates.x, ancestorContainerRect);
          if (
            ancestorContainerRect &&
            (pointerCoordinates.x < ancestorContainerRect.left ||
              pointerCoordinates.x > ancestorContainerRect.right)
          )
            continue;
        }

        let draggedIntoItself = false;
        while (ancestor) {
          if (ancestor.id === active.id.toString()) {
            draggedIntoItself = true;
            break;
          }

          if (ancestor.data.parent) ancestor = query.node(ancestor.data.parent).get();
          else ancestor = undefined;
        }
        if (draggedIntoItself) continue;

        const activeNode = query.node(active.id.toString()).get();
        if (rect && pointerCoordinates && activeNode.dom) {
          const activeRect = activeNode.dom.getBoundingClientRect();

          const offset = getTargetOffsetAfterMove(
            active.id.toString(),
            id.toString(),
            collisionRect,
            activeRect,
            rect,
          );

          if (collisionRect.top > rect.top - offset) {
            collisions.push({
              id,
              data: {
                droppableContainer,
                value: collisionRect.top - rect.top,
                cursor: pointerCoordinates,
              },
            });
          }
        }
      }

      return collisions.sort((a, b) => {
        const diff = a.data!.value - b.data!.value;

        if (diff) return diff;
        // we could place into elements that are next to each other and have the same top value
        const aRect = droppableRects.get(a.id);
        const bRect = droppableRects.get(b.id);
        const iframeEl = document.getElementById('user-task-builder-iframe');
        if (iframeEl && pointerCoordinates && aRect && bRect) {
          // tiebreak through smaller mouse pointer distance from both rects

          let aPointerDist: number;
          let bPointerDist: number;

          let { x } = pointerCoordinates;

          if (x > aRect.left && x < aRect.right) aPointerDist = 0;
          else aPointerDist = Math.min(Math.abs(x - aRect.left), Math.abs(x - aRect.right));

          if (x > bRect.left && x < bRect.right) bPointerDist = 0;
          else bPointerDist = Math.min(Math.abs(x - bRect.left), Math.abs(x - bRect.right));

          return aPointerDist - bPointerDist;
        }

        return 0;
      });
    },
    [query],
  );

  return (
    <DndContext
      collisionDetection={customCollision}
      sensors={sensors}
      onDragStart={() => setActive(true)}
      onDragEnd={() => setActive(false)}
      onDragMove={(event) => {
        const { active, over } = event;

        if (!over || !event.collisions?.length) return;

        const overNode = query.node(over.id.toString()).get();
        const dragNode = query.node(active.id.toString()).get();
        const currentParentRow = query.node(dragNode.data.parent!).get();
        const currentIndex = currentParentRow.data.nodes.findIndex((id) => id === dragNode.id);

        let newParent = currentParentRow;
        let newIndex = currentParentRow.data.nodes.findIndex((id) => id === dragNode.id);

        // we are dragging a node to the first position in a container (otherwise another node would be returned by our collision detection)
        if (overNode.data.name === 'Container') {
          // we should allow dragging if the dragged element is not currently in the first row in the container or if there are multiple elements in the row

          if (
            overNode.data.nodes.findIndex((id) => id === currentParentRow.id) ||
            currentParentRow.data.nodes.length > 1
          ) {
            newParent = overNode;
            newIndex = 0;
            // actions.addNodeTree(
            //   query.parseReactElement(<Element is={Row} canvas />).toNodeTree(),
            //   over.id.toString(),
            //   0,
            // );
            // const newNode = query.node(query.node(over.id.toString()).get().data.nodes[0]).get();
            // actions.move(dragNode.id, newNode.id, 0);
            // if (currentParentRow.data.nodes.length === 1) actions.delete(currentParentRow.id);
          }
        } else {
          // we are targeting a column (either the one we are dragging or some other one)

          const cursor = event.collisions![0].data.cursor as { x: number; y: number };
          const overParentRow = query.node(overNode.data.parent!).get();
          if (active.id === over.id) {
            // we are targeting the dragged node
            const overParentRowBottom = overParentRow.dom?.getBoundingClientRect().bottom;
            const activeRect = active.rect.current.initial;
            const grandparentContainer = query.node(currentParentRow.data.parent!).get();
            const parentRowRect = currentParentRow.dom?.getBoundingClientRect();

            if (overParentRowBottom && activeRect && overParentRowBottom < activeRect.top) {
              // the top of the drag shadow is still below of the bottom border of the targeted column
              const targetIndex =
                grandparentContainer.data.nodes.findIndex((id) => id === overParentRow.id) + 1;

              if (
                overParentRow.data.parent !== grandparentContainer.id ||
                currentParentRow.data.nodes.length > 1
              ) {
                // we should move the dragged column below the targeted columns parent row since we are moving out of some container or because we want to move it to its own row
                newParent = grandparentContainer;
                newIndex = targetIndex;
              }
            } else if (parentRowRect && grandparentContainer.id !== ROOT_NODE) {
              //check if we might want to drage the node besides its current container element (not possible if the container is the root node)
              const containerParentColumn = query.node(grandparentContainer.data.parent!).get();
              const containerParentRow = query.node(containerParentColumn.data.parent!).get();
              const containerIndexInRow = containerParentRow.data.nodes.findIndex(
                (id) => id === containerParentColumn.id,
              );
              const { x } = cursor;

              if (x - parentRowRect.left < 20) {
                newParent = containerParentRow;
                newIndex = containerIndexInRow;
                // actions.move(dragNode.id, containerParentRow.id, containerIndexInRow);
                // if (currentParentRow.data.nodes.length === 1) actions.delete(currentParentRow.id);
              } else if (parentRowRect.right - x < 20) {
                newParent = containerParentRow;
                newIndex = containerIndexInRow + 1;
                // actions.move(dragNode.id, containerParentRow.id, containerIndexInRow + 1);
                // if (currentParentRow.data.nodes.length === 1) actions.delete(currentParentRow.id);
              }
            }
          } else {
            // we are targeting another column so we are moving into another row or inside the current row
            const currentIndex = currentParentRow.data.nodes.findIndex(
              (id) => active.id.toString() === id,
            );
            const overIndex = overParentRow.data.nodes.findIndex((id) => id === overNode.id);

            if (currentParentRow.id === overParentRow.id) {
              // we are moving inside the same row
              const isBefore = currentIndex < overIndex;
              newIndex = overIndex + (isBefore ? 1 : 0);
              // actions.move(dragNode.id, overParentRow.id, overIndex + (isBefore ? 1 : 0));
            } else {
              // we are moving to another row
              const moveBehind = cursor.y > over.rect.left + over.rect.width / 2;
              newParent = overParentRow;
              newIndex = overIndex + (moveBehind ? 1 : 0);

              // actions.move(dragNode.id, overParentRow.id, overIndex + (moveBehind ? 1 : 0));
              // if (currentParentRow.data.nodes.length === 1) actions.delete(currentParentRow.id);
            }
          }
        }
        // console.log(dragNode, newParent, currentParentRow, newIndex, currentIndex);

        // check if the positioning has changed
        if (newParent.id !== currentParentRow.id) {
          if (newParent.data.name === 'Container') {
            actions.addNodeTree(
              query.parseReactElement(<Element is={Row} canvas />).toNodeTree(),
              newParent.id,
              0,
            );
            newParent = query.node(query.node(over.id.toString()).get().data.nodes[0]).get();
            newIndex = 0;
          }
          actions.move(dragNode.id, newParent.id, newIndex);

          if (currentParentRow.data.nodes.length === 1) actions.delete(currentParentRow.id);
        } else {
          if (newIndex !== currentIndex) {
            actions.move(dragNode.id, currentParentRow.id, newIndex);
          }
        }
      }}
    >
      {children}
      <DragOverlay>
        {active ? (
          <div
            id="dnd-drag-overlay"
            style={{ overflow: 'visible', backgroundColor: 'white' }}
          ></div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default DragAndDropHandler;
