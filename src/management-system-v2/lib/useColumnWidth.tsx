import { TableColumnsType, TableProps, Tooltip } from 'antd';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const onlySelectedColumnsCauseRerender =
    useRef(
      false,
    ); /* Basically a switch to check whther the state was updated once with the saved values, once hydrated */

  /* Once hydrated: change the size to what was saved in localstorage */
  useEffect(() => {
    if (!hydrated) return;

    if (
      onlySelectedColumnsCauseRerender.current &&
      resizeableColumns.length === columnsInPreferences.length
    )
      return;

    let newColumns = columns.map((column: any) => {
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

    if (!onlySelectedColumnsCauseRerender.current && document) {
      setTimeout(() => {
        /* Hydrating */
        /* Replace 'auto' width with actual px values */
        const resizeableElements = document.querySelectorAll('.react-resizable');
        const widthsOfResizeableElements = Array.from(resizeableElements).map(
          (element: any) => element.getBoundingClientRect().width,
        );
        /* Get the widths */
        const widths = columns.map((column: any, index: number) => {
          /* Check if not resizeable */
          if (notResizeabel.includes(column.key)) return column.width || minWidth;

          return widthsOfResizeableElements.shift() || minWidth;
        });

        /* Replace width */
        newColumns = newColumns.map((column: any, index: number) => {
          return {
            ...column,
            width: widths[index],
          };
        });

        setResizeableColumns(newColumns);
      }, 1_000);
    }

    onlySelectedColumnsCauseRerender.current =
      true; /* This is only true once the columns are set to the saved values (after hydration) */
  }, [hydrated, columns, columnsInPreferences]);

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
        const newWidth = Math.max(thWidth, minWidth);

        /* Change state */
        /* Note: changing the preferences should suffice (if it triggers a state change aswell), however, changing the state here seems to be smoother */
        /* Therefore only column selection chaneges in the localstorage are changing the state (after hydration) */
        setResizeableColumns((old) => {
          const newWidths = [...old];
          // @ts-ignore
          newWidths[index] = { ...newWidths[index], width: newWidth };
          return newWidths;
        });

        /* Update Preferences */
        const newColumnsInPreferences = columnsInPreferences.map((column: any) => {
          if (column.name === columns[index].title) {
            return { name: column.name, width: newWidth };
          }
          return column;
        });
        addPreferences({ [preferenceKey]: newColumnsInPreferences });
      },
    [minWidth, columnsInPreferences, addPreferences, preferenceKey, columns],
  );

  const columsWithResize = resizeableColumns.map((column: any, index: number) => {
    if (notResizeabel.includes(column.key)) return column;

    return {
      ...column,
      onHeaderCell: (column: any) => ({
        width: column.width,
        onResize: handleResize(index),
      }),
    };
  }) as TableColumnsType<any>;

  return useTruncateColumnText(columsWithResize);
  // return columsWithResize;
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
          // style={{ backgroundColor: 'red' }} /* Uncomment to see Handles */
        >
          {/* {width} */}
        </span>
      }
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} />
    </Resizable>
  );
};

export const useTruncateColumnText = (columns: NonNullable<TableProps['columns']>) => {
  const truncatedColumns = useMemo(() => {
    return columns.map((column: any) => {
      return {
        ...column,
        render: (text: any, record: any, rowIndex: number) => {
          const fallBackText = text.highlighted
            ? text.highlighted
            : text; /* In case fuzzy-search is used */
          const newRender = column.render
            ? () => column.render(text, record, rowIndex)
            : () => fallBackText;
          return (
            <>
              <TruncatedCell width={column.width} innerRender={newRender}></TruncatedCell>
            </>
          );
        },
      };
    });
  }, [columns]);

  return truncatedColumns;
};

type TruncateType = {
  width: number | string;
  innerRender: () => JSX.Element | string;
};

const TruncatedCell: FC<TruncateType> = ({ width, innerRender }) => {
  const [overFlowing, setOverFlowing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || typeof width !== 'number') return;

    const widths = getWidthsOfInnerElements(containerRef.current);

    if (widths.some((w) => w > width)) {
      setOverFlowing(true);
    } else {
      setOverFlowing(false);
    }
  }, [width, innerRender]);

  return (
    <>
      <div ref={containerRef}>
        {overFlowing ? (
          <Tooltip title={innerRender()} overlayStyle={{ maxWidth: width }} autoAdjustOverflow>
            <div
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
              }}
            >
              {innerRender()}
            </div>
          </Tooltip>
        ) : (
          <div
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}
          >
            {innerRender()}
          </div>
        )}
      </div>
    </>
  );
};

function getWidthsOfInnerElements(element: HTMLElement | Element) {
  const widths: number[] = [];
  /*  Get width of direct children */
  const children = Array.from(element.children);
  children.forEach((child) => {
    widths.push(child.getBoundingClientRect().width);
  });

  /* Append nested children recursivly */
  children.forEach((child) => {
    widths.push(...getWidthsOfInnerElements(child));
  });

  return widths;
}
