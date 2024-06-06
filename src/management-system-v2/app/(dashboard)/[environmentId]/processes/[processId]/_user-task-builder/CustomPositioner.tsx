import { DragTarget, EditorStore, Node, Element, NodeId, ROOT_NODE } from '@craftjs/core';

import Row from './Row';

export default class CustomPositioner {
  document: Document;
  dragTarget: DragTarget;
  store: EditorStore;
  dragShadow: HTMLElement | null = null;

  updateTimeout: ReturnType<typeof setTimeout> | null = null;
  offsetDuringTimeout = { x: 0, y: 0 };
  currentMousePos = { x: 0, y: 0 };

  constructor(doc: Document, store: EditorStore, target: DragTarget) {
    this.document = doc;
    this.dragTarget = target;
    this.store = store;

    this.document.body.focus();

    if (target.type === 'existing') {
      this.initDragging();
    }

    this.document.body.addEventListener('mousemove', this.onMouseMove);
    this.document.addEventListener('mouseup', this.onMouseUp);
  }

  async initDragging() {
    const shadow = this.createDragShadow();

    if (shadow) {
      this.dragShadow = shadow;

      const pointerLockPromise = new Promise((res, rej) => {
        this.document.addEventListener('pointerlockchange', (e) => {
          if (this.document.pointerLockElement) {
            res(undefined);
          }
        });
        this.document.addEventListener('pointerlockerror', (e) => {
          rej();
        });
      });

      try {
        shadow.requestPointerLock();
        await pointerLockPromise;

        this.document.addEventListener('pointerlockchange', this.onPointerRelease);
      } catch (err) {
        console.error('Error on locking the pointer');
        this.cleanup();
      } finally {
        // TODO: remove the promise listeners after the promise has resolved or rejected
      }
    }
  }

  cancel() {
    if (this.document.pointerLockElement) {
      this.document.exitPointerLock();
    } else {
      this.cleanup();
    }
  }

  cleanup() {
    if (this.dragShadow) {
      this.dragShadow.parentNode?.removeChild(this.dragShadow);
      this.dragShadow = null;
    }

    this.document.removeEventListener('pointerlockchange', this.onPointerRelease);
    this.document.body.removeEventListener('mousemove', this.onMouseMove);
    this.document.removeEventListener('mouseup', this.onMouseUp);

    this.store.actions.setNodeEvent('dragged', []);
  }

  getDraggedElementDom() {
    if (this.dragTarget.type === 'existing') {
      return this.store.query.node(this.dragTarget.nodes[0]).get().dom;
    }
  }

  createDragShadow() {
    const el = this.getDraggedElementDom();

    if (el) {
      const { width, height, top, left } = el.getBoundingClientRect();
      const shadow = el.cloneNode(true) as HTMLElement;
      shadow.style.position = `absolute`;
      shadow.style.left = `${left}px`;
      shadow.style.top = `${top}px`;
      shadow.style.width = `${width}px`;
      // shadow.style.height = `${height}px`;
      shadow.style.pointerEvents = 'none';

      this.document.body.appendChild(shadow);

      return shadow;
    }
  }

  updateDragShadow({ x, y }: { x: number; y: number }) {
    const el = this.getDraggedElementDom();

    if (this.dragShadow && el) {
      const shadow = this.dragShadow;
      const { left, top } = shadow.getBoundingClientRect();
      shadow.style.left = `${left + x}px`;
      shadow.style.top = `${top + y}px`;
    }
  }

  onPointerRelease = () => {
    const { document } = this;

    if (!document.pointerLockElement) {
      this.cleanup();
    }
  };

  onMouseUp = (e: MouseEvent) => {
    e.stopPropagation();
    this.cancel();
  };

  onMouseMove = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    this.offsetDuringTimeout.x += e.movementX;
    if (!e.ctrlKey) this.offsetDuringTimeout.y += e.movementY;

    this.currentMousePos = e;

    if (!this.updateTimeout) {
      this.updateTimeout = setTimeout(this.updatePosition.bind(this), 20);
    }
  };

  updatePosition() {
    this.updateTimeout = null;

    this.updateDragShadow(this.offsetDuringTimeout);

    this.offsetDuringTimeout = { x: 0, y: 0 };

    const mousePos = this.document.pointerLockElement ? undefined : this.currentMousePos;

    const { query, actions } = this.store;

    const result = this.getNewPositionInContainer('ROOT', mousePos);

    if (!result) return;

    let { dropTarget, index } = result;

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

    if (this.dragTarget.type === 'new') {
      // if the element is dragged in from the toolbox we need to create it
      let nodeTree = this.dragTarget.tree;
      const newElementId = nodeTree.rootNodeId;

      actions.addNodeTree(nodeTree, dropTargetId, index);
      actions.setNodeEvent('dragged', newElementId);

      // if (options && typeof options.onCreate === 'function') options.onCreate();

      // update the internal dragTarget (this will basically work as if we had started dragging an existing element)
      this.dragTarget = {
        type: 'existing',
        nodes: [newElementId],
      };
      this.initDragging();
    } else {
      const node = query.node(this.dragTarget.nodes[0]).get();

      console.log('New Position', dropTarget, index);

      const oldParentId = node.data.parent ? query.node(node.data.parent).get().id : undefined;

      actions.move(node, dropTargetId, index);

      setTimeout(() => {
        // Update the dragShadow so it fits the element again
        if (this.dragTarget.type === 'existing') {
          const shadow = this.dragShadow!;
          const { width, height } = query
            .node(this.dragTarget.nodes[0])
            .get()
            .dom!.getBoundingClientRect();
          shadow.style.width = `${width}px`;
          // shadow.style.height = `${height}px`;
        }
      }, 20);

      // the element might leave an empty row which needs to be removed
      if (!oldParentId) return;

      const oldParent = query.node(oldParentId).get();

      if (oldParent?.data.name === 'Row' && !oldParent.data.nodes.length) {
        actions.delete(oldParent.id);
      }
    }
  }

  getNewPositionInContainer(
    targetId: NodeId,
    position?: { x: number; y: number },
  ): { dropTarget: Node; index: number } | undefined | null {
    const node = this.store.query.node(targetId).get();

    if (!node?.dom) return;

    let inContainer = false;

    let moveNode;
    if (this.dragTarget.type === 'existing') {
      moveNode = this.store.query.node(this.dragTarget.nodes[0]).get();
      if (!moveNode) return;
    }

    const { left, right, bottom, top } = node.dom.getBoundingClientRect();

    let posY;
    if (position) {
      posY = position.y;
      inContainer =
        position.x > left && position.x < right && position.y > top && position.y < bottom;
    } else if (this.dragShadow) {
      const { left: sLeft, top: sTop, width: sWidth } = this.dragShadow.getBoundingClientRect();
      posY = sTop;
      const sCenter = sLeft + sWidth / 2;
      if (targetId === ROOT_NODE) {
        inContainer = sTop > top && sCenter > left && sCenter < right;
      } else {
        inContainer = sTop > top && sCenter > left + 20 && sCenter < right - 20;
      }
    } else return;

    if (inContainer) {
      // prevent dragging a column into its child container
      if (moveNode && targetId === moveNode.data.nodes[0]) return null;

      // check if the element should be placed inside a child
      for (const child of node.data.nodes) {
        const result = this.getNewPositionInRow(child, position);
        if (result !== undefined) return result;
      }

      // get the position of the element
      let index = 0;
      for (const childId of node.data.nodes) {
        const childRow = this.store.query.node(childId).get();

        if (childRow.dom) {
          const { top: childRowTop } = childRow.dom.getBoundingClientRect();

          if (posY > childRowTop) ++index;
        }
      }

      if (moveNode) {
        const parent = this.store.query.node(moveNode.data.parent!).get();
        const currentIndexInNode = node.data.nodes.findIndex((id) => id === parent.id);
        // if the column is the only child in a row and would be placed into a row at the same position as the current one we want to just keep the current state
        if (
          parent.data.parent === node.id &&
          parent.data.nodes.length === 1 &&
          (currentIndexInNode === index || currentIndexInNode + 1 === index)
        ) {
          return null;
        }
      }

      return { dropTarget: node, index };
    }
  }

  getNewPositionInRow(
    targetId: NodeId,
    position?: { x: number; y: number },
  ): { dropTarget: Node; index: number } | undefined | null {
    const node = this.store.query.node(targetId).get();

    if (!node?.dom) return;

    let inRow = false;

    let moveNode;
    let moveNodeParent;
    if (this.dragTarget.type === 'existing') {
      moveNode = this.store.query.node(this.dragTarget.nodes[0]).get();
      moveNodeParent = this.store.query.node(moveNode.data.parent!).get();
      if (!moveNode) return;
    }

    const { bottom, top } = node.dom.getBoundingClientRect();
    let posX;
    if (position) {
      posX = position.x;
      inRow = position.y > top && position.y < bottom;
    } else if (this.dragShadow) {
      const {
        left: sLeft,
        top: sTop,
        width: sWidth,
        height: sHeight,
      } = this.dragShadow.getBoundingClientRect();
      posX = sLeft + sWidth / 2;

      if (moveNode?.dom && moveNodeParent?.dom) {
        const { height: mHeight } = moveNode.dom.getBoundingClientRect();
        const { top: pTop } = moveNodeParent.dom.getBoundingClientRect();

        if (pTop - 1 < top) {
          let highestSiblingHeight = 0;

          // TODO: handle flex-wrap somehow; this assumes that there is no wrap in the parent row
          const siblings = moveNodeParent.data.nodes;
          siblings.forEach((id) => {
            if (id !== moveNode.id) {
              const sibling = this.store.query.node(id).get();

              if (sibling?.dom) {
                const { height } = sibling.dom.getBoundingClientRect();
                if (highestSiblingHeight < height) highestSiblingHeight = height;
              }
            }
          });

          const heightDiff = mHeight > highestSiblingHeight ? mHeight - highestSiblingHeight : 0;
          console.log(heightDiff);
          inRow = sTop > top - heightDiff && sTop < bottom - heightDiff;
        } else {
          inRow = sTop > top && sTop < bottom;
        }
      } else {
        inRow = sTop > top && sTop < bottom;
      }
    } else return;

    if (inRow) {
      const childContainers = node.data.nodes.reduce((curr, id) => {
        const column = this.store.query.node(id).get();
        const child = this.store.query.node(column.data.nodes[0]).get();

        if (child.data.name === 'Container') curr.push(child.id);
        return curr;
      }, [] as string[]);

      for (const child of childContainers) {
        const result = this.getNewPositionInContainer(child, position);

        if (result !== undefined) return result;
      }

      // get the position of the element
      let index = 0;
      for (const childId of node.data.nodes) {
        const child = this.store.query.node(childId).get();

        if (child.dom) {
          const { left: childLeft, width: childWidth } = child.dom.getBoundingClientRect();
          const childMid = childLeft + childWidth / 2;
          if (posX > childMid) ++index;
        }
      }

      if (moveNode) {
        const currentIndexInNode = node.data.nodes.findIndex((id) => id === moveNode.id);
        if (
          moveNode.data.parent === node.id &&
          (currentIndexInNode === index || currentIndexInNode + 1 === index)
        ) {
          return null;
        }
      }

      return { dropTarget: node, index };
    }
  }
}
