import {
  DndContext,
  DragOverlay,
  MouseSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import React, {
  ReactHTML,
  ClassAttributes,
  HTMLAttributes,
  FC,
  PropsWithChildren,
  ComponentProps,
  useState,
  ReactNode,
} from 'react';
import styles from './processes.module.scss';
import cn from 'classnames';
import { snapCenterToCursor } from '@dnd-kit/modifiers';

export function DraggableElementGenerator<TPropId extends string>(
  element: keyof ReactHTML,
  propId: TPropId,
) {
  type Props = ClassAttributes<HTMLElement> &
    HTMLAttributes<HTMLElement> & {
      [key in TPropId]: string;
    };

  const DraggableElement = (props: Props) => {
    const elementId = props[propId] ?? '';
    const {
      attributes,
      listeners,
      setNodeRef: setDraggableNodeRef,
      isDragging,
    } = useDraggable({
      id: elementId,
    });

    const handleDragStart = React.useCallback(
      (eventname: string) => (event: React.PointerEvent | React.MouseEvent) => {
        if (event.altKey) {
          return; // Disables dragging when alt is pressed
        } else {
          listeners?.[eventname]?.(event);
        }
      },
      [listeners],
    );

    const { setNodeRef: setNodeRefDroppable, over } = useDroppable({
      id: props[propId],
    });

    const className = cn(
      {
        [styles.HoveredByFile]: !isDragging && over?.id === elementId,
        [styles.RowBeingDragged]: isDragging,
      },
      props.className,
    );

    return React.createElement(element, {
      ...props,
      ...attributes,
      ...listeners,
      onPointerDown: handleDragStart('onPointerDown'),
      onMouseDown: handleDragStart('onMouseDown'),
      ref(elementRef) {
        setDraggableNodeRef(elementRef);
        setNodeRefDroppable(elementRef);
      },
      className,
    });
  };

  DraggableElement.displayName = 'DraggableElement';

  return DraggableElement;
}

// ----------------------------------------------

export type DragInfo =
  | { dragging: false }
  | { dragging: true; activeId: string; activeElement: string };

export const DraggableContext: FC<
  PropsWithChildren<{
    onItemDropped: (item: string, droppedOn: string) => void;
    dragOverlay: (item: string) => ReactNode;
    dndContextProps?: ComponentProps<typeof DndContext>;
  }>
> = ({ children, onItemDropped, dragOverlay, dndContextProps }) => {
  const [dragInfo, setDragInfo] = useState<DragInfo>({ dragging: false });

  const dndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const dragEndHanler: ComponentProps<typeof DndContext>['onDragEnd'] = (e) => {
    setDragInfo({ dragging: false });
    const droppedOn = e.over?.id;
    const item = e.active.id;

    if (!droppedOn || item === droppedOn) return;

    onItemDropped(item as string, droppedOn as string);
  };

  const dragStartHandler: ComponentProps<typeof DndContext>['onDragEnd'] = (e) => {
    // if (selectedRowKeys.length > 0 && !selectedRowKeys.includes(e.active.id as string))
    //   setSelectedRowElements([]);

    setDragInfo({
      dragging: true,
      activeId: e.active.id as string,
      activeElement: e.active.id as string,
    });
  };

  return (
    <DndContext
      // Without an id Next throws a id mismatch
      onDragEnd={dragEndHanler}
      onDragStart={dragStartHandler}
      {...dndContextProps}
      sensors={dndSensors}
      id="processes-dnd-context"
      modifiers={[snapCenterToCursor]}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {dragInfo.dragging ? dragOverlay(dragInfo.activeId) : null}
      </DragOverlay>
    </DndContext>
  );
};
