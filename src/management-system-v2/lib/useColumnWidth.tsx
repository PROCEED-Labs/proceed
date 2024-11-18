import { TableColumnsType, TableProps, Tooltip } from 'antd';
import React, {
  FC,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useUserPreferences } from './user-preferences';
import { Resizable } from 'react-resizable';
import styles from './useColumnWidth.module.scss';
import classNames from 'classnames';
import { AnyObject } from 'antd/es/_util/type';

export const useResizeableColumnWidth = <T extends AnyObject>(
  columns: NonNullable<TableProps<T>['columns']>,
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
  const initialisedWithHydratedValues =
    useRef(
      false,
    ); /* Basically a switch to check whther the state was updated once with the saved values, once hydrated */
  const convertedWidthsToNumbers = useRef(false); /* Similar switch */

  const computeNewColumns = useCallback(() => {
    return columns.map((column: any) => {
      const columnInPreferences = columnsInPreferences.find(
        (col: any) => col.name === column.title,
      );
      if (!columnInPreferences) return column;

      return {
        ...column,
        width: columnInPreferences.width,
      };
    });
  }, [columns, columnsInPreferences]);

  /* Once hydrated, get the correct values from the localstorage and update state */
  useEffect(() => {
    if (!hydrated) return;

    /* This should only run one time, after localstorage-store is hydrated */
    if (initialisedWithHydratedValues.current) return;

    const newColumns = computeNewColumns();
    initialisedWithHydratedValues.current = true;
    // console.debug('Updated columns with hydrated values');
    setResizeableColumns(newColumns);
  }, [hydrated, computeNewColumns, initialisedWithHydratedValues.current]);

  /* If the user selects different columns (i.e. columnsInPreferences change) update the state with new columns */
  useEffect(() => {
    if (!hydrated) return;

    /* This should onl run if the length of the arrays is dfferent */
    if (columnsInPreferences.length === resizeableColumns.length) return;

    const newColumns = computeNewColumns();
    /* Since the localstorage could hold NaN */
    convertedWidthsToNumbers.current = false;
    // console.debug('Updated columns because of preference change');
    setResizeableColumns(newColumns);
  }, [columnsInPreferences, computeNewColumns, hydrated, resizeableColumns]);

  /* Since 'react-resizable' can only handle numbers as width for resize */
  /* They need to be replaced with their actual pixel values */
  useEffect(() => {
    if (!hydrated) return;

    /* This should only happen, once the actual hydrated values have been read from localstorage and the browser had time to calculate its values  */

    /* Case: The state has not been updated yet with hydrated localsorage-values */
    if (!initialisedWithHydratedValues.current) return;

    /* This should also just be done if the current width values are not numbers */
    if (convertedWidthsToNumbers.current) return;

    /* Small timeout for browser to calculate values */
    const timer = setTimeout(() => {
      /* Replace 'auto' width with actual px values */
      const resizeableElements = document.querySelectorAll('.react-resizable');
      const widthsOfResizeableElements = Array.from(resizeableElements).map(
        (element: any) => element.getBoundingClientRect().width,
      );
      /* Get the widths */
      const widths = columns.map((column: any, index: number) => {
        /* Check if not resizeable */
        if (notResizeabel.includes(column.key)) return column.width || minWidth;

        /* Ensure all columns have min width */
        return Math.max(widthsOfResizeableElements.shift() || minWidth, minWidth);
      });

      /* Replace width */
      const newColumns = resizeableColumns.map((column: any, index: number) => {
        return {
          ...column,
          width: widths[index],
        };
      });

      convertedWidthsToNumbers.current = true;
      // console.debug('Converted widths to numbers');
      setResizeableColumns(newColumns);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [
    columns,
    resizeableColumns,
    notResizeabel,
    minWidth,
    hydrated,
    initialisedWithHydratedValues.current,
    convertedWidthsToNumbers.current,
  ]);

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

  columsWithResize.push({
    width: 'fit-content',
    dataIndex: 'id',
    key: 'auto-sizer',
    title: <div className="PROCEED-RESIZE-COLUMN" style={{ width: '100%', height: '2px' }} />,
    render: (id, record) => '',
    responsive: ['xl'],
  });

  return useTruncateColumnText(columsWithResize);
  // return columsWithResize;
};

type ResizeableTitleProps = PropsWithChildren & {
  onResize: (e: any, { size }: any) => void;
  width: number | string;
};

export const ResizeableTitle: FC<ResizeableTitleProps> = ({ onResize, width, ...restProps }) => {
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

          // style={{ backgroundColor: 'red' }} /* Uncomment to see Handles */
        />
      }
      onResize={onResize}
      // draggableOpts={{ onMouseDown: console.log }}
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
          const fallBackText = text?.highlighted
            ? text.highlighted
            : text
              ? text
              : 'Missing-Display-Name'; /* In case fuzzy-search is used */
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
  innerRender: () => React.ReactNode;
};

const TruncatedCell: FC<TruncateType> = ({ width, innerRender }) => {
  const [overFlowing, setOverFlowing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || typeof width !== 'number') return;

    const widths = getWidthsOfInnerElements(containerRef.current);
    const innerWidth =
      containerRef.current.getClientRects()[0]
        .width; /* This is the widht, without padding and border (i.e. the actual width its children can fill) */

    if (widths.some((w) => w > innerWidth)) {
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

  /* Check is child elements are displayed next to each other */
  /* If they are displayed next to each other, add the sum of their width to widths */
  const inlineChildrenWidth = children.reduce((acc, child) => {
    const childStyles = getComputedStyle(child);
    if (
      childStyles.display === 'inline' ||
      childStyles.display === 'inline-block' ||
      childStyles.display === 'inline-flex' ||
      childStyles.display === 'inline-grid' ||
      childStyles.display === 'inline-table'
    ) {
      return acc + child.getBoundingClientRect().width;
    }
    return acc;
  }, 0);
  /* Append width of elements, that are next to each other */
  widths.push(inlineChildrenWidth);

  /* Append nested children recursivly */
  children.forEach((child) => {
    widths.push(...getWidthsOfInnerElements(child));
  });

  return widths;
}
