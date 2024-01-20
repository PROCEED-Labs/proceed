import { Button, Card, Descriptions, DescriptionsProps, Grid } from 'antd';
import React, { Dispatch, FC, Key, ReactNode, SetStateAction, useRef, useState } from 'react';

import { MoreOutlined, InfoCircleOutlined } from '@ant-design/icons';
import Viewer from './bpmn-viewer';
import { useRouter } from 'next/navigation';
import classNames from 'classnames';

import { generateDateString } from '@/lib/utils';
import useLastClickedStore from '@/lib/use-last-clicked-process-store';
import { useLazyLoading } from './scrollbar';
import { ProcessListProcess } from './processes';

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
  const { description, createdOn, lastEdited, owner } = data;
  const desc: DescriptionsProps['items'] = [
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
  ];
  return desc;
};

const generateContentList = (data: ProcessListProcess, showViewer: boolean = true) => {
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
}) => {
  const router = useRouter();
  const [activeTabKey, setActiveTabKey] = useState<Tab>('viewer');
  const cardRef = useRef<HTMLDivElement>(null);
  const isVisible = useLazyLoading(cardRef);

  const lastProcessId = useLastClickedStore((state) => state.processId);
  const setLastProcessId = useLastClickedStore((state) => state.setProcessId);

  const onTabChange = (key: string) => {
    setActiveTabKey(key as Tab);
  };
  const breakpoint = Grid.useBreakpoint();

  return (
    <Card
      ref={cardRef}
      hoverable
      title={
        <div style={{ display: 'inline-flex', alignItems: 'center', width: '100%' }}>
          {/* <span>{item?.definitionName}</span> */}
          {item?.name.highlighted}
          <span style={{ flex: 1 }}></span>
          {breakpoint.xl ? null : (
            <InfoCircleOutlined onClick={() => setShowMobileMetaData(true)} />
          )}
        </div>
      }
      style={{
        cursor: 'pointer',
        height: tabcard ? '340px' : '300px',
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
        router.push(`/processes/${item.id}`);
      }}
    >
      {generateContentList(item, isVisible)[activeTabKey]}
    </Card>
  );
};

export default TabCard;
