import React, {
  MouseEvent,
  ReactElement,
  ReactNode,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { Button, Menu, MenuProps, Select, Space } from 'antd';
import { useDndContext } from '@dnd-kit/core';

import useBuilderStateStore from '../use-builder-state-store';
import { truthyFilter } from '@/lib/typescript-utils';
import { useCanEdit } from '../../modeler';
import type { Variable as ProcessVariable } from '@proceed/bpmn-helper/src/getters';
import useProcessVariables from '../../use-process-variables';
import ProcessVariableForm, {
  textFormatMap,
  typeLabelMap,
} from '../../variable-definition/process-variable-form';

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

      const handleContextMenu = () => {
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
  onDoubleClick?: (e: MouseEvent<HTMLDivElement>) => void;
}>;

export const Overlay: React.FC<OverlayProps> = ({
  show,
  onHide,
  controls,
  children,
  onDoubleClick,
}) => {
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
        <div
          className="overlay-mask"
          onMouseMove={(e) => e.stopPropagation()}
          onDoubleClick={onDoubleClick}
        >
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

export function getVariableTooltip(variables: ProcessVariable[], name?: string) {
  if (!name) return;
  const variable = variables.find((v) => v.name === name);
  if (!variable) return;

  let tooltip = `Type: ${typeLabelMap[variable.dataType as keyof typeof typeLabelMap]}`;

  if (variable.description) tooltip += `\nDescription: ${variable.description}`;

  return tooltip;
}

type AllowedTypes = React.ComponentProps<typeof ProcessVariableForm>['allowedTypes'];
type VariableSettingProps = {
  variable?: string;
  allowedTypes?: AllowedTypes;
  onChange: (
    newVariableName?: string,
    newVariableType?: NonNullable<AllowedTypes>[number],
    newVariableFormat?: keyof typeof textFormatMap,
  ) => void;
};

export const VariableSetting: React.FC<VariableSettingProps> = ({
  variable,
  allowedTypes,
  onChange,
}) => {
  const [showVariableForm, setShowVariableForm] = useState(false);

  const { variables, addVariable } = useProcessVariables();

  const validVariables = variables.filter(
    (variable) =>
      !allowedTypes || allowedTypes.includes(variable.dataType as (typeof allowedTypes)[number]),
  );

  return (
    <Setting
      label="Variable"
      control={
        <>
          <Select
            value={variable}
            style={{ display: 'block' }}
            title={getVariableTooltip(variables, variable)}
            options={validVariables.map((v) => ({
              label: v.name,
              title: getVariableTooltip(variables, v.name),
              value: v.name,
            }))}
            onChange={(val) => {
              const variable = variables.find((v) => v.name === val);
              onChange(val, variable?.dataType, variable?.textFormat);
            }}
            dropdownRender={(menu) => (
              <>
                {menu}
                <Space style={{ display: 'block', padding: '0 8px 4px' }}>
                  <Button block onClick={() => setShowVariableForm(true)}>
                    Add Variable
                  </Button>
                </Space>
              </>
            )}
          />
          <ProcessVariableForm
            open={showVariableForm}
            variables={variables}
            allowedTypes={allowedTypes}
            onSubmit={(newVar) => {
              addVariable(newVar);
              setShowVariableForm(false);
              onChange(newVar.name, newVar.dataType, newVar.textFormat);
            }}
            onCancel={() => setShowVariableForm(false)}
          />
        </>
      }
    />
  );
};
