import { useNode, UserComponent, useEditor } from '@craftjs/core';

import { DeleteOutlined, EditOutlined } from '@ant-design/icons';

import EditableText from '../_utils/EditableText';
import React, { useState } from 'react';
import { Overlay, Setting, useDeleteControl } from './utils';

import cn from 'classnames';
import { Checkbox, Select } from 'antd';
import useEditorStateStore from '../use-editor-state-store';

type SubmitButtonProps = React.PropsWithChildren & {
  title?: string;
  type?: 'primary' | 'default';
  block?: boolean;
};

const SubmitButton: UserComponent<SubmitButtonProps> = ({
  title = '',
  type = 'primary',
  block = false,
}) => {
  const {
    connectors: { connect },
    actions: { setProp },
  } = useNode();

  const [textEditing, setTextEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { handleDelete } = useDeleteControl();

  const editingEnabled = useEditorStateStore((state) => state.editingEnabled);

  return (
    <div>
      <button
        type="submit"
        style={{
          width: block ? '100%' : 'auto',
          minWidth: 125,
          height: 40,
          padding: '0 16px',
        }}
        onMouseEnter={() => setHovered(true)}
        className={cn('user-task-form-button', { 'primary-button': type == 'primary' })}
        ref={(r) => {
          r && connect(r);
        }}
      >
        <Overlay
          show={editingEnabled && hovered && !textEditing}
          onHide={() => setHovered(false)}
          controls={[
            {
              key: 'edit',
              icon: <EditOutlined onClick={() => setTextEditing(true)} />,
            },
            { key: 'delete', icon: <DeleteOutlined onClick={handleDelete} /> },
          ]}
          onDoubleClick={() => setTextEditing(true)}
        >
          <EditableText
            style={{ whiteSpace: 'nowrap' }}
            value={title}
            active={textEditing}
            onStopEditing={() => setTextEditing(false)}
            tagName="div"
            onChange={(newText) => setProp((props: SubmitButtonProps) => (props.title = newText))}
          />
        </Overlay>
      </button>
    </div>
  );
};

export const SubmitButtonSettings = () => {
  const {
    actions: { setProp },
    type,
    block,
  } = useNode((node) => ({
    type: node.data.props.type,
    block: node.data.props.block,
  }));
  const { editingEnabled } = useEditor((state) => ({ editingEnabled: state.options.enabled }));

  return (
    <>
      <Setting
        label="Color"
        control={
          <Select
            style={{ display: 'flex' }}
            options={[
              { value: 'default', label: 'White' },
              { value: 'primary', label: 'Blue' },
            ]}
            value={type}
            disabled={!editingEnabled}
            onChange={(val) =>
              setProp((props: SubmitButtonProps) => {
                props.type = val;
              })
            }
          />
        }
      />
      <Setting
        label="Use Full Width"
        control={
          <Checkbox
            checked={block}
            onChange={(e) => {
              setProp((props: SubmitButtonProps) => {
                props.block = e.target.checked;
              });
            }}
          />
        }
      />
    </>
  );
};

SubmitButton.craft = {
  props: {
    title: 'Submit',
    type: 'primary',
    block: false,
  },
  related: {
    settings: SubmitButtonSettings,
  },
  rules: {
    canDrag: () => false,
  },
};

export default SubmitButton;
