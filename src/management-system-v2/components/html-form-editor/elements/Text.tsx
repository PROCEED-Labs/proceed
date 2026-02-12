import { useEditor, useNode, UserComponent } from '@craftjs/core';

import { EditOutlined, DeleteOutlined } from '@ant-design/icons';

import EditableText from '../_utils/EditableText';
import { ContextMenu, Overlay } from './utils';
import { useState } from 'react';
import useEditorStateStore from '../use-editor-state-store';
import { useDeleteControl } from './utils';

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

  const editingEnabled = useEditorStateStore((state) => state.editingEnabled);
  const { handleDelete } = useDeleteControl();

  return (
    <ContextMenu menu={[]}>
      <div
        onMouseEnter={() => setHovered(true)}
        ref={(r) => {
          r && connect(r);
        }}
      >
        <Overlay
          show={editingEnabled && hovered && !textEditing}
          onHide={() => setHovered(false)}
          controls={[
            { key: 'edit', icon: <EditOutlined onClick={() => setTextEditing(true)} /> },
            { key: 'delete', icon: <DeleteOutlined onClick={handleDelete} /> },
          ]}
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
