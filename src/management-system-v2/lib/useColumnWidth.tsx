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
import { only } from 'node:test';
import { Props } from '@dnd-kit/core/dist/components/DragOverlay';
import classNames from 'classnames';
import { get } from 'node:http';

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

    let timer: NodeJS.Timeout | undefined = undefined;

    if (!onlySelectedColumnsCauseRerender.current && document) {
      timer = setTimeout(() => {
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

    return () => {
      // onlySelectedColumnsCauseRerender.current = false;
      if (timer) clearTimeout(timer);
    };
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
