import { useNode, UserComponent, useEditor } from '@craftjs/core';

import { Divider, MenuProps, Space } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import {
  TbColumnInsertLeft,
  TbColumnInsertRight,
  TbColumnRemove,
  TbRowInsertTop,
  TbRowInsertBottom,
  TbRowRemove,
  TbArrowBarUp,
  TbArrowBarDown,
  TbArrowBarLeft,
  TbArrowBarRight,
} from 'react-icons/tb';

import cn from 'classnames';

import EditableText from '../_utils/EditableText';
import { ContextMenu, MenuItemFactoryFactory, Overlay, SidebarButtonFactory } from './utils';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import useEditorStateStore from '../use-editor-state-store';
import { DeleteOutlined } from '@ant-design/icons';
import { useDeleteControl } from './utils';
import { DeleteButton } from '../DeleteButton';

const defaultHeaderContent =
  '<b><strong class="text-style-bold" style="white-space: pre-wrap;">Header Cell</strong></b>';
const defaultContent = 'Table Cell';

type TableProps = {
  tableData?: string[][];
};

type CellDataWithPreviews = {
  content: string;
  isEditTarget?: boolean;
  isRemovePreview?: boolean;
  isAddPreview?: boolean;
};

const TableCell: React.FC<
  React.PropsWithChildren<{
    type: 'th' | 'td';
    data: CellDataWithPreviews;
    style?: React.CSSProperties;
    onEdit?: () => void;
    onChange?: (newContent: string) => void;
  }>
> = ({
  type,
  data: { content, isEditTarget, isRemovePreview, isAddPreview },
  style = {},
  onChange = () => {},
  onEdit,
}) => {
  const [hovered, setHovered] = useState(false);
  const [textEditing, setTextEditing] = useState(false);

  const editingEnabled = useEditorStateStore((state) => state.editingEnabled);

  return React.createElement(
    type,
    {
      style,
      className: cn('user-task-form-table-cell', {
        'target-sub-element': isEditTarget && !isRemovePreview,
        'sub-element-add-preview': isAddPreview,
        'sub-element-remove-preview': isRemovePreview,
      }),
      onClick: () => onEdit?.(),
      onContextMenu: onEdit,
      onMouseEnter: () => setHovered(true),
    },
    <Overlay
      show={editingEnabled && !textEditing && hovered}
      onHide={() => setHovered(false)}
      controls={[
        {
          icon: <EditOutlined onClick={() => setTextEditing(true)} />,
          key: 'edit',
        },
      ]}
      onDoubleClick={() => setTextEditing(true)}
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
  'move-row-down': { label: 'Move Row Down', icon: <TbArrowBarDown size={20} /> },
  'move-row-up': { label: 'Move Row Up', icon: <TbArrowBarUp size={20} /> },
  'move-col-left': { label: 'Move Column Left', icon: <TbArrowBarLeft size={20} /> },
  'move-col-right': { label: 'Move Column Right', icon: <TbArrowBarRight size={20} /> },
} as const;

type CellAction = keyof typeof menuOptions;
const toMenuItem = MenuItemFactoryFactory(menuOptions);

const SidebarButton = SidebarButtonFactory(menuOptions);

type TableRowProps = {
  tableRowData: CellDataWithPreviews[];
  rowIndex: number;
  onUpdateContent: (newContent: string, rowIndex: number, colIndex: number) => void;
  onEditCell: (rowIndex: number, colIndex: number) => void;
};

const TableRow: React.FC<TableRowProps> = ({
  tableRowData,
  rowIndex,
  onUpdateContent,
  onEditCell,
}) => {
  return (
    <>
      <tr>
        {tableRowData.map((col, colIndex) => (
          <TableCell
            type={rowIndex ? 'td' : 'th'}
            data={col}
            onEdit={() => onEditCell(rowIndex, colIndex)}
            onChange={(newContent) => onUpdateContent(newContent, rowIndex, colIndex)}
            key={`table-cell-${rowIndex}-${colIndex}`}
          />
        ))}
      </tr>
    </>
  );
};

const Table: UserComponent<TableProps> = ({
  tableData = [
    [defaultHeaderContent, defaultHeaderContent],
    [defaultContent, defaultContent],
  ],
}) => {
  const { query } = useEditor();

  const {
    connectors: { connect },
    actions: { setProp },
    isSelected,
  } = useNode((state) => {
    const parent = state.data.parent && query.node(state.data.parent).get();

    return { isSelected: !!parent && parent.events.selected };
  });

  const [targetCell, setTargetCell] = useState<{ row: number; col: number }>();
  const [hoveredAction, setHoveredAction] = useState<CellAction>();
  const [hoveredTable, setHoveredTable] = useState(false);
  const { handleDelete } = useDeleteControl();
  useEffect(() => {
    if (!isSelected) {
      setTargetCell(undefined);
      setHoveredAction(undefined);
    }
  }, [isSelected]);

  const editingEnabled = useEditorStateStore((state) => state.editingEnabled);

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

  const handleMoveDown = (index: number) => {
    if (!editingEnabled) return;
    setProp((props: TableProps) => {
      props.tableData = [
        ...tableData.slice(0, index),
        tableData[index + 1],
        tableData[index],
        ...tableData.slice(index + 2),
      ];
    });
  };

  const handleMoveUp = (index: number) => {
    if (!editingEnabled) return;
    setProp((props: TableProps) => {
      props.tableData = [
        ...tableData.slice(0, index - 1),
        tableData[index],
        tableData[index - 1],
        ...tableData.slice(index + 1),
      ];
    });
  };

  const handleMoveRight = (index: number) => {
    if (!editingEnabled) return;
    setProp((props: TableProps) => {
      props.tableData = tableData.map((row) => [
        ...row.slice(0, index),
        row[index + 1],
        row[index],
        ...row.slice(index + 2),
      ]);
    });
  };

  const handleMoveLeft = (index: number) => {
    if (!editingEnabled) return;
    setProp((props: TableProps) => {
      props.tableData = tableData.map((row) => [
        ...row.slice(0, index - 1),
        row[index],
        row[index - 1],
        ...row.slice(index + 1),
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

    const move: NonNullable<MenuProps['items']>[number] = {
      key: 'table-move',
      label: 'Move',
      children: [],
    };

    if (row > 1) {
      move.children.push(toMenuItem('move-row-up', () => handleMoveUp(row), setHoveredAction));
    }
    if (row && row < tableData.length - 1) {
      move.children.push(toMenuItem('move-row-down', () => handleMoveDown(row), setHoveredAction));
    }
    if (col) {
      move.children.push(toMenuItem('move-col-left', () => handleMoveLeft(col), setHoveredAction));
    }
    if (col < tableData[0].length - 1) {
      move.children.push(
        toMenuItem('move-col-right', () => handleMoveRight(col), setHoveredAction),
      );
    }
    if (move.children.length) contextMenu.push(move);

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

  const tableDataWithPreviews = useMemo(() => {
    let dataCopy = tableData.map((row, rowIndex) => {
      const rowCopy: CellDataWithPreviews[] = row.map((content, colIndex) => {
        if (targetCell) {
          return {
            content,
            isEditTarget: targetCell.row === rowIndex && targetCell.col === colIndex,
            isRemovePreview:
              (hoveredAction === 'remove-row' && targetCell.row === rowIndex) ||
              (hoveredAction === 'remove-col' && targetCell.col === colIndex),
          };
        }
        return { content };
      });

      if (targetCell) {
        if (hoveredAction === 'add-col-left') {
          rowCopy.splice(targetCell.col, 0, {
            content: rowIndex ? defaultContent : defaultHeaderContent,
            isAddPreview: true,
          });
        } else if (hoveredAction === 'add-col-right') {
          rowCopy.splice(targetCell.col + 1, 0, {
            content: rowIndex ? defaultContent : defaultHeaderContent,
            isAddPreview: true,
          });
        }
      }

      return rowCopy;
    });
    if (targetCell) {
      if (hoveredAction === 'add-row-above') {
        dataCopy.splice(
          targetCell.row,
          0,
          tableData[0].map(() => ({
            content: defaultContent,
            isAddPreview: true,
          })),
        );
      } else if (hoveredAction === 'add-row-below') {
        dataCopy.splice(
          targetCell.row + 1,
          0,
          tableData[0].map(() => ({
            content: defaultContent,
            isAddPreview: true,
          })),
        );
      } else if (hoveredAction === 'move-row-up' && targetCell.row > 1) {
        dataCopy = [
          ...dataCopy.slice(0, targetCell.row - 1),
          dataCopy[targetCell.row].map((c) => ({ ...c, isAddPreview: true })),
          dataCopy[targetCell.row - 1],
          dataCopy[targetCell.row].map((c) => ({ ...c, isRemovePreview: true })),
          ...dataCopy.slice(targetCell.row + 1),
        ];
      } else if (hoveredAction === 'move-row-down' && targetCell.row < tableData.length - 1) {
        dataCopy = [
          ...dataCopy.slice(0, targetCell.row),
          dataCopy[targetCell.row].map((c) => ({ ...c, isRemovePreview: true })),
          dataCopy[targetCell.row + 1],
          dataCopy[targetCell.row].map((c) => ({ ...c, isAddPreview: true })),
          ...dataCopy.slice(targetCell.row + 2),
        ];
      } else if (hoveredAction === 'move-col-left' && targetCell.col > 0) {
        dataCopy = dataCopy.map((row) => [
          ...row.slice(0, targetCell.col - 1),
          { ...row[targetCell.col], isAddPreview: true },
          row[targetCell.col - 1],
          { ...row[targetCell.col], isRemovePreview: true },
          ...row.slice(targetCell.col + 1),
        ]);
      } else if (hoveredAction === 'move-col-right' && targetCell.col < tableData[0].length - 1) {
        dataCopy = dataCopy.map((row) => [
          ...row.slice(0, targetCell.col),
          { ...row[targetCell.col], isRemovePreview: true },
          row[targetCell.col + 1],
          { ...row[targetCell.col], isAddPreview: true },
          ...row.slice(targetCell.col + 2),
        ]);
      }
    }

    return dataCopy;
  }, [tableData, targetCell, hoveredAction]);

  return (
    <ContextMenu
      menu={contextMenu}
      onClose={() => {
        setTargetCell(undefined);
        setHoveredAction(undefined);
      }}
    >
      {/* Just show one delete button for whole table on its upper left corner */}
      <div
        style={{ position: 'relative' }}
        onMouseEnter={() => setHoveredTable(true)}
        onMouseLeave={() => setHoveredTable(false)}
      >
        <DeleteButton show={editingEnabled && hoveredTable && !targetCell} onClick={handleDelete} />
        <table
          className="user-task-form-table"
          ref={(r) => {
            r && connect(r);
          }}
        >
          <thead>
            <TableRow
              rowIndex={0}
              tableRowData={tableDataWithPreviews[0]}
              onUpdateContent={handleCellEdit}
              onEditCell={(row, col) => {
                setTargetCell({ row, col });
              }}
            />
          </thead>
          <tbody>
            {[...Array(tableDataWithPreviews.length - 1).keys()].map((index) => (
              <TableRow
                key={`row-${index}`}
                rowIndex={index + 1}
                tableRowData={tableDataWithPreviews[index + 1]}
                onUpdateContent={handleCellEdit}
                onEditCell={(row, col) => {
                  setTargetCell({ row, col });
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
      {isSelected &&
        targetCell &&
        createPortal(
          <>
            <Divider>Cell Settings</Divider>
            <Space style={{ width: '100%' }} orientation="vertical" align="center">
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
                <SidebarButton
                  action="move-row-down"
                  disabled={targetCell.row >= tableData.length - 1}
                  onClick={() => {
                    handleMoveDown(targetCell.row);
                    setTargetCell({ ...targetCell, row: targetCell.row + 1 });
                  }}
                  onHovered={setHoveredAction}
                />
                <SidebarButton
                  action="move-row-up"
                  disabled={targetCell.row < 2}
                  onClick={() => {
                    handleMoveUp(targetCell.row);
                    setTargetCell({ ...targetCell, row: targetCell.row - 1 });
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
                <SidebarButton
                  action="move-col-left"
                  disabled={!targetCell.col}
                  onClick={() => {
                    handleMoveLeft(targetCell.col);
                    setTargetCell({ ...targetCell, col: targetCell.col - 1 });
                  }}
                  onHovered={setHoveredAction}
                />
                <SidebarButton
                  action="move-col-right"
                  disabled={targetCell.col >= tableData[0].length - 1}
                  onClick={() => {
                    handleMoveRight(targetCell.col);
                    setTargetCell({ ...targetCell, col: targetCell.col + 1 });
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
