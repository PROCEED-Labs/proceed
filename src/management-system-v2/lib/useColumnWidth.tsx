import { TableColumnsType, TableProps, Tooltip } from 'antd';
import { MouseEvent, ReactNode, use, useCallback, useEffect, useRef, useState } from 'react';
import { useUserPreferences } from './user-preferences';

export const useColumnWidth = (
  columns: NonNullable<TableProps['columns']>,
  preferenceKey: string,
  notResizeabel: string[] = [],
) => {
  const columnsInPreferences = useUserPreferences.use[preferenceKey]();
  const addPreferences = useUserPreferences.use.addPreferences();
  const hydrated = useUserPreferences.use._hydrated();

  const [columnWidths, setColumnWidths] = useState(
    columns.reduce((acc, column) => {
      return {
        ...acc,
        [column.key as string]:
          columnsInPreferences.find((col: any) => col.name === column.title)?.width || 'auto',
      };
    }, {}),
  );

  /* Once hydrated get the actual values saved in localstorage */
  useEffect(() => {
    if (!hydrated) return;

    setColumnWidths(
      columns.reduce((acc, column) => {
        return {
          ...acc,
          [column.key as string]:
            columnsInPreferences.find((col: any) => col.name === column.title)?.width || 'auto',
        };
      }, {}),
    );
  }, [hydrated]);

  const resizingColumn = useRef('');
  const columnRef = useRef<HTMLElement>();
  const startX = useRef(0);
  const indicatorRef = useRef<HTMLElement | null>(null);

  const handleMouseDown = useCallback((event: MouseEvent, key: string) => {
    // event.stopPropagation();
    event.preventDefault();
    resizingColumn.current = key;
    // @ts-ignore
    columnRef.current = event.target.closest('.ColumnWidthParent') as HTMLElement;
    startX.current = event.clientX;

    /* Create and append the indicator div */
    if (document) {
      const tableRef = columnRef.current?.closest('table');

      indicatorRef.current = document.createElement('div');
      indicatorRef.current.style.position = 'absolute';
      indicatorRef.current.style.height = `${tableRef!.offsetHeight}px`;
      indicatorRef.current.style.width = '1px';
      indicatorRef.current.style.backgroundColor = 'grey';
      indicatorRef.current.style.left = `${event.clientX}px`;
      document.body.appendChild(indicatorRef.current);
      indicatorRef.current.style.top = `${tableRef!.getBoundingClientRect().top}px`;
      indicatorRef.current.style.zIndex = '1000';
    }
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (indicatorRef.current) {
      indicatorRef.current.style.left = `${event.clientX}px`;
    }
  }, []);

  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      if (resizingColumn.current) {
        /* Calculate new Width */
        const currentWidth = columnRef.current?.offsetWidth || 0;
        const newWidth = currentWidth + event.clientX - startX.current;

        /* Update UI */
        setColumnWidths((old) => ({ ...old, [resizingColumn.current]: newWidth }));

        console.log('resizingColumn.current', resizingColumn.current, newWidth);

        /* Update Preferences */
        const newColumnsInPreferences = columnsInPreferences.map((column: any) => {
          if (column.name === resizingColumn.current) {
            return { name: column.name, width: newWidth };
          }
          return column;
        });
        addPreferences({ [preferenceKey]: newColumnsInPreferences });

        /* Remove the indicator div */
        if (indicatorRef.current) {
          document.body.removeChild(indicatorRef.current);
          indicatorRef.current = null;
        }

        /* Reset */
        resizingColumn.current = '';
        startX.current = 0;
      }
    },
    [columnWidths],
  );

  useEffect(() => {
    if (!document) return;

    // @ts-ignore
    document.addEventListener('mouseup', handleMouseUp);
    // @ts-ignore
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      // @ts-ignore
      document.removeEventListener('mouseup', handleMouseUp);
      // @ts-ignore
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseUp, handleMouseDown]);

  return columns.map((column: any) => {
    if (notResizeabel.includes(column.key)) return column;
    return {
      ...column,
      title: (
        <div style={{ position: 'relative' }} className="ColumnWidthParent">
          {column.title as ReactNode}
          <div
            style={{
              position: 'absolute',
              width: '5px',
              //   backgroundColor: 'black',
              right: -8,
              top: 0,
              cursor: 'ew-resize',
            }}
            onMouseDown={(e) => handleMouseDown(e, column.key as string)}
          >
            &ensp;
          </div>
        </div>
      ),
      // @ts-ignore
      width: columnWidths[column.key] as Number,
      /* Ensure, that cutoff is possible */
      ellipsis: {
        showTitle: true,
      },
      render: (text: any, record: any, index: number) => (
        <>
          {column.render && (
            // @ts-ignore
            <Tooltip title={column.render(text, record, index)}>
              {column.render(text, record, index) as ReactNode}
            </Tooltip>
          )}
        </>
      ),
    };
  });
};
