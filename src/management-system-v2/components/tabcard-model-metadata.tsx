import { Card, Descriptions, DescriptionsProps, Grid } from 'antd';
import { Dispatch, FC, Key, ReactNode, SetStateAction, useRef, useState } from 'react';

import { InfoCircleOutlined, FolderOutlined } from '@ant-design/icons';
import Viewer from './bpmn-viewer';
import { useRouter } from 'next/navigation';
import classNames from 'classnames';

import { generateDateString, spaceURL } from '@/lib/utils';
import useLastClickedStore from '@/lib/use-last-clicked-process-store';
import { useLazyLoading } from './scrollbar';
import { DraggableElementGenerator, ProcessListProcess, contextMenuStore } from './processes';
import { useEnvironment } from './auth-can';

const DraggableDiv = DraggableElementGenerator('div', 'item-id');

type TabCardProps = {
  item: ProcessListProcess;
  selection: Key[];
  setSelectionElements: Dispatch<SetStateAction<ProcessListProcess[]>>;
  tabcard?: boolean;
  completeList: ProcessListProcess[];
  setShowMobileMetaData: Dispatch<SetStateAction<boolean>>;
};

const tabList = [
  {
    key: 'viewer',
    tab: <span style={{ fontSize: 12 }}>Model</span>,
  },
  {
    key: 'meta',
    tab: <span style={{ fontSize: 12 }}>Meta Data</span>,
  },
];

type Tab = 'viewer' | 'meta'; // has to be defined manually, antdesign errors if tabList is defined 'as const'

const generateDescription = (data: ProcessListProcess) => {
  if (data.type === 'folder') return [];
  const { description, createdOn, lastEdited, owner } = data;
  return [
    {
      key: `1`,
      label: 'Last Edited',
      children: generateDateString(lastEdited),
    },
    {
      key: `2`,
      label: 'Created On',
      children: generateDateString(createdOn),
    },
    {
      key: `3`,
      label: 'File Size',
      children: `${'1.2 MB'}`,
    },
    {
      key: `4`,
      label: 'Owner',
      children: owner,
    },
    {
      key: `5`,
      label: 'Description',
      children: (
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            lineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {description.highlighted}
        </span>
      ),
    },
  ] as DescriptionsProps['items'];
};

const generateContentList = (
  data: Exclude<ProcessListProcess, { type: 'folder' }>,
  showViewer: boolean = true,
) => {
  return {
    viewer: (
      <div
        style={{
          height: '200px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
        }}
      >
        {showViewer && <Viewer definitionId={data.id} reduceLogo={true} />}
      </div>
    ),
    meta: (
      <Descriptions
        // title="User Info"
        bordered
        column={1}
        items={generateDescription(data)}
      />
    ),
  } as { [key in Tab]: ReactNode };
};

const TabCard: FC<TabCardProps> = ({
  item,
  selection,
  setSelectionElements,
  tabcard,
  completeList,
  setShowMobileMetaData,
}) => {
  const router = useRouter();
  const [activeTabKey, setActiveTabKey] = useState<Tab>('viewer');
  const cardRef = useRef<HTMLDivElement>(null);
  const isVisible = useLazyLoading(cardRef);
  const environment = useEnvironment();
  const setSelectredContextMenuItem = contextMenuStore((store) => store.setSelected);

  const lastProcessId = useLastClickedStore((state) => state.processId);
  const setLastProcessId = useLastClickedStore((state) => state.setProcessId);

  const onTabChange = (key: string) => {
    setActiveTabKey(key as Tab);
  };
  const breakpoint = Grid.useBreakpoint();

  let cardHeight;
  if (item.type === 'folder') cardHeight = 'fit-content';
  else cardHeight = tabcard ? '340px' : '300px';

  const cardTitle = (
    <div style={{ display: 'inline-flex', alignItems: 'center', width: '100%' }}>
      {item.type === 'folder' && <FolderOutlined style={{ marginRight: '.5rem' }} />}
      {item?.name.highlighted}
      <span style={{ flex: 1 }}></span>
      {breakpoint.xl ? null : <InfoCircleOutlined onClick={() => setShowMobileMetaData(true)} />}
    </div>
  );

  return (
    <DraggableDiv item-id={item.id}>
      <Card
        ref={cardRef}
        hoverable
        styles={{
          body: { padding: item.type === 'folder' ? 'none' : undefined },
        }}
        title={item.type !== 'folder' && cardTitle}
        style={{
          cursor: 'pointer',
          height: cardHeight,
          // width: 'calc(100vw / 5)',
          // marginBottom: '30px',
        }}
        className={classNames({
          'small-tabs': true,
          'card-selected': selection.includes(item?.id),
          'no-select': true,
        })}
        {...(tabcard ? { tabList, activeTabKey, onTabChange } : {})}
        onClick={(event) => {
          /* CTRL */
          if (event.ctrlKey) {
            /* Not selected yet -> Add to selection */
            if (!selection.includes(item?.id)) {
              setSelectionElements((selection) => [item, ...selection]);
              /* Already in selection -> deselect */
            } else {
              setSelectionElements((selection) => selection.filter(({ id }) => id !== item?.id));
            }
            /* SHIFT */
          } else if (event.shiftKey) {
            /* At least one element selected */
            if (selection.length) {
              const iLast = completeList.findIndex((process) => process.id === lastProcessId);
              const iCurr = completeList.findIndex((process) => process.id === item?.id);
              /* Identical to last clicked */
              if (iLast === iCurr) {
                setSelectionElements([item]);
              } else if (iLast < iCurr) {
                /* Clicked comes after last slected */
                setSelectionElements(completeList.slice(iLast, iCurr + 1));
              } else if (iLast > iCurr) {
                /* Clicked comes before last slected */
                setSelectionElements(completeList.slice(iCurr, iLast + 1));
              }
            } else {
              /* Nothing selected */
              setSelectionElements([item]);
            }
          } else {
            setSelectionElements([item]);
          }

          /* Always */
          setLastProcessId(item?.id);
        }}
        onDoubleClick={() => {
          const url =
            item.type === 'folder' ? `/processes/folder/${item.id}` : `/processes/${item.id}`;
          router.push(spaceURL(environment, url));
        }}
        onContextMenu={() => setSelectredContextMenuItem([item])}
      >
        {item.type !== 'folder' ? (
          generateContentList(item, isVisible)[activeTabKey]
        ) : (
          <Card.Meta title={cardTitle} />
        )}
      </Card>
    </DraggableDiv>
  );
};

export default TabCard;
