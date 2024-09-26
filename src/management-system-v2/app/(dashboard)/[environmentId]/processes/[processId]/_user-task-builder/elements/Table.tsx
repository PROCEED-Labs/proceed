import { useNode, UserComponent, useEditor } from '@craftjs/core';

import { Divider, MenuProps, Space } from 'antd';
import { SettingOutlined, EditOutlined } from '@ant-design/icons';
import {
  TbColumnInsertLeft,
  TbColumnInsertRight,
  TbColumnRemove,
  TbRowInsertTop,
  TbRowInsertBottom,
  TbRowRemove,
} from 'react-icons/tb';

import EditableText from '../_utils/EditableText';
import { ContextMenu, MenuItemFactoryFactory, Overlay, SidebarButtonFactory } from '../utils';
import React, { MouseEventHandler, useState } from 'react';
import { createPortal } from 'react-dom';

const defaultHeaderContent =
  '<b><strong class="text-style-bold" style="white-space: pre-wrap;">Header Cell</strong></b>';
const defaultContent = 'Table Cell';

type TableProps = {
  tableData?: string[][];
};

const TableCell: React.FC<
  React.PropsWithChildren<{
    type: 'th' | 'td';
    content: string;
    style?: React.CSSProperties;
    onContextMenu?: () => void;
    onChange?: (newContent: string) => void;
  }>
> = ({ type, content, style = {}, onChange = () => {}, onContextMenu }) => {
  const [hovered, setHovered] = useState(false);
  const [textEditing, setTextEditing] = useState(false);

  const handleContextMenu: MouseEventHandler | undefined = onContextMenu
    ? (e) => {
        onContextMenu();
        e.preventDefault();
      }
    : undefined;

  return React.createElement(
    type,
    {
      style,
      className: 'user-task-form-table-cell',
      onContextMenu: handleContextMenu,
      onMouseEnter: () => setHovered(true),
    },
    <Overlay
      show={!textEditing && hovered}
      onHide={() => setHovered(false)}
      controls={[
        {
          icon: <EditOutlined onClick={() => setTextEditing(true)} />,
          key: 'edit',
        },
        {
          icon: <SettingOutlined onClick={handleContextMenu} />,
          key: 'setting',
        },
      ]}
    >
      <EditableText
        active={textEditing}
        value={content}
        tagName="span"
        onChange={onChange}
        onStopEditing={() => setTextEditing(false)}
      />
    </Overlay>,
  );
};

const menuOptions = {
  'remove-row': { label: 'Delete Row', icon: <TbRowRemove size={20} /> },
  'remove-col': { label: 'Delete Column', icon: <TbColumnRemove size={20} /> },
  'add-row-above': { label: 'Add Row Above', icon: <TbRowInsertTop size={20} /> },
  'add-row-below': { label: 'Add Row Below', icon: <TbRowInsertBottom size={20} /> },
  'add-col-left': { label: 'Add Column Before', icon: <TbColumnInsertLeft size={20} /> },
  'add-col-right': { label: 'Add Column After', icon: <TbColumnInsertRight size={20} /> },
} as const;

type ContextMenuAction = keyof typeof menuOptions;
const toMenuItem = MenuItemFactoryFactory(menuOptions);

const SidebarButton = SidebarButtonFactory(menuOptions);

type TableRowProps = {
  tableRowData: Required<TableProps>['tableData'][number];
  rowIndex: number;
  cellStyle?: React.CSSProperties;
  onUpdateContent: (newContent: string, rowIndex: number, colIndex: number) => void;
  onCellContextMenu: (rowIndex: number, colIndex: number) => void;
  contextMenuTargetCell?: { row: number; col: number };
  hoveredContextMenuAction?: ContextMenuAction;
};

const TableRow: React.FC<TableRowProps> = ({
  tableRowData,
  rowIndex,
  cellStyle = {},
  onUpdateContent,
  onCellContextMenu,
  contextMenuTargetCell,
  hoveredContextMenuAction,
}) => {
  let targetRow = -1;
  let targetCol = -1;
  if (contextMenuTargetCell) {
    ({ row: targetRow, col: targetCol } = contextMenuTargetCell);
  }

  return (
    <>
      {hoveredContextMenuAction === 'add-row-above' && targetRow === rowIndex && (
        <TableRow
          tableRowData={tableRowData.map(() => defaultContent)}
          rowIndex={-2}
          cellStyle={{ backgroundColor: 'rgba(0,255,0,0.33)' }}
          onCellContextMenu={() => {}}
          onUpdateContent={() => {}}
        />
      )}
      <tr>
        {tableRowData.map((col, colIndex) => (
          <React.Fragment key={`table-cell-${rowIndex}-${colIndex}`}>
            {hoveredContextMenuAction === 'add-col-left' && targetCol === colIndex && (
              <TableCell
                type={rowIndex ? 'td' : 'th'}
                content={rowIndex ? defaultContent : defaultHeaderContent}
                style={{ backgroundColor: 'rgba(0,255,0,0.33)' }}
              />
            )}
            {
              <TableCell
                type={rowIndex ? 'td' : 'th'}
                content={col}
                style={{
                  backgroundColor:
                    (hoveredContextMenuAction === 'remove-row' && targetRow === rowIndex) ||
                    (hoveredContextMenuAction === 'remove-col' && targetCol === colIndex)
                      ? 'rgba(255,0,0,0.33)'
                      : undefined,
                  ...cellStyle,
                }}
                onContextMenu={() => onCellContextMenu(rowIndex, colIndex)}
                onChange={(newContent) => onUpdateContent(newContent, rowIndex, colIndex)}
              />
            }
            {hoveredContextMenuAction === 'add-col-right' && targetCol === colIndex && (
              <TableCell
                type={rowIndex ? 'td' : 'th'}
                content={rowIndex ? defaultContent : defaultHeaderContent}
                style={{ backgroundColor: 'rgba(0,255,0,0.33)' }}
              />
            )}
          </React.Fragment>
        ))}
      </tr>
      {hoveredContextMenuAction === 'add-row-below' && targetRow === rowIndex && (
        <TableRow
          tableRowData={tableRowData.map(() => defaultContent)}
          rowIndex={-2}
          cellStyle={{ backgroundColor: 'rgba(0,255,0,0.33)' }}
          onCellContextMenu={() => {}}
          onUpdateContent={() => {}}
        />
      )}
    </>
  );
};

const Table: UserComponent<TableProps> = ({
  tableData = [
    [defaultHeaderContent, defaultHeaderContent],
    [defaultContent, defaultContent],
  ],
}) => {
  const { query, editingEnabled } = useEditor((state) => ({
    editingEnabled: state.options.enabled,
  }));

  const {
    connectors: { connect },
    actions: { setProp },
    isSelected,
  } = useNode((state) => {
    const parent = state.data.parent && query.node(state.data.parent).get();

    return { isSelected: !!parent && parent.events.selected };
  });

  const [contextMenuTargetCell, setContextMenuTargetCell] =
    useState<TableRowProps['contextMenuTargetCell']>();
  const [hoveredContextMenuAction, setHoveredContextMenuAction] = useState<ContextMenuAction>();

  const addRow = (index: number) => {
    if (!editingEnabled) return;
    setProp((props: TableProps) => {
      props.tableData = [
        ...tableData.slice(0, index),
        Array.from({ length: tableData[0].length }, () => defaultContent),
        ...tableData.slice(index),
      ];
    });
  };
  const removeRow = (index: number) => {
    if (!editingEnabled) return;
    setProp((props: TableProps) => {
      props.tableData = [...tableData.slice(0, index), ...tableData.slice(index + 1, undefined)];
    });
  };

  const addColumn = (index: number) => {
    if (!editingEnabled) return;
    setProp((props: TableProps) => {
      props.tableData = tableData.map((row, rowIndex) => [
        ...row.slice(0, index),
        rowIndex ? defaultContent : defaultHeaderContent,
        ...row.slice(index),
      ]);
    });
  };
  const removeColumn = (index: number) => {
    if (!editingEnabled) return;
    setProp((props: TableProps) => {
      props.tableData = tableData.map((row) => [
        ...row.slice(0, index),
        ...row.slice(index + 1, undefined),
      ]);
    });
  };

  const handleCellEdit = (newContent: string, rowIndex: number, colIndex: number) => {
    if (!editingEnabled) return;
    const newRow = [
      ...tableData[rowIndex].slice(0, colIndex),
      newContent,
      ...tableData[rowIndex].slice(colIndex + 1, undefined),
    ];

    const newTableData = [
      ...tableData.slice(0, rowIndex),
      newRow,
      ...tableData.slice(rowIndex + 1, undefined),
    ];

    setProp((props: TableProps) => {
      props.tableData = newTableData;
    });
  };

  const contextMenu: MenuProps['items'] = [];

  if (contextMenuTargetCell) {
    const add: NonNullable<MenuProps['items']>[number] = {
      key: 'table-add',
      label: 'Add',
      children: [],
    };
    contextMenu.push(add);
    const { row, col } = contextMenuTargetCell;
    if (row) {
      add.children.push(
        toMenuItem('add-row-above', () => addRow(row), setHoveredContextMenuAction),
      );
    }
    add.children.push(
      toMenuItem('add-row-below', () => addRow(row + 1), setHoveredContextMenuAction),
      toMenuItem('add-col-left', () => addColumn(col), setHoveredContextMenuAction),
      toMenuItem('add-col-right', () => addColumn(col + 1), setHoveredContextMenuAction),
    );

    const deleteOptions: NonNullable<MenuProps['items']>[number] = {
      key: 'table-remove',
      label: 'Remove',
      children: [],
    };
    contextMenu.push(deleteOptions);
    if (row) {
      deleteOptions.children.push(
        toMenuItem('remove-row', () => removeRow(row), setHoveredContextMenuAction),
      );
    }
    if (tableData[0].length > 1) {
      deleteOptions.children.push(
        toMenuItem('remove-col', () => removeColumn(col), setHoveredContextMenuAction),
      );
    }
  }

  return (
    <ContextMenu
      menu={contextMenu}
      onClose={() => {
        setContextMenuTargetCell(undefined);
        setHoveredContextMenuAction(undefined);
      }}
    >
      <table
        className="user-task-form-table"
        ref={(r) => {
          r && connect(r);
        }}
      >
        <thead>
          <TableRow
            rowIndex={0}
            tableRowData={tableData[0]}
            onUpdateContent={handleCellEdit}
            onCellContextMenu={(row, col) => {
              setContextMenuTargetCell({ row, col });
            }}
            contextMenuTargetCell={contextMenuTargetCell}
            hoveredContextMenuAction={hoveredContextMenuAction}
          />
        </thead>
        <tbody>
          {[...Array(tableData.length - 1).keys()].map((index) => (
            <TableRow
              key={`row-${index}`}
              rowIndex={index + 1}
              tableRowData={tableData[index + 1]}
              onUpdateContent={handleCellEdit}
              onCellContextMenu={(row, col) => {
                setContextMenuTargetCell({ row, col });
              }}
              contextMenuTargetCell={contextMenuTargetCell}
              hoveredContextMenuAction={hoveredContextMenuAction}
            />
          ))}
        </tbody>
      </table>
      {isSelected &&
        contextMenuTargetCell &&
        createPortal(
          <>
            <Divider>Cell Settings</Divider>
            <Space style={{ width: '100%' }} direction="vertical" align="center">
              <Space.Compact>
                <SidebarButton
                  action="add-row-above"
                  disabled={contextMenuTargetCell.row === 0}
                  onClick={() => {
                    addRow(contextMenuTargetCell.row);
                    setContextMenuTargetCell({
                      ...contextMenuTargetCell,
                      row: contextMenuTargetCell.row + 1,
                    });
                  }}
                  onHovered={setHoveredContextMenuAction}
                />
                <SidebarButton
                  action="add-row-below"
                  onClick={() => addRow(contextMenuTargetCell.row + 1)}
                  onHovered={setHoveredContextMenuAction}
                />
                <SidebarButton
                  action="remove-row"
                  disabled={contextMenuTargetCell.row === 0}
                  onClick={() => {
                    removeRow(contextMenuTargetCell.row);
                    setContextMenuTargetCell(undefined);
                    setHoveredContextMenuAction(undefined);
                  }}
                  onHovered={setHoveredContextMenuAction}
                />
              </Space.Compact>
              <Space.Compact>
                <SidebarButton
                  action="add-col-left"
                  onClick={() => {
                    addColumn(contextMenuTargetCell.col);
                    setContextMenuTargetCell({
                      ...contextMenuTargetCell,
                      col: contextMenuTargetCell.col + 1,
                    });
                  }}
                  onHovered={setHoveredContextMenuAction}
                />
                <SidebarButton
                  action="add-col-right"
                  onClick={() => addColumn(contextMenuTargetCell.col + 1)}
                  onHovered={setHoveredContextMenuAction}
                />
                <SidebarButton
                  action="remove-col"
                  disabled={tableData[0].length <= 1}
                  onClick={() => {
                    removeColumn(contextMenuTargetCell.col);
                    setContextMenuTargetCell(undefined);
                    setHoveredContextMenuAction(undefined);
                  }}
                  onHovered={setHoveredContextMenuAction}
                />
              </Space.Compact>
            </Space>
          </>,
          document.getElementById('sub-element-settings-toolbar')!,
        )}
    </ContextMenu>
  );
};

Table.craft = {
  rules: {
    canDrag: () => false,
  },
  props: {
    tableData: [
      [
        // setting the th elements font weight to normal and giving lexical this as the default to enable changing the font weight in the editor
        defaultHeaderContent,
        defaultHeaderContent,
      ],
      [defaultContent, defaultContent],
    ],
  },
};

export default Table;
