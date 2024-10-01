import { useEditor } from '@craftjs/core';
import { DndContext, useSensor, useSensors, PointerSensor, DragOverlay } from '@dnd-kit/core';
import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  customCollisionFactory,
  getNewPositionFactory,
  clearDroppableRectCache,
  addNewElement,
  moveElement,
} from './dnd-helpers';

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

  const pointerPosition = useRef({ x: 0, y: 0 });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }));

  const isCreating = /^create-.*-button$/.test(active);

  const customCollision = useCallback(customCollisionFactory(isCreating, query, iframeRef), [
    query,
    isCreating,
  ]);

  const getNewPosition = useCallback(getNewPositionFactory(query, mobileView), [mobileView]);

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
      measuring={{
        droppable: {
          measure: () => {
            // deactivating the default measuring since it sometimes runs before the required data is ready in craft js
            return { top: 0, bottom: 0, left: 0, right: 0, height: 0, width: 0 };
          },
        },
      }}
      onDragStart={(event) => {
        clearDroppableRectCache();
        needNewHistoryBundle.current = true;
        setActive(event.active.id.toString());
        const isCreating = /^create-.*-button$/.test(event.active.id.toString());
        if (isCreating && iframeRef.current) {
          iframeRef.current.style.pointerEvents = 'none';
        }
      }}
      onDragCancel={() => {
        if (isCreating && iframeRef.current?.contentDocument?.body)
          iframeRef.current.style.pointerEvents = '';
        setActive('');
      }}
      onDragEnd={(event) => {
        const { active, collisions } = event;
        if (isCreating && iframeRef.current?.contentDocument?.body)
          iframeRef.current.style.pointerEvents = '';
        else return;
        setActive('');

        if (!active.data.current || !collisions?.length || !collisions[0].data) return;

        const [collision] = collisions;
        const { data } = collision;
        if (!data) return;

        const pointer = data.pointer as { x: number; y: number };

        const dropNodeId = collision.id.toString();
        let dropNode = query.node(dropNodeId).get();

        if (!dropNode) return;

        let { newParent, index } = getNewPosition(null, dropNode, pointer);

        addNewElement(active, newParent, index, getActionHandler(), query);
      }}
      onDragMove={(event) => {
        const { active, over, collisions } = event;

        if (isCreating || !over || !collisions?.length) return;

        const [collision] = collisions;
        const { data } = collision;
        if (!data) return;

        const pointer = data.pointer as { x: number; y: number };

        const delta = {
          x: pointer.x - pointerPosition.current.x,
          y: pointer.y - pointerPosition.current.y,
        };
        pointerPosition.current = pointer;

        const dragNode = query.node(active.id.toString()).get();
        const overNode = query.node(over.id.toString()).get();
        if (!overNode || !dragNode) return;

        let { newParent, index: newIndex } = getNewPosition(dragNode, overNode, pointer);

        // prevent that an element is moved opposite to the direction it is dragged in
        // this fixes a situation where an element is dragged out of or into a container element (row/container)
        // resulting in a resize which would then reposition the element back in/out of the containing element
        // which will then oscillate between the two states until the element is in a position that puts it clearly inside or outside event after the resize
        const dragNodeRect = dragNode.dom?.getBoundingClientRect();
        if (dragNodeRect) {
          let { top } = dragNodeRect;
          let offset = 0;

          const newParentRect = newParent.dom?.getBoundingClientRect();
          if (newParentRect) {
            if (newParent.data.name === 'Row') {
              offset = newParentRect.top - top;
            } else {
              // targeting a container
              if (!newParent.data.nodes.length) {
                offset = newParentRect.top - top;
              } else if (newParent.data.nodes.length > newIndex) {
                const rowAtPosition = query.node(newParent.data.nodes[newIndex]).get();
                const rowRect = rowAtPosition.dom?.getBoundingClientRect();
                if (rowRect) {
                  offset = rowRect.top - top;
                }
              } else {
                offset = newParentRect.bottom - top;
              }
            }

            if (!(delta.y * offset >= 0)) return;
          }
        }

        moveElement(dragNode, newParent, newIndex, getActionHandler(), query);
      }}
    >
      {children}
      {!!active &&
        (isCreating ? overlay : createPortal(overlay, iframeRef.current?.contentDocument!.body!))}
    </DndContext>
  );
};

export default EditorDnDHandler;
