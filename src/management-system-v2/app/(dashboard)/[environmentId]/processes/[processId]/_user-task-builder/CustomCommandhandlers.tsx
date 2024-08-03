import { DefaultEventHandlers, NodeId, NodeTree, ROOT_NODE } from '@craftjs/core';

import React from 'react';

export default class CustomEventhandlers extends DefaultEventHandlers {
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
      // disable the built in drag and drop logic of craft js
      create: (
        el: HTMLElement,
        userElement: React.ReactElement | (() => NodeTree | React.ReactElement),
      ) => {
        return () => {};
      },
      drop: () => {
        return () => {};
      },
      drag: (el: HTMLElement, id: NodeId) => {
        return () => {};
      },
    };
  }
}
