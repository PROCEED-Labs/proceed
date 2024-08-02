import { useNode, UserComponent, useEditor } from '@craftjs/core';

import { Button, Dropdown, MenuProps } from 'antd';

import EditableText from './_utils/EditableText';

type TableProps = {
  tableData?: string[][];
};

const TableCell: React.FC<
  React.PropsWithChildren<{
    rowIndex: number;
    content: string;
    onChange: (newContent: string) => void;
  }>
> = ({ rowIndex, content, onChange, children }) => {
  const contextMenu: MenuProps['items'] = [{ key: '1', label: 'Test' }];

  return (
    <Dropdown menu={{ items: contextMenu }} trigger={['contextMenu']}>
      {rowIndex ? (
        <td className="user-task-form-table-cell">
          <EditableText value={content} tagName="span" onChange={onChange} />
          {children}
        </td>
      ) : (
        <th className="user-task-form-table-cell">
          <EditableText value={content} tagName="span" onChange={onChange} />
          {children}
        </th>
      )}
    </Dropdown>
  );
};

const TableRow: React.FC<{
  tableData: Required<TableProps>['tableData'];
  rowIndex: number;
  isHovered: boolean;
  addColumn: (colIndex: number) => void;
  removeColumn: (colIndex: number) => void;
  addRow: (rowIndex: number) => void;
  removeRow: (rowIndex: number) => void;
  onUpdateContent: (newContent: string, rowIndex: number, colIndex: number) => void;
}> = ({
  tableData,
  rowIndex,
  isHovered,
  addColumn,
  removeColumn,
  addRow,
  removeRow,
  onUpdateContent,
}) => {
  const { editingEnabled } = useEditor((state) => ({ editingEnabled: state.options.enabled }));

  return (
    <tr>
      {tableData[rowIndex].map((col, colIndex) => (
        <TableCell
          rowIndex={rowIndex}
          key={`col-${colIndex}`}
          content={col}
          onChange={(newContent) => onUpdateContent(newContent, rowIndex, colIndex)}
        >
          {/* remove a column (cannot remove if there is only a single row) */}
          {editingEnabled &&
            isHovered &&
            rowIndex === tableData.length - 1 &&
            tableData.length > 1 && (
              <Button
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: '50%',
                  transform: 'translate(-50%,50%)',
                }}
                title="Remove Column"
                onClick={() => removeColumn(colIndex)}
              >
                -
              </Button>
            )}

          {/* add a column at the start or between two other columns */}
          {editingEnabled && isHovered && !rowIndex && (
            <Button
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transform: 'translate(-50%, -50%)',
              }}
              title="Add Column"
              onClick={() => addColumn(colIndex)}
            >
              +
            </Button>
          )}

          {/* add a column at the end */}
          {editingEnabled && isHovered && !rowIndex && colIndex === tableData[0].length - 1 && (
            <Button
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                transform: 'translate(50%, -50%)',
              }}
              title="Add Column"
              onClick={() => addColumn(colIndex + 1)}
            >
              +
            </Button>
          )}

          {/* remove a row (the header row cannot be removed) */}
          {editingEnabled && isHovered && !!rowIndex && !colIndex && (
            <Button
              style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                transform: 'translate(-50%, -50%)',
              }}
              title="Remove Row"
              onClick={() => removeRow(rowIndex)}
            >
              -
            </Button>
          )}

          {/* add a new row (cannot add a row before the header row) */}
          {editingEnabled && isHovered && colIndex === tableData[0].length - 1 && (
            // TODO: Seems not to work if the button is clicked outside of the borders of the table
            <Button
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                transform: 'translate(50%, 50%)',
              }}
              title="Add Row"
              onClick={() => addRow(rowIndex + 1)}
            >
              +
            </Button>
          )}
        </TableCell>
      ))}
    </tr>
  );
};

const Table: UserComponent<TableProps> = ({
  tableData = [
    ['Double Click Me', 'Double Click Me'],
    ['Double Click Me', 'Double Click Me'],
  ],
}) => {
  const { query, editingEnabled } = useEditor((state) => ({
    editingEnabled: state.options.enabled,
  }));

  const {
    connectors: { connect },
    actions: { setProp },
    isHovered,
  } = useNode((state) => {
    const parent = state.data.parent && query.node(state.data.parent).get();

    return { isHovered: !!parent && parent.events.hovered };
  });

  const addRow = (index: number) => {
    if (!editingEnabled) return;
    setProp((props: TableProps) => {
      props.tableData = [
        ...tableData.slice(0, index),
        Array.from({ length: tableData[0].length }, () => 'Double Click Me'),
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
      props.tableData = tableData.map((row) => [
        ...row.slice(0, index),
        'Double Click Me',
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

  return (
    <table
      className="user-task-form-table"
      ref={(r) => {
        r && connect(r);
      }}
    >
      <thead>
        <TableRow
          isHovered={isHovered}
          rowIndex={0}
          tableData={tableData}
          addRow={addRow}
          removeRow={removeRow}
          addColumn={addColumn}
          removeColumn={removeColumn}
          onUpdateContent={handleCellEdit}
        />
      </thead>
      <tbody>
        {[...Array(tableData.length - 1).keys()].map((index) => (
          <TableRow
            isHovered={isHovered}
            rowIndex={index + 1}
            tableData={tableData}
            key={`row-${index}`}
            addRow={addRow}
            removeRow={removeRow}
            addColumn={addColumn}
            removeColumn={removeColumn}
            onUpdateContent={handleCellEdit}
          />
        ))}
      </tbody>
    </table>
  );
};

Table.craft = {
  rules: {
    canDrag: () => false,
  },
  props: {
    tableData: [
      ['Double Click Me', 'Double Click Me'],
      ['Double Click Me', 'Double Click Me'],
    ],
  },
};

export default Table;
