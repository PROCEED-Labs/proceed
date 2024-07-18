import { Editor, Frame } from '@craftjs/core';
import React, { ReactElement, ReactNode, useEffect, useId, useRef, useState } from 'react';
import ReactDOMServer from 'react-dom/server';

import ContentEditable from 'react-contenteditable';

import SubmitButton from './SubmitButton';
import Text from './Text';
import Container from './Container';
import Row from './Row';
import Column from './Column';
import Header from './Header';
import Input from './Input';
import CheckboxOrRadioGroup from './CheckboxOrRadioGroup';
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
        CheckboxOrRadioGroup,
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

const getIframe = () => document.getElementById('user-task-builder-iframe') as HTMLIFrameElement | undefined;
const getSelection = () => getIframe()?.contentWindow!.getSelection();

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

    getIframe()?.contentWindow?.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('click', handleClick);
      getIframe()?.contentWindow?.removeEventListener('click', handleClick);
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
          const iframe = getIframe();
          if (!iframe) return;
          const { top, left } = iframe.getBoundingClientRect();
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

export const EditableText: React.FC<EditableTextProps> = ({
  value,
  onChange,
  tagName,
  ...props
}) => {
  const ref = useRef<HTMLElement>(null);

  const [editable, setEditable] = useState(false);

  useEffect(() => {
    if (editable && ref.current) {
      ref.current.focus();
      const sel = getSelection();
      if (sel) {
        sel.selectAllChildren(ref.current);
        sel.collapseToEnd();
      }
    } else {
      const selection = ref.current?.ownerDocument.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }
    }
  }, [editable]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      setEditable(false);
      console.log(e);
    };
    getIframe()?.contentWindow?.addEventListener('click', handleClick);
    return () => {
      getIframe()?.contentWindow?.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <ContentEditable
      innerRef={ref}
      html={value}
      tagName={tagName}
      disabled={!editable}
      onDoubleClick={() => setEditable(true)}
      onMouseDownCapture={(e) => editable && e.stopPropagation()}
      onClick={(e) => {
        editable && e.stopPropagation();
      }}
      onKeyDown={(e) => !e.shiftKey && e.key === 'Enter' && setEditable(false)}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  );
};

export const Setting: React.FC<{ label: string; control: ReactElement }> = ({ label, control }) => {
  const id = useId();

  const clonedControl = React.cloneElement(control, { id, style: { flexShrink: 1 } });

  return (
    <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', margin: '5px' }}>
      <label htmlFor={id} style={{ minWidth: 'max-content', paddingRight: '5px' }}>
        {label}:
      </label>
      {clonedControl}
    </div>
  );
};
