import { Editor, Frame } from '@craftjs/core';
import React, {
  MouseEventHandler,
  ReactElement,
  ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactDOMServer from 'react-dom/server';
import { Button, Menu, MenuProps } from 'antd';

import * as Elements from './elements';
import { createPortal } from 'react-dom';
import useBuilderStateStore from './use-builder-state-store';
import { useDndContext } from '@dnd-kit/core';

const styles = `
body {
  font-size: 16px;
  line-height: 1.5;
  font-family: Verdana, Arial, Helvetica, sans-serif;
}

.user-task-form-column {
  flex: 1 0 0;
  box-sizing: border-box;
  height: fit-content;
  border: 2px solid rgba(0,0,0,0);
  padding: 0 10px;
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
  margin: 5px 0;
  display: flex;
  flex-wrap: wrap;
}

.user-task-form-container {
  min-height: 100%;
  border-radius: 8px;
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

.user-task-form-input label span {
  white-space: nowrap !important;
}

.user-task-form-input input {
  box-sizing: border-box;
  width: 100%;
  height: fit-content;
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
  font-weight: normal;
}

.user-task-form-input-group {
  position: relative;
  width: fit-content;
}

.user-task-form-input-group label, .user-task-form-input-group input {
  cursor: pointer;
}

.user-task-form-input-group-member {
  display: flex;
  align-items: center;
}

.user-task-form-input-group input[type="radio"] {
  width: 16px;
  height: 16px;
  margin: 3px 3px 6px 0;
}

.user-task-form-input-group input[type="checkbox"] {
  width: 16px;
  height: 16px;
  margin: 3px 3px 6px 0;
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

.text-style-bold {
  font-weight: 700;
}

.text-style-italic {
  font-style: italic;
}

.text-style-underline {
  text-decoration: underline;
}

.text-style-paragraph {
  margin: 0;
}

.text-style-heading {
  font-weight: normal;
}

.text-style-link {
  text-decoration: none;
}

`;

export function toHtml(json: string) {
  const markup = ReactDOMServer.renderToStaticMarkup(
    <Editor
      enabled={false}
      resolver={{
        ...Elements,
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

      .overlay-mask {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
        color: white;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 10;
        background-color: rgba(0,0,0,0.5);
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

export const Setting: React.FC<{
  label: string;
  control: ReactElement;
  style?: React.CSSProperties;
}> = ({ label, control, style = {} }) => {
  const id = useId();

  const clonedControl = React.cloneElement(control, { id });

  return (
    <div style={{ margin: '5px', ...style }}>
      <label htmlFor={id} style={{ minWidth: 'max-content', paddingRight: '5px' }}>
        {label}:
      </label>
      {clonedControl}
    </div>
  );
};

const getIframe = () =>
  document.getElementById('user-task-builder-iframe') as HTMLIFrameElement | undefined;

type ContextMenuTriggers = 'click' | 'contextMenu';

type ContextMenuProps = React.PropsWithChildren<{
  onClose?: () => void;
  menu: MenuProps['items'];
  externalPosition?: { top: number; left: number };
  triggers?: ContextMenuTriggers[];
}>;

export const ContextMenu: React.FC<ContextMenuProps> = ({
  children,
  menu,
  onClose,
  externalPosition,
  triggers = ['contextMenu'],
}) => {
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>();

  const touchedElRef = useRef(false);

  useEffect(() => {
    if (externalPosition) touchedElRef.current = true;
  }, [externalPosition]);

  const id = useId();
  const blockDragging = useBuilderStateStore((state) => state.blockDragging);
  const unblockDragging = useBuilderStateStore((state) => state.unblockDragging);

  const position = useMemo(() => {
    const iframe = getIframe();
    if (!iframe || !(externalPosition || menuPosition)) return;

    const pos = { ...(externalPosition || menuPosition)! };

    const { top, left } = iframe.getBoundingClientRect();
    pos.top += top + 5;
    pos.left += left + 5;

    return pos;
  }, [externalPosition, menuPosition]);

  const open = !!position;
  useEffect(() => {
    if (open) {
      blockDragging(id);

      return () => {
        unblockDragging(id);
      };
    }
  }, [id, open]);

  useEffect(() => {
    if (position) {
      const handleClick = () => {
        if (!touchedElRef.current) {
          setMenuPosition(undefined);
          onClose?.();
        }
        touchedElRef.current = false;
      };

      const handleContextMenu = (e: MouseEvent) => {
        if (touchedElRef.current) {
          e.stopPropagation();
        } else {
          setMenuPosition(undefined);
          onClose?.();
        }
        touchedElRef.current = false;
      };

      window.addEventListener('click', handleClick);
      window.addEventListener('contextmenu', handleContextMenu);

      getIframe()?.contentWindow?.addEventListener('click', handleClick);
      getIframe()?.contentWindow?.addEventListener('contextmenu', handleContextMenu);
      return () => {
        window.removeEventListener('click', handleClick);
        window.removeEventListener('contextmenu', handleContextMenu);
        getIframe()?.contentWindow?.removeEventListener('click', handleClick);
        getIframe()?.contentWindow?.removeEventListener('contextmenu', handleContextMenu);
      };
    }
  }, [position, onClose]);

  const handleOpen: MouseEventHandler = (e) => {
    setMenuPosition({ left: e.clientX, top: e.clientY });
    touchedElRef.current = true;
    e.preventDefault();
  };

  return (
    <>
      {position &&
        createPortal(
          <Menu
            style={{
              borderRadius: '0.5rem',
              boxShadow:
                '0 0.375rem 1rem 0 rgba(0, 0, 0, 0.08), 0 0.1875rem 0.375rem -0.25rem rgba(0, 0, 0, 0.12), 0 0.5625rem 1.75rem 0.5rem rgba(0, 0, 0, 0.05)',
              zIndex: 1000,
              position: 'absolute',
              ...position,
            }}
            items={menu?.length ? menu : [{ key: 'empty-menu', label: 'No Settings available' }]}
          />,
          document.body,
        )}
      <div
        onContextMenu={triggers.includes('contextMenu') ? handleOpen : undefined}
        onClick={
          triggers.includes('click')
            ? (e) => {
                handleOpen(e);
                e.stopPropagation();
              }
            : undefined
        }
      >
        {children}
      </div>
    </>
  );
};

type OverlayProps = React.PropsWithChildren<{
  show: boolean;
  controls: { icon: ReactNode; key: string }[];
}>;

export const Overlay: React.FC<OverlayProps> = ({ show, controls, children }) => {
  const { active } = useDndContext();

  return (
    <>
      {show && !active && (
        <div className="overlay-mask">
          {controls.map(({ icon, key }) => (
            <span style={{ margin: '0 3px' }} key={key}>
              {icon}
            </span>
          ))}
        </div>
      )}
      {children}
    </>
  );
};

type Option = { label: string; icon: ReactNode };

type SidebarButtonProps<T extends string> = {
  action: T;
  options: Record<T, Option>;
  disabled?: boolean;
  onClick: () => void;
  onHovered: (action: T | undefined) => void;
};

function SidebarButton<T extends string>({
  action,
  options,
  disabled,
  onClick,
  onHovered,
}: SidebarButtonProps<T>) {
  return (
    <Button
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      icon={options[action].icon}
      onMouseEnter={() => onHovered(action)}
      onMouseLeave={() => onHovered(undefined)}
    />
  );
}

export function SidebarButtonFactory<T extends string>(options: Record<T, Option>) {
  return (args: Omit<SidebarButtonProps<T>, 'options'>) => SidebarButton<T>({ ...args, options });
}

function MenuItemFactory<T extends string>(
  options: Record<T, Option>,
  action: T,
  onClick: () => void,
  onHovered: (action: T | undefined) => void,
): NonNullable<MenuProps['items']>[number] {
  return {
    key: action,
    label: options[action].label,
    onClick,
    onMouseEnter: () => onHovered(action),
    onMouseLeave: () => onHovered(undefined),
  };
}

// found here: https://stackoverflow.com/a/55344772
type Tail<T extends any[]> = T extends [infer A, ...infer R] ? R : never;

export function MenuItemFactoryFactory<T extends string>(options: Record<T, Option>) {
  return (...args: Tail<Parameters<typeof MenuItemFactory<T>>>) =>
    MenuItemFactory<T>(options, ...args);
}
