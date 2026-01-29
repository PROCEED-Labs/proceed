import { TableColumnsType, TableProps } from 'antd';
import { FC, PropsWithChildren, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useUserPreferences } from './user-preferences';
import { Resizable } from 'react-resizable';
import styles from './useColumnWidth.module.scss';
import classNames from 'classnames';

export const useResizeableColumnWidth = <T extends any>(
  columns: NonNullable<TableProps<T>['columns']>,
  preferenceKey: string,
  notResizeabel: string[] = [],
  minWidth: number = 150,
) => {
  // const columnsInPreferences = useUserPreferences.use[preferenceKey]();
  const addPreferences = useUserPreferences.use.addPreferences();
  const hydrated = useUserPreferences.use._hydrated();

  /* Initialise with undefined -> widths haven't been loaded */
  const [columnWidths, setColumnWidths] = useState<Record<string, number> | undefined>(undefined);

  /* Once hydrated, get the correct values from the localstorage and update state */
  useEffect(() => {
    if (!hydrated) return;
    const preferences = useUserPreferences.getState().preferences[preferenceKey];

    const storeWidths: Record<string, number> = {};
    for (const column of preferences) {
      const width = +column?.width;
      if (typeof width !== 'number' || Number.isNaN(width)) {
        continue;
      }

      storeWidths[column.name] = width;
    }
    setColumnWidths(storeWidths);
  }, [hydrated, preferenceKey]);

  const handleResize =
    (title: string) =>
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
      let newWidth = Math.max(thWidth, minWidth);

      /* Only update state if local storage was read in */
      if (columnWidths) {
        /* Change state */
        // /* Note: changing the preferences should suffice (if it triggers a state change as well), however, changing the state here seems to be smoother */
        // /* Therefore only column selection changes in the localstorage are changing the state (after hydration) */
        setColumnWidths((old) => {
          const newWidths = { ...old };
          newWidths[title] = newWidth;
          return newWidths;
        });
      }

      /** Only update if local storage was read in, or if it's the first time we see a column and
                                    want to store it's initial width */
      const columnsInPreferences = useUserPreferences.getState().preferences[preferenceKey];
      const currentColumn = columnsInPreferences.find((column: any) => column.name === title);
      if (columnWidths || !currentColumn || currentColumn.width === 'auto') {
        /* Update Preferences */
        const newColumnsInPreferences = columnsInPreferences.map((column: any) => {
          if (column.name === title) {
            return { name: column.name, width: newWidth };
          }
          return column;
        });
        addPreferences({ [preferenceKey]: newColumnsInPreferences });
      }
    };

  const newCols = columns.map((column) => {
    if (notResizeabel.includes(column.title as string)) return column;

    const currentWidth = columnWidths?.[column.key as string];

    let width: string | number = 'auto';
    if (column.width) width = column.width;
    else if (notResizeabel.includes(column.key as string)) width = minWidth;
    else if (typeof currentWidth === 'number' && !Number.isNaN(currentWidth)) width = currentWidth;

    const newColumn = {
      ...column,
      width,
    };

    if (!notResizeabel.includes(column.key as string))
      newColumn.onHeaderCell = () =>
        ({
          width,
          onResize: handleResize(column.key as string),
        }) as any;

    return newColumn;
  }) as TableColumnsType<any>;

  newCols.push({
    width: 'fit-content',
    dataIndex: 'id',
    key: 'auto-sizer',
    title: <div className="PROCEED-RESIZE-COLUMN" style={{ width: '100%', height: '2px' }} />,
    render: () => '',
    responsive: ['xl'],
  });

  return newCols;
};

type ResizeableTitleProps = PropsWithChildren & {
  onResize: (e: any, { size }: any) => void;
  width: number | string;
};

export const ResizeableTitle: FC<ResizeableTitleProps> = ({ onResize, width, ...restProps }) => {
  const headerRef = useRef<HTMLTableCellElement>(null);

  useLayoutEffect(() => {
    if (width !== 'auto') return;

    const headerWidth = headerRef.current!.getBoundingClientRect().width;
    onResize(undefined, { size: { width: headerWidth } });
    // memoizing onResize is almost impossible as the columns passed to useResizeableColumnWidth
    // aren't memoized
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  if (!width) {
    return <th {...restProps} />;
  }

  return (
    <Resizable
      // ant-table-cell ant-table-cell-ellipsis ant-table-column-has-sorters
      className={classNames(styles['react-resizable'])}
      width={
        width as number
      } /* Can also be a string (e.g. 'auto'), but that case is managed in the useResizeableColumnWidth hook */
      height={0}
      handle={
        <span
          className={styles['react-resizable-handle']}
          onClick={(e) => {
            e.stopPropagation();
          }}
        />
      }
      onResize={onResize}
    >
      <th {...restProps} ref={headerRef} />
    </Resizable>
  );
};
