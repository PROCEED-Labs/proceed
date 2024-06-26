import { TableColumnsType, TableProps } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useUserPreferences } from './user-preferences';
import { Resizable } from 'react-resizable';
import styles from './useColumnWidth.module.scss';

export const useResizeableColumnWidth = (
  columns: NonNullable<TableProps['columns']>,
  preferenceKey: string,
  notResizeabel: string[] = [],
  minWidth: number = 150,
) => {
  const columnsInPreferences = useUserPreferences.use[preferenceKey]();
  const addPreferences = useUserPreferences.use.addPreferences();
  const hydrated = useUserPreferences.use._hydrated();

  /* Initialise every column, that has no width with min-width */
  const [resizeableColumns, setResizeableColumns] = useState(
    columns.map((col) => ({ ...col, width: col.width || minWidth })),
  );

  /* Once hydrated: change the size to what was saved in localstorage */
  useEffect(() => {
    if (!hydrated) return;

    const newColumns = columns.map((column: any) => {
      const columnInPreferences = columnsInPreferences.find(
        (col: any) => col.name === column.title,
      );
      if (!columnInPreferences) return column;

      return {
        ...column,
        width: columnInPreferences.width,
      };
    });

    setResizeableColumns(newColumns);
  }, [hydrated]);

  const handleResize = useCallback(
    (index: number) =>
      (e: any, { size }: any) => {
        let thWidth = size.width;
        /* Antdesign can handle a size of 'auto' */
        /* However, react-resizeable can't */
        if (Number.isNaN(thWidth) || thWidth === null) {
          /* In this case we need to read the actual width from the DOM */
          const th = e.target.closest('th');
          if (!th) return; // This should never be the case
          thWidth = th.getBoundingClientRect().width;
        }
        /* Change state */
        setResizeableColumns((old) => {
          const newWidths = [...old];
          // @ts-ignore
          newWidths[index] = { ...newWidths[index], width: Math.max(thWidth, minWidth) };
          return newWidths;
        });
        // /* Update Preferences */
        // const newColumnsInPreferences = columnsInPreferences.map((column: any) => {
        //   if (column.name === columns[index].title) {
        //     return { name: column.name, width: size.width };
        //   }
        //   return column;
        // });
        // addPreferences({ [preferenceKey]: newColumnsInPreferences });
      },
    [minWidth, columnsInPreferences, addPreferences, preferenceKey, columns],
  );

  return resizeableColumns.map((column: any, index: number) => {
    if (notResizeabel.includes(column.key)) return column;

    return {
      ...column,
      onHeaderCell: (column: any) => ({
        width: column.width,
        onResize: handleResize(index),
      }),
    };
  }) as TableColumnsType<any>;
};

export const ResizableTitle = (props: any) => {
  const { onResize, width, ...restProps } = props;

  if (!width) {
    return <th {...restProps} />;
  }

  return (
    <Resizable
      className={styles['react-resizable']}
      width={width}
      height={0}
      handle={
        <span
          className={styles['react-resizable-handle']}
          onClick={(e) => {
            e.stopPropagation();
          }}
          style={{ backgroundColor: 'red' }}
        >
          {width}
        </span>
      }
      onResize={(e, args) => {
        console.log('resize', e, args);
        onResize(e, args);
      }}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} />
    </Resizable>
  );
};
