import { useNode, UserComponent, useEditor } from '@craftjs/core';

import { Button, InputNumber, Input, Dropdown, MenuProps } from 'antd';

import { useState } from 'react';

type TableProps = {
  tableData?: string[][];
};

const Table: UserComponent<TableProps> = ({
  tableData = [
    ['Double Click Me', 'Double Click Me'],
    ['Double Click Me', 'Double Click Me'],
  ],
}) => {
  const { query } = useEditor();

  const {
    connectors: { connect },
    actions: { setProp },
    isHovered,
  } = useNode((state) => {
    const parent = state.data.parent && query.node(state.data.parent).get();

    return { isHovered: !!parent && parent.events.hovered };
  });

  const [cellEditing, setCellEditing] = useState({ row: -1, col: -1, value: '' });

  const addRow = (index: number) => {
    setProp((props) => {
      props.tableData = [
        ...tableData.slice(0, index),
        Array.from({ length: tableData[0].length }, () => 'Double Click Me'),
        ...tableData.slice(index),
      ];
    });
  };
  const removeRow = (index: number) => {
    setProp((props) => {
      props.tableData = [...tableData.slice(0, index), ...tableData.slice(index + 1, undefined)];
    });
  };

  const addColumn = (index: number) => {
    setProp((props) => {
      props.tableData = tableData.map((row) => [
        ...row.slice(0, index),
        'Double Click Me',
        ...row.slice(index),
      ]);
    });
  };
  const removeColumn = (index: number) => {
    setProp((props) => {
      props.tableData = tableData.map((row) => [
        ...row.slice(0, index),
        ...row.slice(index + 1, undefined),
      ]);
    });
  };

  const handleCellEditSave = () => {
    const { row, col, value } = cellEditing;

    const newRow = [
      ...tableData[row].slice(0, col),
      value,
      ...tableData[row].slice(col + 1, undefined),
    ];

    const newTableData = [
      ...tableData.slice(0, row),
      newRow,
      ...tableData.slice(row + 1, undefined),
    ];

    setProp((props) => {
      props.tableData = newTableData;
    });

    setCellEditing({ row: -1, col: -1, value: '' });
  };

  const TableCell: React.FC<
    React.PropsWithChildren<{ rowIndex: number; onDoubleClick: () => void }>
  > = ({ rowIndex, children, onDoubleClick }) => {
    const contextMenu: MenuProps['items'] = [{ key: '1', label: 'Test' }];

    return (
      <Dropdown menu={{ items: contextMenu }} trigger={['contextMenu']}>
        {rowIndex ? (
          <td className="user-task-form-table-cell" onDoubleClick={onDoubleClick}>
            {children}
          </td>
        ) : (
          <th className="user-task-form-table-cell" onDoubleClick={onDoubleClick}>
            {children}
          </th>
        )}
      </Dropdown>
    );
  };

  const TableRow: React.FC<{ tD: typeof tableData; rowIndex: number }> = ({ tD, rowIndex }) => {
    return (
      <tr>
        {tableData[rowIndex].map((col, colIndex) => (
          <TableCell
            rowIndex={rowIndex}
            key={`col-${colIndex}`}
            onDoubleClick={() => setCellEditing({ row: rowIndex, col: colIndex, value: col })}
          >
            {/* remove a column (cannot remove if there is only a single row) */}
            {isHovered && rowIndex === tD.length - 1 && tD.length > 1 && (
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
            {isHovered && !rowIndex && (
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
            {isHovered && !rowIndex && colIndex === tD[0].length - 1 && (
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
            {isHovered && !!rowIndex && !colIndex && (
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
            {isHovered && colIndex === tD[0].length - 1 && (
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

            {rowIndex === cellEditing.row && colIndex === cellEditing.col ? (
              <Input
                autoFocus
                value={cellEditing.value}
                onChange={(e) => setCellEditing({ ...cellEditing, value: e.target.value })}
                onBlur={handleCellEditSave}
                onPressEnter={handleCellEditSave}
              />
            ) : (
              <>{col}</>
            )}
          </TableCell>
        ))}
      </tr>
    );
  };

  return (
    <table className="user-task-form-table" ref={(r) => connect(r)}>
      <thead>
        <TableRow rowIndex={0} tD={tableData} />
      </thead>
      <tbody>
        {[...Array(tableData.length - 1).keys()].map((index) => (
          <TableRow rowIndex={index + 1} tD={tableData} key={`row-${index}`} />
        ))}
      </tbody>
    </table>
  );
};

export const TableSettings = () => {
  const {
    actions: { setProp },
    fontSize,
  } = useNode((node) => ({
    fontSize: node.data.props.fontSize,
  }));

  return (
    <InputNumber value={fontSize} onChange={(val) => setProp((props) => (props.fontSize = val))} />
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
