'use client';

import { Button, Checkbox, Dropdown, Grid, Table, TableProps } from 'antd';
import { PropsWithChildren, SetStateAction, useMemo, useRef } from 'react';
import cn from 'classnames';
import styles from './item-list-view.module.scss';
import { MoreOutlined } from '@ant-design/icons';
import { ResizeableTitle } from '@/lib/useColumnWidth';
import { getUniqueObjects } from '@/lib/utils';

type ElementListProps<T extends { id: string }> = PropsWithChildren<{
  data: T[];
  columns: NonNullable<TableProps<T>['columns']>;
  elementSelection?: {
    selectedElements: T[];
    setSelectionElements: (action: SetStateAction<T[]>) => void;
  };
  selectableColumns?: {
    allColumnTitles: string[];
    selectedColumnTitles: string[];
    setColumnTitles: (action: SetStateAction<string[]>) => void;
    columnProps?: NonNullable<TableProps<T>['columns']>[number];
  };
  actions?: {};
  tableProps?: TableProps<T>;
}>;

const numberOfRows =
  typeof window !== 'undefined' ? Math.floor((window?.innerHeight - 410) / 47) : 10;

// TODO: comprehensive documentation

const ElementList = <T extends { id: string }>({
  data,
  columns,
  elementSelection,
  selectableColumns,
  tableProps,
}: ElementListProps<T>) => {
  const breakpoint = Grid.useBreakpoint();
  const lastItemClicked = useRef<T | null>(null);

  const ColumnDropdown = useMemo(
    () => (
      <div
        style={{
          display: 'flex',
          justifyContent: 'right',
        }}
      >
        <Dropdown
          menu={{
            items: selectableColumns?.allColumnTitles.map((title) => ({
              label: (
                <Checkbox
                  checked={selectableColumns.selectedColumnTitles.includes(title)}
                  onChange={(e) => {
                    e.stopPropagation();

                    if (e.target.checked)
                      selectableColumns.setColumnTitles([
                        ...selectableColumns.selectedColumnTitles,
                        title,
                      ]);
                    else
                      selectableColumns.setColumnTitles(
                        selectableColumns.selectedColumnTitles.filter((column) => column !== title),
                      );
                  }}
                  onClick={(e) => e.stopPropagation()}
                  value={title}
                >
                  {title}
                </Checkbox>
              ),
              key: title,
            })),
          }}
          trigger={['click']}
        >
          <Button type="text">
            <MoreOutlined />
          </Button>
        </Dropdown>
      </div>
    ),
    [
      selectableColumns?.setColumnTitles,
      selectableColumns?.selectedColumnTitles,
      selectableColumns?.allColumnTitles,
    ],
  );

  columns = [...columns];
  /* Add functionality for changing width of columns */
  // columns = useColumnWidth(columns);

  if (selectableColumns) {
    columns.push({
      width: 50,
      ...(selectableColumns.columnProps || {}),
      key: 'tools',
      fixed: 'right',
      title: ColumnDropdown,
    });
  }

  const selectedElementsKeys = elementSelection?.selectedElements.map(({ id }) => id);
  const { components } = tableProps || {};

  return (
    <Table
      // size={breakpoint.xs ? 'large' : 'middle'}
      pagination={{ position: ['bottomCenter'], pageSize: numberOfRows }}
      {...tableProps}
      rowSelection={
        elementSelection && {
          type: 'checkbox',
          selectedRowKeys: selectedElementsKeys,
          // onChange: (_, selectedRows) => elementSelection.setSelectionElements(selectedRows),
          getCheckboxProps: (record) => ({ name: record.id }),
          onSelect: (record, selected, selectedRows, nativeEvent) => {
            // @ts-ignore
            if (nativeEvent.shiftKey && elementSelection.selectedElements.length > 0) {
              // console.log('shift key pressed');
              /* If checkbox shiftclick is recognizable, a drag select can be implemented here */
              /* Currently, the event is not fired in most browser on checkbox */
            } else {
              // console.log('data length', data.length);
              // console.log('setting rows', selectedRows);
              if (selected) {
                elementSelection.setSelectionElements((prev) => [...prev, record]);
              } else {
                elementSelection.setSelectionElements((prev) =>
                  prev.filter(({ id }) => id !== record.id),
                );
              }
            }
            lastItemClicked.current = record;
          },
          // onSelectNone: () => elementSelection.setSelectionElements([]),
          onSelectAll: (selected, selectedRows, changeRows) => {
            elementSelection.setSelectionElements((oldSelection) => {
              if (selected) {
                return getUniqueObjects([...oldSelection, ...changeRows], 'id') as T[];
              } else {
                return getUniqueObjects(
                  oldSelection.filter(
                    ({ id }) => !changeRows.some(({ id: rowId }) => rowId === id),
                  ),
                  'id',
                ) as T[];
              }
            });
          },
        }
      }
      onRow={
        elementSelection &&
        ((item: T) => {
          const propFunctions = tableProps?.onRow?.(item);

          return {
            ...propFunctions,
            onClick: (event) => {
              // if (event.ctrlKey || event.metaKey) {
              //   if (!selectedElementsKeys!.includes(item?.id)) {
              //     elementSelection.setSelectionElements((prev) => [...prev, item]);
              //   } else {
              //     elementSelection.setSelectionElements((prev) =>
              //       prev.filter(({ id }) => id !== item.id),
              //     );
              //   }
              // } else if (event.shiftKey && elementSelection.selectedElements.length > 0) {
              //   const lastItemId = lastItemClicked.current!.id; // if elementselection is not undefined, then lastElementClicked.current will not be null
              //   const lastIdx = data.findIndex(({ id }) => id === lastItemId);
              //   const currIdx = data.findIndex(({ id }) => id === item.id);

              //   const rangeSelectedElements =
              //     lastIdx < currIdx
              //       ? data.slice(lastIdx, currIdx + 1)
              //       : data.slice(currIdx, lastIdx + 1);

              //   elementSelection.setSelectionElements((prev) => [
              //     ...prev.filter(
              //       ({ id }) => !rangeSelectedElements.some(({ id: rangeId }) => id === rangeId),
              //     ),
              //     ...rangeSelectedElements,
              //   ]);
              // } else {
              //   elementSelection.setSelectionElements([item]);
              // }

              // lastItemClicked.current = item;
              if (propFunctions?.onClick) propFunctions.onClick(event);
            },
          };
        })
      }
      rowKey="id"
      columns={columns}
      dataSource={data}
      className={cn(breakpoint.xs ? styles.MobileTable : '')}
      components={{
        ...components,
        header: {
          ...components?.header,
          cell: ResizeableTitle,
        },
      }}
    />
  );
};

export default ElementList;
