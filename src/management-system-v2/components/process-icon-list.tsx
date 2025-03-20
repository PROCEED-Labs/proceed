'use client';

import { Dispatch, FC, SetStateAction, Suspense } from 'react';
import { InfoCircleOutlined, FolderOutlined } from '@ant-design/icons';
import { LazyBPMNViewer } from './bpmn-viewer';

import ScrollBar from './scrollbar';
import { ProcessListProcess } from './processes';
import { Card, Grid } from 'antd';
import ElementIconView, { ItemIconViewProps } from './item-icon-view';
import { useRouter } from 'next/navigation';
import { spaceURL } from '@/lib/utils';
import { useEnvironment } from './auth-can';
import { contextMenuStore } from './processes/context-menu';
import { DraggableElementGenerator } from './processes/draggable-element';
import { OverflowTooltipTitle } from './overflow-tooltip';

const DraggableDiv = DraggableElementGenerator('div', 'itemId');

type IconViewProps = {
  data: ProcessListProcess[];
  elementSelection: {
    selectedElements: ProcessListProcess[];
    setSelectionElements: (action: SetStateAction<ProcessListProcess[]>) => void;
  };
  setShowMobileMetaData: Dispatch<SetStateAction<boolean>>;
};

const IconView: FC<IconViewProps> = ({ data, elementSelection, setShowMobileMetaData }) => {
  const breakpoint = Grid.useBreakpoint();
  const router = useRouter();
  const space = useEnvironment();

  const setContextMenuItems = contextMenuStore((store) => store.setSelected);

  const folders = data.filter((item) => item.type === 'folder');
  const processes = data.filter((item) => item.type !== 'folder');

  const tabCardPropGenerator: ItemIconViewProps<ProcessListProcess>['tabCardPropsGenerator'] = (
    item,
  ) => {
    let cardHeight;
    if (item.type === 'folder') cardHeight = 'fit-content';
    else cardHeight = '300px';

    const cardTitle = (
      <div style={{ display: 'inline-flex', alignItems: 'center', width: '100%' }}>
        {item.type === 'folder' && <FolderOutlined style={{ marginRight: '.5rem' }} />}
        <OverflowTooltipTitle>{item?.name.highlighted}</OverflowTooltipTitle>
        <span style={{ flex: 1 }}></span>
        {breakpoint.xl ? null : <InfoCircleOutlined onClick={() => setShowMobileMetaData(true)} />}
      </div>
    );

    return {
      Wrapper: DraggableDiv,
      cardProps: {
        onDoubleClick: () => {
          const url =
            item.type === 'folder' ? `/processes/folder/${item.id}` : `/processes/${item.id}`;
          router.push(spaceURL(space, url));
        },
        onContextMenu: () => {
          if (elementSelection.selectedElements.some(({ id }) => id === item.id)) {
            setContextMenuItems(elementSelection.selectedElements);
          } else {
            elementSelection.setSelectionElements([item]);
            setContextMenuItems([item]);
          }
        },
        children:
          item.type === 'folder' ? (
            <Card.Meta title={cardTitle} />
          ) : (
            <LazyBPMNViewer definitionId={item.id} reduceLogo={true} />
          ),
        title: item.type === 'process' && cardTitle,
      },
    };
  };

  return (
    <div style={{ height: 'calc(100vh - 64px - 10px - 72px - 10px - 5px - 22px - 5px)' }}>
      {/* Header + Padding + Bar + Margin + MarginFooter + Footer + MarginFooter*/}
      <ScrollBar>
        <ElementIconView
          data={data}
          divisions={[folders, processes]}
          tabCardPropsGenerator={tabCardPropGenerator}
          elementSelection={elementSelection}
        />
      </ScrollBar>
    </div>
  );
};

export default IconView;
