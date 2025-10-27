import { Node, useEditor } from '@craftjs/core';
import { useCallback } from 'react';

export default function useEditorControls() {
  const { query, actions, selected, canUndo, canRedo } = useEditor((state, query) => {
    const currentColumn = Array.from(state.events.selected)
      .map((id) => state.nodes[id])
      .find((node) => node && node.data.name === 'Column');

    return {
      selected: currentColumn?.id,
      canUndo: query.history.canUndo(),
      canRedo: query.history.canRedo(),
    };
  });

  const deleteElement = useCallback((idOrNode: string | Node) => {
    let node = typeof idOrNode === 'string' ? undefined : idOrNode;

    if (typeof idOrNode === 'string') {
      node = query.node(idOrNode).get();
    }

    while (node?.data.parent && node.data.name !== 'Column') {
      node = query.node(node.data.parent).get();
    }

    if (node) {
      const parentRow = node.data.parent && query.node(node.data.parent).get();

      if (parentRow && parentRow.data.nodes.length === 1) {
        actions.delete(parentRow.id);
      } else {
        actions.delete(node.id);
      }
    }
  }, []);

  const undo = useCallback(() => actions.history.undo(), []);
  const redo = useCallback(() => actions.history.redo(), []);

  return {
    selected,
    deleteElement,
    canUndo,
    canRedo,
    undo,
    redo,
  };
}
