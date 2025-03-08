import React, { ReactElement, ReactNode, useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button, Menu, MenuProps } from 'antd';
import { useDndContext } from '@dnd-kit/core';

import useBuilderStateStore from '../use-builder-state-store';
import { truthyFilter } from '@/lib/typescript-utils';
import { useCanEdit } from '../../modeler';

export const Setting: React.FC<{
  label: string;
  control: ReactElement;
  style?: React.CSSProperties;
}> = ({ label, control, style = {} }) => {
  const id = useId();

  const editingEnabled = useCanEdit();

  const clonedControl = React.cloneElement(control, { id, disabled: !editingEnabled });

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

type ContextMenuProps = React.PropsWithChildren<{
  onClose?: () => void;
  menu: MenuProps['items'];
}>;

export const ContextMenu: React.FC<ContextMenuProps> = ({ children, menu, onClose }) => {
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>();

  const editingEnabled = useCanEdit();

  const id = useId();
  const blockDragging = useBuilderStateStore((state) => state.blockDragging);
  const unblockDragging = useBuilderStateStore((state) => state.unblockDragging);

  const position = useMemo(() => {
    const iframe = getIframe();
    if (!iframe || !menuPosition) return;

    const pos = { ...menuPosition };

    const { top, left } = iframe.getBoundingClientRect();
    pos.top += top + 5;
    pos.left += left + 5;

    return pos;
  }, [menuPosition]);

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
        setMenuPosition(undefined);
        onClose?.();
      };

      const handleContextMenu = (e: MouseEvent) => {
        setMenuPosition(undefined);
        onClose?.();
      };

      window.addEventListener('click', handleClick);
      window.addEventListener('contextmenu', handleContextMenu);

      getIframe()?.contentWindow?.addEventListener('click', handleClick);
      getIframe()?.contentWindow?.addEventListener('contextmenu', handleContextMenu, {
        capture: true,
      });
      return () => {
        window.removeEventListener('click', handleClick);
        window.removeEventListener('contextmenu', handleContextMenu);
        getIframe()?.contentWindow?.removeEventListener('click', handleClick);
        getIframe()?.contentWindow?.removeEventListener('contextmenu', handleContextMenu, {
          capture: true,
        });
      };
    }
  }, [position, onClose]);

  return (
    <>
      {editingEnabled &&
        position &&
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
        onContextMenu={(e) => {
          setMenuPosition({ left: e.clientX, top: e.clientY });
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        {children}
      </div>
    </>
  );
};

type OverlayProps = React.PropsWithChildren<{
  show: boolean;
  onHide: () => void;
  controls: ({ icon: ReactNode; key: string } | undefined | false)[];
}>;

export const Overlay: React.FC<OverlayProps> = ({ show, onHide, controls, children }) => {
  const { active } = useDndContext();

  useEffect(() => {
    if (show) {
      window.addEventListener('mousemove', onHide);
      getIframe()?.contentWindow?.addEventListener('mousemove', onHide);
      return () => {
        window.removeEventListener('mousemove', onHide);
        getIframe()?.contentWindow?.removeEventListener('mousemove', onHide);
      };
    }
  }, [show]);

  return (
    <>
      {show && !active && (
        <div className="overlay-mask" onMouseMove={(e) => e.stopPropagation()}>
          {controls.filter(truthyFilter).map(({ icon, key }) => (
            <div className="overlay-control-icon" key={key}>
              {icon}
            </div>
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
  const editingEnabled = useCanEdit();

  return (
    <Button
      disabled={!editingEnabled || disabled}
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
