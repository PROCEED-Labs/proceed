import ScrollBar from '@/components/scrollbar';
import ElementIconView, { ItemIconViewProps } from '@/components/item-icon-view';
import { ProcessListProcess } from './deployments-modal';
import { Button, Card } from 'antd';
import Viewer from '@/components/bpmn-viewer';
import { FolderOutlined } from '@ant-design/icons';
import { HTMLAttributes, Suspense } from 'react';
import ProceedLoadingIndicator from '@/components/loading-proceed';

const ProcessIconView = ({
  data: filteredData,
  openFolder,
  selectProcess,
  containerProps,
}: {
  data: ProcessListProcess[];
  openFolder: (id: string) => void;
  selectProcess: (process: ProcessListProcess) => void;
  containerProps?: HTMLAttributes<HTMLDivElement>;
}) => {
  const folders = filteredData.filter((item) => item.type === 'folder');
  const processesData = filteredData.filter((item) => item.type !== 'folder');

  const tabCardPropGenerator: ItemIconViewProps<ProcessListProcess>['tabCardPropsGenerator'] = (
    item,
  ) => {
    let cardHeight;
    if (item.type === 'folder') cardHeight = 'fit-content';
    else cardHeight = '300px';

    const cardTitle = (
      <div style={{ display: 'inline-flex', alignItems: 'center', width: '100%' }}>
        {item.type === 'folder' && <FolderOutlined style={{ marginRight: '.5rem' }} />}
        {item?.name.highlighted}
        <span style={{ flex: 1 }}></span>
        {item.type !== 'folder' && (
          <Button type="primary" size="small" onClick={() => selectProcess(item)}>
            Deploy Process
          </Button>
        )}
      </div>
    );

    return {
      cardProps: {
        onDoubleClick: () => {
          openFolder(item.id);
        },
        children:
          item.type === 'folder' ? (
            <Card.Meta title={cardTitle} />
          ) : (
            <Suspense fallback={<ProceedLoadingIndicator />}>
              <Viewer definitionId={item.id} reduceLogo={true} fitOnResize />
            </Suspense>
          ),
        title: item.type === 'process' && cardTitle,
      },
    };
  };
  return (
    <ScrollBar width="12px">
      <ElementIconView
        tabCardPropsGenerator={tabCardPropGenerator}
        data={filteredData}
        divisions={[folders, processesData]}
        containerProps={containerProps}
      />
    </ScrollBar>
  );
};

export default ProcessIconView;
