import { useNode, UserComponent, useEditor } from '@craftjs/core';

import { MenuProps } from 'antd';

import EditableText from '../_utils/EditableText';
import { ContextMenu } from '../utils';
import React, { useState } from 'react';

const defaultHeaderContent =
  '<b><strong class="text-style-bold" style="white-space: pre-wrap;">Double Click Me</strong></b>';
const defaultContent = 'Double Click Me';

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
  return React.createElement(
    type,
    {
      style: {
        fontWeight: 'normal',
        ...style,
      },
      className: 'user-task-form-table-cell',
      onContextMenu,
    },
    <EditableText value={content} tagName="span" onChange={onChange} />,
  );
};

type ContextMenuAction =
  | 'remove-row'
  | 'remove-col'
  | 'add-row-above'
  | 'add-row-below'
  | 'add-col-left'
  | 'add-col-right';

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
          <>
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
          </>
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
  } = useNode((state) => {
    const parent = state.data.parent && query.node(state.data.parent).get();

    return { isHovered: !!parent && parent.events.hovered };
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
      add.children.push({
        key: 'row-before-cell',
        label: 'Add Row Above',
        onClick: () => addRow(row),
        onMouseEnter: () => setHoveredContextMenuAction('add-row-above'),
        onMouseLeave: () => setHoveredContextMenuAction(undefined),
      });
    }
    add.children.push(
      {
        key: 'row-after-cell',
        label: 'Add Row Below',
        onClick: () => addRow(row + 1),
        onMouseEnter: () => setHoveredContextMenuAction('add-row-below'),
        onMouseLeave: () => setHoveredContextMenuAction(undefined),
      },
      {
        key: 'col-before-cell',
        label: 'Add Column Before',
        onClick: () => addColumn(col),
        onMouseEnter: () => setHoveredContextMenuAction('add-col-left'),
        onMouseLeave: () => setHoveredContextMenuAction(undefined),
      },
      {
        key: 'col-after-cell',
        label: 'Add Column After',
        onClick: () => addColumn(col + 1),
        onMouseEnter: () => setHoveredContextMenuAction('add-col-right'),
        onMouseLeave: () => setHoveredContextMenuAction(undefined),
      },
    );

    const deleteOptions: NonNullable<MenuProps['items']>[number] = {
      key: 'table-remove',
      label: 'Remove',
      children: [],
    };
    contextMenu.push(deleteOptions);
    if (row) {
      deleteOptions.children.push({
        key: 'delete-row',
        label: 'Delete Row',
        onClick: () => removeRow(row),
        onMouseEnter: () => setHoveredContextMenuAction('remove-row'),
        onMouseLeave: () => setHoveredContextMenuAction(undefined),
      });
    }
    if (tableData[0].length > 1) {
      deleteOptions.children.push({
        key: 'remove-column',
        label: 'Delete Colum',
        onClick: () => removeColumn(col),
        onMouseEnter: () => setHoveredContextMenuAction('remove-col'),
        onMouseLeave: () => setHoveredContextMenuAction(undefined),
      });
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
            onCellContextMenu={(row, col) => setContextMenuTargetCell({ row, col })}
            contextMenuTargetCell={contextMenuTargetCell}
            hoveredContextMenuAction={hoveredContextMenuAction}
          />
        </thead>
        <tbody>
          {[...Array(tableData.length - 1).keys()].map((index) => (
            <TableRow
              rowIndex={index + 1}
              tableRowData={tableData[index + 1]}
              key={`row-${index}`}
              onUpdateContent={handleCellEdit}
              onCellContextMenu={(row, col) => setContextMenuTargetCell({ row, col })}
              contextMenuTargetCell={contextMenuTargetCell}
              hoveredContextMenuAction={hoveredContextMenuAction}
            />
          ))}
        </tbody>
      </table>
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
