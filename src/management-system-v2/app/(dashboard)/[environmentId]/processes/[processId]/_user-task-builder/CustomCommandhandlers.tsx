import { CreateHandlerOptions, DefaultEventHandlers, NodeId, Node, Element } from '@craftjs/core';

import Row from './Row';

export default class CustomEventhandlers extends DefaultEventHandlers {
  isDragging = false;
  unbindDrag: (() => void) | null = null;
  pointerLockCallback = () => {
    console.log('Hello');
    const document = this.getIframeDocument();

    if (!document) return;

    if (!document.pointerLockElement) {
      console.log('C');
      this.isDragging = false;
      this.dragTarget = null;

      if (this.unbindDrag) {
        this.unbindDrag();
        this.unbindDrag = null;
      }

      if (this.draggedElementShadow) {
        console.log('TEST');
        this.draggedElementShadow.parentNode?.removeChild(this.draggedElementShadow);
        this.draggedElementShadow = null;
      }

      this.options.store.actions.setNodeEvent('dragged', []);
      document.removeEventListener('pointerlockchange', this.pointerLockCallback);
    } else {
      console.log('A');
      this.isDragging = true;

      this.unbindDrag = this.addCraftEventListener(document.body, 'mousemove', (e) => {
        e.craft.stopPropagation();
        e.preventDefault();

        this.computeDragShadow(e);

        const { query, actions } = this.options.store;

        if (false && this.dragTarget.type === 'new') {
          // if the element is dragged in from the toolbox we need to create it
          let nodeTree = this.dragTarget.tree;
          const newElementId = nodeTree.rootNodeId;
          if (indicator.placement.parent.data.name !== 'Row') {
            // if the element is dropped outside of a row we automatically create a row that wraps around it
            const newTree = query.parseReactElement(<Element is={Row} canvas />).toNodeTree();
            Object.values(newTree.nodes)[0].data.nodes = [
              Object.values(this.dragTarget.tree.nodes)[0].id,
            ];
            Object.values(this.dragTarget.tree.nodes)[0].data.parent = Object.values(
              newTree.nodes,
            )[0].id;
            newTree.nodes = {
              ...newTree.nodes,
              ...this.dragTarget.tree.nodes,
            };
            nodeTree = newTree;
          }

          actions.addNodeTree(nodeTree, dropTargetId, index);
          actions.setNodeEvent('dragged', newElementId);

          if (options && typeof options.onCreate === 'function') options.onCreate();

          // update the internal dragTarget (this will basically work as if we had started dragging an existing element)
          this.dragTarget.type = 'existing';
          this.dragTarget.nodes = [newElementId];
          this.dragTarget.tree = null;
        } else {
          const newPosition = this.computeChangedPosition(
            query.node(this.dragTarget.nodes[0]).get(),
          );

          if (!newPosition) return;
          console.log(newPosition);
          let { dropTarget, index } = newPosition;
          const node = query.node(this.dragTarget.nodes[0]).get();

          // prevent dropping an element into itself
          let dropTargetTester = dropTarget;
          while (dropTargetTester && dropTargetTester.id !== 'ROOT') {
            if (dropTargetTester.id === node.id) return;
            dropTargetTester = dropTargetTester.data.parent
              ? query.node(dropTargetTester.data.parent).get()
              : undefined;
          }

          const oldParentId = node.data.parent ? query.node(node.data.parent).get().id : undefined;

          let dropTargetId = dropTarget.id;
          if (dropTarget.data.name !== 'Row') {
            // if the element is dropped outside of a row we automatically create a row that wraps around it
            actions.addNodeTree(
              query.parseReactElement(<Element is={Row} canvas />).toNodeTree(),
              dropTargetId,
              index,
            );
            const newNode = query.node(query.node(dropTargetId).get().data.nodes[index]).get();
            dropTargetId = newNode.id;
            index = 0;
          }

          actions.move(node, dropTargetId, index);

          setTimeout(() => {
            const shadow = this.draggedElementShadow;
            const { top, left, width, height } = query
              .node(this.dragTarget.nodes[0])
              .get()
              .dom!.getBoundingClientRect();
            shadow.style.left = `${left}px`;
            shadow.style.top = `${top}px`;
            shadow.style.width = `${width}px`;
            shadow.style.height = `${height}px`;
          }, 10);

          // the element might leave an empty row which needs to be removed
          if (!oldParentId) return;

          const oldParent = query.node(oldParentId).get();

          if (oldParent?.data.name === 'Row' && !oldParent.data.nodes.length) {
            actions.delete(oldParent.id);
          }
        }
      });
    }
  };
  mouseupCallback = (e: MouseEvent) => {
    e.stopPropagation();

    const document = this.getIframeDocument();

    console.log('B');
    document?.exitPointerLock();
    document?.removeEventListener('mouseup', this.mouseupCallback);
  };

  getIframeDocument() {
    return (document.getElementById('user-task-builder-iframe') as HTMLIFrameElement)
      .contentDocument;
  }

  getNodeFromDom(el: HTMLElement) {
    return (Object.values(this.options.store.query.getNodes()) as Node[]).find(
      (node) => node.dom === el,
    );
  }

  computeDragShadow(e: MouseEvent) {
    const document = this.getIframeDocument();
    const draggedNodeId: string | undefined = this.dragTarget?.nodes[0];
    const draggedNode = draggedNodeId && this.options.store.query.node(draggedNodeId).get();

    if (!document || !draggedNode || !draggedNode.dom) return;

    const el = draggedNode.dom!;

    // a copy of the default shadow creation with a slight change on how the shadow is positioned around the cursor
    if (this.draggedElementShadow) {
      const shadow = this.draggedElementShadow;
      const { left, top } = shadow.getBoundingClientRect();
      shadow.style.left = `${left + e.movementX}px`;
      shadow.style.top = `${top + e.movementY}px`;
    } else {
      const { width, height, top, left } = el.getBoundingClientRect();
      const shadow = el.cloneNode(true) as HTMLElement;
      shadow.style.position = `absolute`;
      shadow.style.left = `${left}px`;
      shadow.style.top = `${top}px`;
      shadow.style.width = `${width}px`;
      shadow.style.height = `${height}px`;
      shadow.style.pointerEvents = 'none';

      document.body.appendChild(shadow);

      shadow.requestPointerLock();

      this.draggedElementShadow = shadow;
    }
  }

  computeChangedPosition(draggedNode: Node) {
    // TODO: check how to handle scrolling that might happen while we are dragging
    const draggedDomEl = draggedNode.dom;
    const shadowEl = this.draggedElementShadow;
    if (!draggedDomEl || !shadowEl) return;
    const {
      top: elementTop,
      bottom: elementBottom,
      left: elementLeft,
      right: elementRight,
      height: elementHeight,
      width: elementWidth,
    } = shadowEl.getBoundingClientRect();

    const draggedDomParentRow = draggedDomEl.parentNode as HTMLElement;
    let dropTarget = this.getNodeFromDom(draggedDomParentRow);

    if (!dropTarget) return;

    const initialIndexInParentRow = dropTarget.data.nodes.findIndex((id) => id === draggedNode.id);
    let targetIndex = initialIndexInParentRow;

    const draggedDomParentContainer = draggedDomParentRow.parentNode as HTMLElement;
    const parentContainerChildren = Array.from(
      draggedDomParentContainer.childNodes,
    ) as HTMLElement[];
    const parentRowIndexInContainer = parentContainerChildren.findIndex(
      (el) => el === draggedDomParentRow,
    );

    const { top: parentRowTop, bottom: parentRowBottom } =
      draggedDomParentRow.getBoundingClientRect();
    if (elementTop < parentRowTop - 10) {
      //   dragging out of the top of the enclosing row
      if (draggedDomParentRow.childElementCount > 1) {
        // if the current parent row contains other children move into its own row first
        dropTarget = this.getNodeFromDom(draggedDomParentContainer);
        targetIndex = parentRowIndexInContainer;
      } else {
        const hasPreviousSiblingRow = parentRowIndexInContainer > 0;
        if (hasPreviousSiblingRow) {
          const previousSiblingRow = parentContainerChildren[parentRowIndexInContainer - 1];
          if (elementTop < previousSiblingRow.getBoundingClientRect().top + 20) {
            if (hasPreviousSiblingRow) {
              dropTarget = this.getNodeFromDom(previousSiblingRow);
            }
          }
        }
      }
    } else {
      // TODO: handle flex wrap
      if (draggedDomParentRow.childElementCount > 1) {
        let highestSiblingHeight = 0;
        (Array.from(draggedDomParentRow.childNodes) as HTMLElement[]).forEach((el) => {
          if (el !== draggedDomEl) {
            const elHeight = el.getBoundingClientRect().height;
            if (elHeight > highestSiblingHeight) {
              highestSiblingHeight = elHeight;
            }
          }
        });
        let rowBoundary = 0;
        if (elementHeight > highestSiblingHeight) {
          rowBoundary = draggedDomParentRow.getBoundingClientRect().height - elementHeight;
        } else {
          rowBoundary = draggedDomParentRow.getBoundingClientRect().height - highestSiblingHeight;
        }
        if (elementTop > parentRowTop + rowBoundary + highestSiblingHeight + 10) {
          dropTarget = this.getNodeFromDom(draggedDomParentContainer);
          targetIndex = parentRowIndexInContainer + 1;
        }
      } else {
        const hasNextSiblingRow =
          parentRowIndexInContainer + 1 < draggedDomParentContainer.childElementCount;
        if (hasNextSiblingRow && elementTop > parentRowTop + 20) {
          const nextSiblingRow = parentContainerChildren[parentRowIndexInContainer + 1];

          dropTarget = this.getNodeFromDom(nextSiblingRow);
        }
      }
    }

    if (!dropTarget) return;

    if (dropTarget.dom !== draggedDomParentContainer) {
      // If we drop into a container, we have already calculated the index. If not we drop into a row and need to calculate the new index of the dropped element
      // TODO: what to do if we have a flex wrap?
      const newSiblings = Array.from(dropTarget.dom!.childNodes) as HTMLElement[];
      const currentIndexInNewParent = newSiblings.findIndex((el) => el === draggedDomEl);
      let newNeighbourIndex = newSiblings.findIndex((el) => {
        const { right, left } = el.getBoundingClientRect();
        return elementLeft > left && elementLeft < right;
      });

      if (currentIndexInNewParent < 0) {
        if (newNeighbourIndex < 0) {
          if (elementLeft < newSiblings[0].getBoundingClientRect().left) {
            newNeighbourIndex = 0;
          } else {
            newNeighbourIndex = newSiblings.length - 1;
          }
        }
        console.log(newNeighbourIndex);
        const newNeighbour = newSiblings[newNeighbourIndex];

        if (newNeighbour !== draggedDomEl) {
          const { left: nNLeft, right: nNRight } = newNeighbour.getBoundingClientRect();
          const nNCenter = nNLeft + (nNRight - nNLeft) / 2;
          const newIndexInNewParent = newNeighbourIndex + (elementLeft > nNCenter ? 1 : 0);

          if (
            newIndexInNewParent < currentIndexInNewParent ||
            newIndexInNewParent > currentIndexInNewParent + 1
          ) {
            targetIndex = newIndexInNewParent;
          }
        }
      } else {
        const { right: currentRight } = draggedDomEl.getBoundingClientRect();
        if (elementLeft + 20 > currentRight) {
          if (currentIndexInNewParent < newSiblings.length - 1) {
            targetIndex = currentIndexInNewParent + 2;
          }
        } else if (currentIndexInNewParent > 0) {
          const prevSiblingLeft = newSiblings[currentIndexInNewParent - 1].getBoundingClientRect();
          if (elementLeft - 40 < prevSiblingLeft.left) {
            targetIndex = currentIndexInNewParent - 1;
          }
        }
      }
    }

    if (
      dropTarget &&
      (dropTarget.id !== draggedNode.data.parent || targetIndex !== initialIndexInParentRow)
    ) {
      return { dropTarget, index: targetIndex };
    }
  }

  handlers() {
    const defaultEventHandlers = super.handlers();
    const {
      store: { query, actions },
    } = this.options;

    return {
      ...defaultEventHandlers,
      hover: (el: HTMLElement, id: NodeId) => {
        if (query.node(id)?.get()?.data.name !== 'Column') return () => {};

        const unbindMouseover = this.addCraftEventListener(el, 'mouseover', (e) => {
          if (this.isDragging) return;
          e.craft.stopPropagation();

          actions.setNodeEvent('hovered', id);
        });

        const unbindMouseleave = this.addCraftEventListener(el, 'mouseleave', (e) => {
          e.craft.stopPropagation();
          actions.setNodeEvent('hovered', []);
        });

        return () => {
          unbindMouseover();
          unbindMouseleave();
        };
      },
      select: (el: HTMLElement, id: NodeId) => {
        if (query.node(id)?.get()?.data.name !== 'Column') return () => {};

        const unbindClick = this.addCraftEventListener(el, 'click', (e) => {
          e.craft.stopPropagation();

          const currentNode = query.node(id)?.get();
          if (currentNode) actions.setNodeEvent('selected', [id]);
        });

        return () => {
          unbindClick();
        };
      },
      drop: () => {
        return () => {};
      },
      drag: (el: HTMLElement, id: NodeId) => {
        if (!query.node(id)?.isDraggable()) return () => {};

        const unbindDragStart = this.addCraftEventListener(el, 'mousedown', (e) => {
          e.craft.stopPropagation();

          const document = this.getIframeDocument();

          if (!document) return;

          document.addEventListener('pointerlockchange', this.pointerLockCallback);
          document.addEventListener('mouseup', this.mouseupCallback);
          document.addEventListener('pointerlockerror', console.error, false);

          actions.setNodeEvent('selected', [id]);
          actions.setNodeEvent('dragged', [id]);

          // overwrite the default drag shadow so it shows the actual position of the element if we were able to freely move it
          this.computeDragShadow(e);

          this.dragTarget = {
            type: 'existing',
            nodes: [id],
          };
        });

        return () => {
          //   unbindDragStart();
        };
      },
    };
  }
}
