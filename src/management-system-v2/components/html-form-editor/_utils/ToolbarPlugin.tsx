// Adapted from: https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/ToolbarPlugin/index.tsx

import { Button, Divider, Input, Select, Space } from 'antd';
import {
  UndoOutlined,
  RedoOutlined,
  BoldOutlined,
  LinkOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  AlignCenterOutlined,
} from '@ant-design/icons';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import { $isLinkNode, TOGGLE_LINK_COMMAND, LinkNode } from '@lexical/link';

import {
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from 'lexical';

import { useCallback, useEffect, useRef, useState } from 'react';
import { VariableSetting } from '../elements/utils';

import { tokenize } from '@proceed/user-task-helper/src/tokenize';

const LowPriority = 1;

export default function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [link, setLink] = useState('');
  const [linkType, setLinkType] = useState<'url' | 'variable'>('url');

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      // Update text format
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));

      const nodes = selection.getNodes();
      let isLink = nodes.length > 0;
      let link: string | undefined = undefined;
      nodes.forEach((node) => {
        // a node might either be a link itself or nested inside a link element
        const nodeIsLink = $isLinkNode(node) || $isLinkNode(node.getParent());
        isLink &&= nodeIsLink;

        // if a part of the selection is not a link set the link value to being empty
        if (!nodeIsLink) link = '';
        else {
          const linkNode = $isLinkNode(node) ? node : (node.getParent() as LinkNode);
          // init the link value with the value from the link node if it was not initialized before
          if (link === undefined) link = linkNode.__url;
          // reset the link value if we are selecting two different links at the same time
          else if (link != linkNode.__url) link = '';
        }
      });
      setIsLink(isLink);

      setLinkType('url');
      if (link) {
        const tokens = tokenize(link);
        // check if the link is a variable definition of the form {%variable-name%}
        if (tokens.length === 1 && tokens[0].type === 'variable') {
          setLinkType('variable');
          setLink(tokens[0].variableName);
        } else setLink(link as string);
      } else setLink('');
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        (_payload, _newEditor) => {
          $updateToolbar();
          return false;
        },
        LowPriority,
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        LowPriority,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        LowPriority,
      ),
    );
  }, [editor, $updateToolbar]);

  const linkOptions = [
    { label: 'URL', value: 'url' },
    { label: 'Variable', value: 'variable' },
  ];

  const typeInputMap = {
    url: (
      <Input
        value={link}
        onChange={(e) => setLink(e.target.value || '')}
        onBlur={() => {
          editor.dispatchCommand(TOGGLE_LINK_COMMAND, link ? { url: link } : null);
        }}
      />
    ),
    variable: (
      <VariableSetting
        compact
        variable={link || ''}
        allowedTypes={['string', 'file']}
        onChange={(newVariable) => {
          const newValue = newVariable ? `{%${newVariable}%}` : '';
          setLink(newValue);
          editor.dispatchCommand(TOGGLE_LINK_COMMAND, newValue ? { url: newValue } : null);
        }}
      />
    ),
  };

  return (
    <div className="toolbar" ref={toolbarRef} onMouseDown={(e) => e.stopPropagation()}>
      <div>
        <Button
          disabled={!canUndo}
          className="toolbar-item spaced"
          aria-label="Undo"
          type="text"
          icon={<UndoOutlined />}
          onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        />
        <Button
          disabled={!canRedo}
          className="toolbar-item"
          aria-label="Redo"
          type="text"
          icon={<RedoOutlined />}
          onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        />
        <Divider type="vertical" />
        <Button
          className={'toolbar-item spaced '}
          aria-label="Format Bold"
          style={{ backgroundColor: isBold ? '#a9a9a94d' : undefined }}
          type="text"
          icon={<BoldOutlined />}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        />
        <Button
          className={'toolbar-item spaced '}
          aria-label="Format Italics"
          style={{ backgroundColor: isItalic ? '#a9a9a94d' : undefined }}
          type="text"
          icon={<ItalicOutlined />}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        />
        <Button
          className={'toolbar-item spaced '}
          aria-label="Format Underline"
          style={{ backgroundColor: isUnderline ? '#a9a9a94d' : undefined }}
          type="text"
          icon={<UnderlineOutlined />}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        />
        <Button
          className={'toolbar-item spaced '}
          aria-label="Format Link"
          style={{ backgroundColor: isLink ? '#a9a9a94d' : undefined }}
          type="text"
          icon={<LinkOutlined />}
          onClick={() => {
            setIsLink(!isLink);
            setLinkType('url');
            const newLink = isLink ? '' : 'https://';
            setLink(newLink);
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, isLink ? null : { url: newLink });
          }}
        />
        <Divider type="vertical" />
        <Button
          className="toolbar-item spaced"
          aria-label="Left Align"
          type="text"
          icon={<AlignLeftOutlined />}
          onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')}
        />
        <Button
          className="toolbar-item spaced"
          aria-label="Center Align"
          type="text"
          icon={<AlignCenterOutlined />}
          onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')}
        />
        <Button
          className="toolbar-item spaced"
          aria-label="Right Align"
          type="text"
          icon={<AlignRightOutlined />}
          onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')}
        />
      </div>
      {isLink && (
        <div style={{ margin: '5px' }}>
          Link:
          <Space.Compact style={{ width: '100%' }}>
            <Select
              options={linkOptions}
              value={linkType}
              onChange={(type) => {
                setLinkType(type);
                setLink('');
              }}
            />
            <div style={{ flexGrow: '1' }}>{typeInputMap[linkType]}</div>
          </Space.Compact>
        </div>
      )}
    </div>
  );
}
