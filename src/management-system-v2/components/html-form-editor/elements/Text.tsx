import { useNode, UserComponent } from '@craftjs/core';

import { EditOutlined } from '@ant-design/icons';

import EditableText from '../_utils/EditableText';
import { ContextMenu, Overlay } from './utils';
import { useContext, useState } from 'react';
import { useCanEdit } from '@/lib/can-edit-context';
import useEditorStateStore from '../use-editor-state-store';
import { DragPreviewContext } from './Column';

type TextProps = {
  text?: string;
};

const Text: UserComponent<TextProps> = ({ text = '' }) => {
  const {
    connectors: { connect },
    actions: { setProp },
  } = useNode();
  const [hovered, setHovered] = useState(false);
  const [textEditing, setTextEditing] = useState(false);

  const editingEnabled = useCanEdit();

  // prevent that a drag preview interacts with the drag and drop functionality of the original
  // object
  const isDragPreview = useContext(DragPreviewContext);

  return (
    <ContextMenu menu={[]}>
      <div
        onMouseEnter={() => setHovered(true)}
        ref={(r) => {
          !isDragPreview && r && connect(r);
        }}
      >
        <Overlay
          show={editingEnabled && hovered && !textEditing}
          onHide={() => setHovered(false)}
          controls={[{ key: 'edit', icon: <EditOutlined onClick={() => setTextEditing(true)} /> }]}
          onDoubleClick={() => setTextEditing(true)}
        >
          <EditableText
            value={text}
            tagName="div"
            active={textEditing}
            onStopEditing={() => setTextEditing(false)}
            onChange={(newText) => setProp((props: TextProps) => (props.text = newText))}
          />
        </Overlay>
      </div>
    </ContextMenu>
  );
};

export const TextSettings = () => {
  const isTextEditing = useEditorStateStore((state) => state.isTextEditing);

  return (
    !isTextEditing && (
      <div style={{ textAlign: 'center' }}>
        Start editing the text to get text specific settings.
      </div>
    )
  );
};

Text.craft = {
  rules: {
    canDrag: () => false,
  },
  related: {
    settings: TextSettings,
  },
  props: {
    text: 'New Text Element',
  },
};

export default Text;
