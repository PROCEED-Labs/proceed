import { CSSProperties, Fragment, ReactNode, SetStateAction, useRef } from 'react';
import { Card, Grid, CardProps, Table } from 'antd';

export type TabCardProps<T extends { id: string }> = {
  item: T;
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, item: T) => void;
  Wrapper?: (props: { children?: ReactNode; itemId: string; item: T }) => ReactNode;
  selected?: boolean;
  cardProps?: CardProps;
};

export const TabCard = <T extends { id: string }>({
  item,
  onClick,
  selected,
  cardProps,
  Wrapper = Fragment,
}: TabCardProps<T>) => {
  const cardRef = useRef<HTMLDivElement>(null);

  let style = {};
  if (selected) {
    style = {
      ...style,
      backgroundColor: '#ebf8ff',
      border: '1px solid #1976d2',
    };
  }
  if (cardProps?.style) {
    style = { ...style, ...cardProps.style };
  }

  return (
    <Wrapper item={item} itemId={item.id}>
      <Card
        hoverable
        {...cardProps}
        ref={cardRef}
        style={style}
        onClick={(e) => onClick && onClick(e, item)}
      />
    </Wrapper>
  );
};

// TODO: comprehensive documentation

export type ItemIconViewProps<T extends { id: string }> = {
  data: T[];
  divisions?: T[][];
  elementSelection?: {
    selectedElements: T[];
    setSelectionElements: (action: SetStateAction<T[]>) => void;
  };
  tabCardPropsGenerator: (item: T) => Partial<TabCardProps<T>>;
  containerProps?: React.HTMLAttributes<HTMLDivElement>;
  groupProps?: React.HTMLAttributes<HTMLDivElement>;
};

const ItemIconViewProps = <T extends { id: string }>({
  data,
  divisions,
  elementSelection,
  tabCardPropsGenerator,
  containerProps,
  groupProps,
}: ItemIconViewProps<T>) => {
  const breakpoint = Grid.useBreakpoint();
  const lastItemClicked = useRef<T | null>(null);

  const onClick: TabCardProps<T>['onClick'] =
    elementSelection &&
    ((event, item) => {
      if (event.ctrlKey || event.metaKey) {
        if (!elementSelection.selectedElements.find(({ id }) => id === item.id)) {
          elementSelection.setSelectionElements((prev) => [...prev, item]);
        } else {
          elementSelection.setSelectionElements((prev) => prev.filter(({ id }) => id !== item.id));
        }
      } else if (event.shiftKey && elementSelection.selectedElements.length > 0) {
        const lastItemId = lastItemClicked.current!.id; // if elementselection is not undefined, then lastElementClicked.current will not be null
        const lastIdx = data.findIndex(({ id }) => id === lastItemId);
        const currIdx = data.findIndex(({ id }) => id === item.id);

        const rangeSelectedElements =
          lastIdx < currIdx ? data.slice(lastIdx, currIdx + 1) : data.slice(currIdx, lastIdx + 1);

        elementSelection.setSelectionElements((prev) => [
          ...prev.filter(
            ({ id }) => !rangeSelectedElements.some(({ id: rangeId }) => id === rangeId),
          ),
          ...rangeSelectedElements,
        ]);
      } else {
        elementSelection.setSelectionElements([item]);
      }

      lastItemClicked.current = item;
    });

  let groupStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    justifyContent: 'space-between',
    gridGap: '20px',
    width: '100%',
  };
  if (breakpoint.xs) groupStyle.width = '95dvw';

  const groups = divisions || [data];
  const tabCardGroups = groups.map((dataSlice) => (
    <div {...groupProps} style={{ ...groupStyle, ...groupProps?.style }}>
      {dataSlice.map((item) => {
        const props = tabCardPropsGenerator(item);

        return (
          <TabCard
            item={item}
            key={item.id}
            onClick={(e) => {
              onClick?.(e, item);
              props.cardProps?.onClick?.(e);
            }}
            selected={elementSelection?.selectedElements.some(({ id }) => id === item.id)}
            {...props}
          />
        );
      })}
    </div>
  ));

  return (
    <div
      {...containerProps}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        ...containerProps?.style,
      }}
    >
      {data.length === 0 ? <Table showHeader={false} /> : tabCardGroups}
    </div>
  );
};

export default ItemIconViewProps;
