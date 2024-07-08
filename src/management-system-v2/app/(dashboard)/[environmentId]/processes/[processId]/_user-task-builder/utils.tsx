import { Editor, Frame } from '@craftjs/core';
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import ReactDOMServer from 'react-dom/server';

import { Button, Dropdown, Flex, Space, Input as AntInput } from 'antd';
import { EllipsisOutlined } from '@ant-design/icons';

import ContentEditable from 'react-contenteditable';

import Overflow, { OverFlowSpaceItem } from '@/components/Overflow';

import SubmitButton from './SubmitButton';
import Text from './Text';
import Container from './Container';
import Row from './Row';
import Column from './Column';
import Header from './Header';
import Input from './Input';
import CheckboxOrRadio from './CheckboxOrRadio';
import Table from './Table';
import Image from './Image';
import { createPortal } from 'react-dom';

const styles = `
body {
  font-size: 16px;
}

.user-task-form-column {
  flex: 1 0 0;
  box-sizing: border-box;
  height: fit-content;
  border: 2px solid lightgrey;
}

@media only screen and (max-width: 600px) {
  .user-task-form-column {
    flex: 0 0 100%;
  }
}

.user-task-form-row {
  box-sizing: border-box;
  width: 100%;
  padding: 5px;
  margin: 10px 0;
  display: flex;
  flex-wrap: wrap;
}

.user-task-form-container {
  min-height: 100%;
}

.user-task-form-input {
  width: 100%;
}

.user-task-form-input > div {
  max-width: 100%;
  padding-bottom: 0.5rem;
  margin: 0;
  font-size: 1rem;
}

.user-task-form-input input {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid #d9d9d9;
  padding: 4px 11px;
  font-size: 0.875em;
  line-height: 1.5714;
  border-radius: 0.375rem;
}

.user-task-form-table {
  text-align: left;
  width: 100%;
  border: 1px solid lightgrey;
  border-collapse: collapse;
  border-radius: 0.5rem 0.5rem 0 0;
}

.user-task-form-table .user-task-form-table-cell {
  padding: 0.75rem 0.5rem;
  border: 1px solid lightgrey;
  position: relative;
}

.user-task-form-input-group {
  position: relative;
  width: fit-content;
}

.user-task-form-input-group label, .user-task-form-input-group input {
  cursor: pointer;
}

.user-task-form-input-group > span {
  display: flex;
  align-items: center;
}

.user-task-form-input-group input[type="radio"] {
  width: 16px;
  height: 16px;
  margin: 3px;
}

.user-task-form-input-group input[type="checkbox"] {
  width: 16px;
  height: 16px;
  margin: 3px;
}

.user-task-form-image {
  width: 100%;
  display: flex;
  justify-content: center;
}

.user-task-form-image img {
  max-width: 100%;
}

p, h1, h2, h3, h4, h5, th, td {
  cursor: default;
}

`;

export function toHtml(json: string) {
  const markup = ReactDOMServer.renderToStaticMarkup(
    <Editor
      enabled={false}
      resolver={{
        SubmitButton,
        Text,
        Container,
        Row,
        Header,
        Input,
        CheckboxOrRadio,
        Column,
        Table,
        Image,
      }}
    >
      <Frame data={json} />
    </Editor>,
  );

  return `
  <!DOCTYPE html>
<html>
  <head>
    <style>
      ${styles}
    </style>
  </head>
  <body>
    ${markup}
  </body>
</html>
  `;
}

export const iframeDocument = `
<!DOCTYPE html>
<html>
  <head>
    <style>
      html, body, #mountHere, .frame-content {
        height: 100%;
        width: 100%;
        overflow-x: hidden;
      }

      body {
        margin: 0;
      }

      .frame-content > div {
        box-sizing: border-box;
        padding: 0 10px;
        border: 2px solid #d3d3d3 !important;
      }

      .user-task-form-container svg {
        height: 50px;
      }

      .user-task-form-image {
        position: relative;
      }

      .user-task-form-image > div {
        position: absolute;
        background-color: rgba(0, 0, 0, 0.5);
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .user-task-form-image > div > span {
        margin: 0 10px;
        cursor: pointer;
        color: white;
      } 

      ${styles}
    </style>
  </head>
  <body>
    <div id="mountHere">
    </div>
  </body>
</html>
`;

export const defaultForm = `
{
  "ROOT": {
    "type": { "resolvedName": "Container" },
    "isCanvas": true,
    "props": {
      "padding": 10,
      "background": "#fff",
      "borderThickness": 0,
      "borderColor": "#d3d3d3"
    },
    "displayName": "Container",
    "custom": {},
    "hidden": false,
    "nodes": [],
    "linkedNodes": {}
  }
}
`;

export type ComponentSettingsProps = {
  controls: OverFlowSpaceItem[];
};

export const ComponentSettings: React.FC<ComponentSettingsProps> = ({ controls }) => {
  const ref = useRef<HTMLElement>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);

  return (
    <Flex gap="middle" ref={ref} style={{ flexGrow: 1, overflow: 'hidden' }} align="center">
      <Overflow
        renderHidden={(items) => {
          return (
            <Dropdown
              open={overflowOpen}
              menu={{
                items,
              }}
            >
              <Button
                type="text"
                icon={<EllipsisOutlined />}
                onClick={() => setOverflowOpen(!overflowOpen)}
              />
            </Dropdown>
          );
        }}
        items={controls}
        containerRef={ref}
      />
    </Flex>
  );
};

const getIframe = () => document.getElementById('user-task-builder-iframe') as HTMLIFrameElement;
const getSelection = () => getIframe().contentWindow!.getSelection();

type ContextMenuProps = React.PropsWithChildren<{
  canOpen?: (openEvent: React.MouseEvent<HTMLElement, MouseEvent>) => boolean;
  menu: ReactNode;
}>;

export const ContextMenu: React.FC<ContextMenuProps> = ({ children, canOpen, menu }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleClick = () => setShowMenu(false);
    window.addEventListener('click', handleClick);

    getIframe().contentWindow?.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('click', handleClick);
      getIframe().contentWindow?.removeEventListener('click', handleClick);
      setShowMenu(false);
    };
  }, []);

  return (
    <>
      {showMenu &&
        createPortal(
          <div
            style={{
              zIndex: 1000,
              position: 'absolute',
              ...menuPosition,
            }}
          >
            {menu}
          </div>,
          document.body,
        )}
      <div
        onContextMenu={(e) => {
          if (canOpen && !canOpen(e)) return;
          const { top, left } = getIframe().getBoundingClientRect();
          e.preventDefault();
          e.stopPropagation();
          setShowMenu(true);
          setMenuPosition({ left: left + e.clientX + 5, top: top + e.clientY + 5 });
        }}
      >
        {children}
      </div>
    </>
  );
};

type ContentEditableProps = ConstructorParameters<typeof ContentEditable>[0];

type EditableTextProps = Omit<
  ContentEditableProps,
  'html' | 'disabled' | 'onDoubleClick' | 'onChange' | 'tagName' | 'ref'
> & {
  value: string;
  onChange: (newText: string) => void;
  tagName: string;
  htmlFor?: string;
};

// TODO: make this closable by an exposed function
export const EditableText: React.FC<EditableTextProps> = ({
  value,
  onChange,
  tagName,
  ...props
}) => {
  const ref = useRef<HTMLElement>(null);

  const [editable, setEditable] = useState(false);
  const [currentLinkValue, setCurrentLinkValue] = useState<string>();

  useEffect(() => {
    const handleClick = () => {
      if (editable) {
        setEditable(false);
        setCurrentLinkValue(undefined);
      }
    };

    getIframe().contentWindow?.addEventListener('click', handleClick);
    return () => {
      getIframe().contentWindow?.removeEventListener('click', handleClick);
    };
  }, [editable]);

  // TODO: muss wahrscheinlich ein portal ins iframe sein weil es sonst nicht für Elemente funktioniert die relativ positioniert sind
  const contextMenu = (
    <Space.Compact size="large">
      {typeof currentLinkValue === 'string' ? (
        <AntInput
          value={currentLinkValue}
          onChange={(e) => setCurrentLinkValue(e.target.value)}
          onClick={(e) => {
            e.stopPropagation();
          }}
          onPressEnter={() => {
            if (currentLinkValue) {
              getIframe().contentDocument!.execCommand('createLink', false, currentLinkValue);
            } else {
              getIframe().contentDocument!.execCommand('unlink', false);
            }
            setCurrentLinkValue(undefined);
          }}
        />
      ) : (
        <>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              getIframe().contentDocument!.execCommand('bold', false);
            }}
          >
            Bold
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              getIframe().contentDocument!.execCommand('italic', false);
            }}
          >
            Italic
          </Button>

          <Button
            onClick={(e) => {
              e.stopPropagation();
              const sel = getSelection();
              const link = sel?.anchorNode?.parentElement;
              setCurrentLinkValue('');
            }}
          >
            Link
          </Button>
        </>
      )}
    </Space.Compact>
  );

  return (
    <ContextMenu
      canOpen={(e) => {
        if (!editable) return false;
        const sel = getSelection();
        if (sel?.isCollapsed && (e.target as HTMLElement).tagName === 'A') {
          const link = e.target as HTMLAnchorElement;
          const range = getIframe().contentDocument?.createRange();
          if (range) {
            sel.removeAllRanges();
            range.selectNode(link);
            sel.addRange(range);
            setCurrentLinkValue(link.href);
            return true;
          }
        }
        return !sel?.isCollapsed && !!ref.current?.contains(sel?.anchorNode || null);
      }}
      menu={contextMenu}
    >
      <ContentEditable
        innerRef={ref}
        html={value}
        tagName={tagName}
        disabled={!editable}
        onDoubleClick={() => {
          setEditable(true);
          setTimeout(() => {
            if (ref.current) {
              ref.current.focus();
              const sel = getSelection();
              if (sel) {
                sel.selectAllChildren(ref.current);
                sel.collapseToEnd();
              }
            }
          }, 5);
        }}
        onMouseDownCapture={(e) => editable && e.stopPropagation()}
        onClickCapture={(e) => e.stopPropagation()}
        onKeyDown={(e) => !e.shiftKey && e.key === 'Enter' && setEditable(false)}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
    </ContextMenu>
  );
};
