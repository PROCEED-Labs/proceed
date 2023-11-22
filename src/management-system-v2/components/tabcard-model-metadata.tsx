import { Button, Card, Descriptions, DescriptionsProps } from 'antd';
import React, {
  Dispatch,
  FC,
  Key,
  ReactNode,
  SetStateAction,
  useCallback,
  useRef,
  useState,
} from 'react';

import { MoreOutlined } from '@ant-design/icons';
import Viewer from './bpmn-viewer';
import { useRouter } from 'next/navigation';
import classNames from 'classnames';

import { generateDateString } from '@/lib/utils';
import useLastClickedStore from '@/lib/use-last-clicked-process-store';
import { ApiData } from '@/lib/fetch-data';
import { useLazyLoading } from './scrollbar';

type Processes = ApiData<'/process', 'get'>;
type Process = Processes[number];

type TabCardProps = {
  item: Process;
  selection: Key[];
  setSelection: Dispatch<SetStateAction<Key[]>>;
  tabcard?: boolean;
  completeList: Processes;
  search?: string;
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

type Tab = (typeof tabList)[number]['key'];

const generateDescription = (data: Process) => {
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
      children: `${owner}`,
    },
    {
      key: `5`,
      label: 'Description',
      children: description.length > 20 ? `${description.slice(0, 21)} ...` : `${description}`,
    },
  ];
  return desc;
};

const generateContentList = (data: Process, showViewer: boolean = true) => {
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
        {showViewer && <Viewer selectedElement={data} reduceLogo={true} />}
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
  setSelection,
  tabcard,
  completeList,
  search,
}) => {
  const router = useRouter();
  const [activeTabKey, setActiveTabKey] = useState<Tab>('viewer');

  const cardRef = useRef<HTMLDivElement | null>(null);
  const isVisible = useLazyLoading(cardRef);

  const lastProcessId = useLastClickedStore((state) => state.processId);
  const setLastProcessId = useLastClickedStore((state) => state.setProcessId);

  const onTabChange = (key: Tab) => {
    setActiveTabKey(key);
  };

  const clipAndHighlightText = useCallback(
    (dataIndexElement: any) => {
      const withoutSearchTerm = dataIndexElement?.split(search);
      let res = dataIndexElement;
      if (search && withoutSearchTerm?.length > 1) {
        res = withoutSearchTerm.map(
          (
            word:
              | string
              | number
              | boolean
              | React.ReactElement<any, string | React.JSXElementConstructor<any>>
              | Iterable<React.ReactNode>
              | React.ReactPortal
              | React.PromiseLikeOfReactNode
              | null
              | undefined,
            i: React.Key | null | undefined,
            arr: string | any[],
          ) => {
            if (i === arr.length - 1) return word;

            return (
              <span key={i}>
                <span>{word}</span>
                <span style={{ color: '#3e93de' }}>{search}</span>
              </span>
            );
          },
        );
      }

      return <div style={{ flex: 1 }}>{res}</div>;
    },
    [search],
  );

  return (
    <Card
      ref={cardRef}
      hoverable
      title={
        <div style={{ display: 'inline-flex', alignItems: 'center', width: '100%' }}>
          {/* <span>{item?.definitionName}</span> */}
          {clipAndHighlightText(item?.definitionName)}
          <span style={{ flex: 1 }}></span>
          <Button type="text">
            <MoreOutlined />
          </Button>
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
        'card-selected': selection.includes(item?.definitionId),
        'no-select': true,
      })}
      {...(tabcard ? { tabList, activeTabKey, onTabChange } : {})}
      onClick={(event) => {
        /* CTRL */
        if (event.ctrlKey) {
          /* Not selected yet -> Add to selection */
          if (!selection.includes(item?.definitionId)) {
            setSelection([item?.definitionId, ...selection]);
            /* Already in selection -> deselect */
          } else {
            setSelection(selection.filter((id) => id !== item?.definitionId));
          }
          /* SHIFT */
        } else if (event.shiftKey) {
          /* At least one element selected */
          if (selection.length) {
            const iLast = completeList.findIndex(
              (process) => process.definitionId === lastProcessId,
            );
            const iCurr = completeList.findIndex(
              (process) => process.definitionId === item?.definitionId,
            );
            /* Identical to last clicked */
            if (iLast === iCurr) {
              setSelection([item?.definitionId]);
            } else if (iLast < iCurr) {
              /* Clicked comes after last slected */
              setSelection(
                completeList.slice(iLast, iCurr + 1).map((process) => process.definitionId),
              );
            } else if (iLast > iCurr) {
              /* Clicked comes before last slected */
              setSelection(
                completeList.slice(iCurr, iLast + 1).map((process) => process.definitionId),
              );
            }
          } else {
            /* Nothing selected */
            setSelection([item?.definitionId]);
          }
        } else {
          setSelection([item?.definitionId]);
        }

        /* Always */
        setLastProcessId(item?.definitionId);
      }}
      onDoubleClick={() => {
        router.push(`/processes/${item.definitionId}`);
      }}
    >
      {generateContentList(item, isVisible)[activeTabKey]}
    </Card>
  );
};

export default TabCard;
