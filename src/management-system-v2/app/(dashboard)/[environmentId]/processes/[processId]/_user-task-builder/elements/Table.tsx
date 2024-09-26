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
import React, { MouseEventHandler, useEffect, useState } from 'react';
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
    onEdit?: () => void;
    onChange?: (newContent: string) => void;
  }>
> = ({ type, content, style = {}, onChange = () => {}, onEdit }) => {
  const [hovered, setHovered] = useState(false);
  const [textEditing, setTextEditing] = useState(false);

  return React.createElement(
    type,
    {
      style,
      className: 'user-task-form-table-cell',
      onContextMenu: onEdit,
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
          icon: <SettingOutlined onClick={onEdit} />,
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

type CellAction = keyof typeof menuOptions;
const toMenuItem = MenuItemFactoryFactory(menuOptions);

const SidebarButton = SidebarButtonFactory(menuOptions);

type TableRowProps = {
  tableRowData: Required<TableProps>['tableData'][number];
  rowIndex: number;
  cellStyle?: React.CSSProperties;
  onUpdateContent: (newContent: string, rowIndex: number, colIndex: number) => void;
  onEditCell: (rowIndex: number, colIndex: number) => void;
  targetCell?: { row: number; col: number };
  cellAction?: CellAction;
};

const TableRow: React.FC<TableRowProps> = ({
  tableRowData,
  rowIndex,
  cellStyle = {},
  onUpdateContent,
  onEditCell,
  targetCell,
  cellAction,
}) => {
  let targetRow = -1;
  let targetCol = -1;
  if (targetCell) {
    ({ row: targetRow, col: targetCol } = targetCell);
  }

  return (
    <>
      {cellAction === 'add-row-above' && targetRow === rowIndex && (
        <TableRow
          tableRowData={tableRowData.map(() => defaultContent)}
          rowIndex={-2}
          cellStyle={{ backgroundColor: 'rgba(0,255,0,0.33)' }}
          onEditCell={() => {}}
          onUpdateContent={() => {}}
        />
      )}
      <tr>
        {tableRowData.map((col, colIndex) => (
          <React.Fragment key={`table-cell-${rowIndex}-${colIndex}`}>
            {cellAction === 'add-col-left' && targetCol === colIndex && (
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
                    (cellAction === 'remove-row' && targetRow === rowIndex) ||
                    (cellAction === 'remove-col' && targetCol === colIndex)
                      ? 'rgba(255,0,0,0.33)'
                      : undefined,
                  ...cellStyle,
                }}
                onEdit={() => onEditCell(rowIndex, colIndex)}
                onChange={(newContent) => onUpdateContent(newContent, rowIndex, colIndex)}
              />
            }
            {cellAction === 'add-col-right' && targetCol === colIndex && (
              <TableCell
                type={rowIndex ? 'td' : 'th'}
                content={rowIndex ? defaultContent : defaultHeaderContent}
                style={{ backgroundColor: 'rgba(0,255,0,0.33)' }}
              />
            )}
          </React.Fragment>
        ))}
      </tr>
      {cellAction === 'add-row-below' && targetRow === rowIndex && (
        <TableRow
          tableRowData={tableRowData.map(() => defaultContent)}
          rowIndex={-2}
          cellStyle={{ backgroundColor: 'rgba(0,255,0,0.33)' }}
          onEditCell={() => {}}
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

  const [targetCell, setTargetCell] = useState<TableRowProps['targetCell']>();
  const [hoveredAction, setHoveredAction] = useState<CellAction>();

  useEffect(() => {
    if (!isSelected) {
      setTargetCell(undefined);
      setHoveredAction(undefined);
    }
  }, [isSelected]);

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

  if (targetCell) {
    const add: NonNullable<MenuProps['items']>[number] = {
      key: 'table-add',
      label: 'Add',
      children: [],
    };
    contextMenu.push(add);
    const { row, col } = targetCell;
    if (row) {
      add.children.push(toMenuItem('add-row-above', () => addRow(row), setHoveredAction));
    }
    add.children.push(
      toMenuItem('add-row-below', () => addRow(row + 1), setHoveredAction),
      toMenuItem('add-col-left', () => addColumn(col), setHoveredAction),
      toMenuItem('add-col-right', () => addColumn(col + 1), setHoveredAction),
    );

    const deleteOptions: NonNullable<MenuProps['items']>[number] = {
      key: 'table-remove',
      label: 'Remove',
      children: [],
    };
    contextMenu.push(deleteOptions);
    if (row) {
      deleteOptions.children.push(toMenuItem('remove-row', () => removeRow(row), setHoveredAction));
    }
    if (tableData[0].length > 1) {
      deleteOptions.children.push(
        toMenuItem('remove-col', () => removeColumn(col), setHoveredAction),
      );
    }
  }

  return (
    <ContextMenu
      menu={contextMenu}
      onClose={() => {
        setTargetCell(undefined);
        setHoveredAction(undefined);
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
            onEditCell={(row, col) => {
              setTargetCell({ row, col });
            }}
            targetCell={targetCell}
            cellAction={hoveredAction}
          />
        </thead>
        <tbody>
          {[...Array(tableData.length - 1).keys()].map((index) => (
            <TableRow
              key={`row-${index}`}
              rowIndex={index + 1}
              tableRowData={tableData[index + 1]}
              onUpdateContent={handleCellEdit}
              onEditCell={(row, col) => {
                setTargetCell({ row, col });
              }}
              targetCell={targetCell}
              cellAction={hoveredAction}
            />
          ))}
        </tbody>
      </table>
      {isSelected &&
        targetCell &&
        createPortal(
          <>
            <Divider>Cell Settings</Divider>
            <Space style={{ width: '100%' }} direction="vertical" align="center">
              <Space.Compact>
                <SidebarButton
                  action="add-row-above"
                  disabled={targetCell.row === 0}
                  onClick={() => {
                    addRow(targetCell.row);
                    setTargetCell({
                      ...targetCell,
                      row: targetCell.row + 1,
                    });
                  }}
                  onHovered={setHoveredAction}
                />
                <SidebarButton
                  action="add-row-below"
                  onClick={() => addRow(targetCell.row + 1)}
                  onHovered={setHoveredAction}
                />
                <SidebarButton
                  action="remove-row"
                  disabled={targetCell.row === 0}
                  onClick={() => {
                    removeRow(targetCell.row);
                    setTargetCell(undefined);
                    setHoveredAction(undefined);
                  }}
                  onHovered={setHoveredAction}
                />
              </Space.Compact>
              <Space.Compact>
                <SidebarButton
                  action="add-col-left"
                  onClick={() => {
                    addColumn(targetCell.col);
                    setTargetCell({
                      ...targetCell,
                      col: targetCell.col + 1,
                    });
                  }}
                  onHovered={setHoveredAction}
                />
                <SidebarButton
                  action="add-col-right"
                  onClick={() => addColumn(targetCell.col + 1)}
                  onHovered={setHoveredAction}
                />
                <SidebarButton
                  action="remove-col"
                  disabled={tableData[0].length <= 1}
                  onClick={() => {
                    removeColumn(targetCell.col);
                    setTargetCell(undefined);
                    setHoveredAction(undefined);
                  }}
                  onHovered={setHoveredAction}
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
