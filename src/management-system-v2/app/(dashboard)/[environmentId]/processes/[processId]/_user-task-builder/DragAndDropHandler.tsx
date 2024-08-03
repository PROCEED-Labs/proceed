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
  MeasuringFrequency,
  MeasuringStrategy,
  MeasuringConfiguration,
  getClientRect,
} from '@dnd-kit/core';
import { Active, DroppableContainer, RectMap } from '@dnd-kit/core/dist/store';
import { SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Coordinates } from '@dnd-kit/utilities';
import { useCallback, useState } from 'react';
import Row from './Row';
import { createPortal } from 'react-dom';
import useBuilderStateStore from './use-builder-state-store';

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
};

// handler for the drag and drop handling of existing editor elements
const EditorDnDHandler: React.FC<EditorDnDHandlerProps> = ({ iframeRef, children, disabled }) => {
  const { query, actions } = useEditor();
  const [active, setActive] = useState('');

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
      if (!active?.id || !pointerCoordinates) return [];

      const iframe = iframeRef.current;

      let { x: pointerX, y: pointerY } = pointerCoordinates;

      // if we are creating a new element we fall back to collision detection using the cursor
      if (/^create-.*-button$/.test(active.id.toString())) {
        // it seems as if dnd-kit calculates the pointer position based on where the drag event started
        if (!iframe) return [];
        const { left: iframeLeft, top: iframeTop } = iframe.getBoundingClientRect();
        // transform the coordinates to the iframe context
        pointerX -= iframeLeft;
        pointerY -= iframeTop;

        const res = pointerWithin({
          active,
          collisionRect,
          droppableContainers,
          droppableRects,
          pointerCoordinates: { x: pointerX, y: pointerY },
        });
        return res.map((collision) => {
          (collision.data as any).cursor = { x: pointerX, y: pointerY };
          return collision;
        });
      }

      for (const droppableContainer of droppableContainers) {
        const { id } = droppableContainer;
        const droppableNode = query.node(id.toString()).get();
        const rect = droppableNode.dom?.getBoundingClientRect();

        if (!rect) continue;

        // early exit when an element is being checked against one of its children or itself
        let dropNodeAncestor: Node | undefined = undefined;
        if (droppableNode.data.parent)
          dropNodeAncestor = query.node(droppableNode.data.parent).get();

        // dragging should not affect containers and the content of containers that the mouse is not inside of
        // (with a small boundary inside the element that is also considered to be outside)
        if (droppableNode.data.name === 'Container') {
          const leaveBoundarySize = droppableNode.id === ROOT_NODE ? 0 : 20;
          if (pointerX < rect.left + leaveBoundarySize || pointerX > rect.right - leaveBoundarySize)
            continue;
        } else if (dropNodeAncestor) {
          const ancestorContainer = query.node(dropNodeAncestor.data.parent!).get();
          const ancestorContainerRect = ancestorContainer.dom?.getBoundingClientRect();
          console.log(pointerX, ancestorContainerRect);
          if (
            ancestorContainerRect &&
            (pointerX < ancestorContainerRect.left + 20 ||
              pointerX > ancestorContainerRect.right - 20)
          ) {
            continue;
          }
        }

        const draggedNode = query.node(active.id.toString()).get();

        let draggedIntoItself = false;
        while (dropNodeAncestor) {
          if (dropNodeAncestor.id === draggedNode.id) {
            draggedIntoItself = true;
            break;
          }

          if (dropNodeAncestor.data.parent)
            dropNodeAncestor = query.node(dropNodeAncestor.data.parent).get();
          else dropNodeAncestor = undefined;
        }
        if (draggedIntoItself) continue;

        if (rect) {
          let offset = 0;

          if (draggedNode?.dom) {
            const activeRect = draggedNode.dom.getBoundingClientRect();

            offset = getTargetOffsetAfterMove(
              active.id.toString(),
              id.toString(),
              collisionRect,
              activeRect,
              rect,
            );
          }

          if (collisionRect.top > rect.top - offset) {
            collisions.push({
              id,
              data: {
                droppableContainer,
                value: collisionRect.top - rect.top,
                cursor: { x: pointerX, y: pointerY },
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

        if (aRect && bRect) {
          // tiebreak through smaller mouse pointer distance from both rects

          let aPointerDist: number;
          let bPointerDist: number;

          if (pointerX > aRect.left && pointerX < aRect.right) aPointerDist = 0;
          else
            aPointerDist = Math.min(
              Math.abs(pointerX - aRect.left),
              Math.abs(pointerX - aRect.right),
            );

          if (pointerX > bRect.left && pointerX < bRect.right) bPointerDist = 0;
          else
            bPointerDist = Math.min(
              Math.abs(pointerX - bRect.left),
              Math.abs(pointerX - bRect.right),
            );

          return aPointerDist - bPointerDist;
        }

        return 0;
      });
    },
    [query],
  );

  const isCreating = /^create-.*-button$/.test(active);

  if (disabled) return <>{children}</>;

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
        setActive(event.active.id.toString());
        if (isCreating) iframeRef.current!.style.pointerEvents = 'none';
      }}
      onDragEnd={(event) => {
        const { active, over } = event;
        if (isCreating) iframeRef.current!.style.pointerEvents = '';
        setActive('');

        if (!over) return;

        if (/^create-.*-button$/.test(active.id.toString())) {
          if (event.active.data.current) {
            const tree = query.parseReactElement(event.active.data.current.element).toNodeTree();

            const overNode = query.node(over.id.toString()).get();
            let targetParent = overNode;
            let targetIndex = 0;

            const { x, y } = (event.collisions![0].data as any).cursor as { x: number; y: number };

            if (targetParent.data.name === 'Column') {
              targetParent = query.node(overNode.data.parent!).get();

              const overIndexInRow = targetParent.data.nodes.findIndex((id) => id === overNode.id);
              const overRect = overNode.dom?.getBoundingClientRect();
              if (!overRect) return;

              const behind = x > overRect.left + overRect.width / 2;
              targetIndex = overIndexInRow + (behind ? 1 : 0);
            } else {
              for (let childId of overNode.data.nodes) {
                const childNode = query.node(childId).get();
                const childRect = childNode.dom?.getBoundingClientRect();
                if (childRect && y < childRect.top) {
                  break;
                }

                ++targetIndex;
              }

              actions.addNodeTree(
                query.parseReactElement(<Element is={Row} canvas />).toNodeTree(),
                targetParent.id,
                targetIndex,
              );
              const updatedContainer = query.node(overNode.id).get();
              targetParent = query.node(updatedContainer.data.nodes[targetIndex]).get();
              targetIndex = 0;
            }

            actions.addNodeTree(tree, targetParent.id, targetIndex);
          }

          return;
        }
      }}
      onDragMove={(event) => {
        const { active, over } = event;

        if (!over || !event.collisions?.length) return;

        if (/^create-.*-button$/.test(active.id.toString())) return;

        const dragNode = query.node(active.id.toString()).get();
        const overNode = query.node(over.id.toString()).get();
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
          }
        } else {
          // we are targeting a column (either the one we are dragging or some other one)

          const cursor = (event.collisions![0].data as any).cursor as { x: number; y: number };
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
            } else {
              // we are moving to another row
              const moveBehind = cursor.y > over.rect.left + over.rect.width / 2;
              newParent = overParentRow;
              newIndex = overIndex + (moveBehind ? 1 : 0);
            }
          }
        }

        // check if the positioning has changed
        if (newParent.id !== currentParentRow.id) {
          if (newParent.data.name === 'Container') {
            actions.addNodeTree(
              query.parseReactElement(<Element is={Row} canvas />).toNodeTree(),
              newParent.id,
              newIndex,
            );
            const updatedContainer = query.node(newParent.id).get();
            newParent = query.node(updatedContainer.data.nodes[newIndex]).get();
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
      {!!active &&
        (isCreating ? overlay : createPortal(overlay, iframeRef.current?.contentDocument!.body!))}
    </DndContext>
  );
};

export default EditorDnDHandler;
