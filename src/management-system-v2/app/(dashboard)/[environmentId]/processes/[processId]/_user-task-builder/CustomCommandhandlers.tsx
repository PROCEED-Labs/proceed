import { DefaultEventHandlers, NodeId, Node, NodeTree, ROOT_NODE } from '@craftjs/core';

import CustomPositioner from './CustomPositioner';
import React from 'react';

export default class CustomEventhandlers extends DefaultEventHandlers {
  customPositioner: CustomPositioner | null = null;

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
          e.craft.stopPropagation();

          if (!query.getEvent('dragged').all().length) actions.setNodeEvent('hovered', id);
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
        const node = query.node(id)?.get();
        if (node?.data.name !== 'Column' && node?.id !== ROOT_NODE) return () => {};

        const unbindClick = this.addCraftEventListener(el, 'click', (e) => {
          e.craft.stopPropagation();

          const currentNode = query.node(id)?.get();
          if (currentNode) {
            if (currentNode.id === ROOT_NODE) actions.setNodeEvent('selected', []);
            else actions.setNodeEvent('selected', [id]);
          }
        });

        return () => {
          unbindClick();
        };
      },
      create: (
        el: HTMLElement,
        userElement: React.ReactElement | (() => NodeTree | React.ReactElement),
      ) => {
        const unbindDragStart = this.addCraftEventListener(el, 'mousedown', (e) => {
          const iframeDocument = (
            document.getElementById('user-task-builder-iframe') as HTMLIFrameElement
          ).contentDocument;

          if (!iframeDocument) return;

          document.addEventListener('mouseup', this.onMouseup);

          e.craft.stopPropagation();
          let tree;
          if (typeof userElement === 'function') {
            const result = userElement();
            if (React.isValidElement(result)) {
              tree = query.parseReactElement(result).toNodeTree();
            } else {
              tree = result as NodeTree;
            }
          } else {
            tree = query.parseReactElement(userElement).toNodeTree();
          }

          this.customPositioner = new CustomPositioner(
            iframeDocument,
            this.options.store,
            {
              type: 'new',
              tree,
            },
            e,
          );
        });

        return () => {
          unbindDragStart();
        };
      },
      drop: () => {
        return () => {};
      },
      drag: (el: HTMLElement, id: NodeId) => {
        if (!query.node(id)?.isDraggable()) return () => {};

        let initDragTimeout: ReturnType<typeof setTimeout> | null = null;

        const unbindDragStart = this.addCraftEventListener(el, 'mousedown', (e) => {
          if (e.button !== 0) return;

          e.craft.stopPropagation();
          e.preventDefault();

          // start dragging after a short timeout, otherwise clicks aimed at elements inside a column are blocked by the pointer being locked
          initDragTimeout = setTimeout(() => {
            const iframeDocument = (
              document.getElementById('user-task-builder-iframe') as HTMLIFrameElement
            ).contentDocument;

            if (!iframeDocument) return;

            actions.setNodeEvent('selected', [id]);
            actions.setNodeEvent('dragged', [id]);

            this.customPositioner = new CustomPositioner(
              iframeDocument,
              this.options.store,
              {
                type: 'existing',
                nodes: [id],
              },
              e,
            );
            initDragTimeout = null;
          }, 100);
        });

        const unbindDragCancel = this.addCraftEventListener(el, 'mouseup', () => {
          if (initDragTimeout) {
            clearTimeout(initDragTimeout);
            initDragTimeout = null;
          }
        });

        return () => {
          unbindDragStart();
          unbindDragCancel();
        };
      },
    };
  }

  onMouseup = () => {
    if (this.customPositioner) {
      this.customPositioner.cleanup();
      this.customPositioner = null;
    }
    document.removeEventListener('mouseup', this.onMouseup);
  };
}
