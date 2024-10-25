import ResizableElement, { ResizableElementRefType } from '@/components/ResizableElement';
import CollapsibleCard from '@/components/collapsible-card';
import { ReactNode, useRef } from 'react';
import { InstanceInfo } from '@/lib/engines/deployment';
import { Alert, Drawer, Grid, Tabs } from 'antd';
import React from 'react';
import type { ElementLike } from 'diagram-js/lib/core/Types';
import { statusToType } from './instance-helpers';

function DisplayTable({ data }: { data: { title: ReactNode; children: ReactNode }[] }) {
  // TODO: make this responsive
  return (
    <>
      {data.map((item, idx) => (
        <div key={idx} style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
          <span style={{ width: '20%' }}>{item.title}</span>
          <span>{item.children}</span>
        </div>
      ))}
    </>
  );
}

function Status({ instance, element }: { instance: InstanceInfo; element: ElementLike }) {
  const isRootElement = element && element.type === 'bpmn:Process';

  let status = '';
  if (isRootElement && instance) {
    status = instance.instanceState[0];
  } else if (element && instance) {
    const elementInfo = instance.log.find((l) => l.flowElementId == element.id);
    if (elementInfo) {
      status = elementInfo.executionState;
    } else {
      const tokenInfo = instance.tokens.find((l) => l.currentFlowElementId == element.id);
      status = tokenInfo ? tokenInfo.currentFlowNodeState : 'WAITING';
    }
  }
  const statusType = statusToType(status);

  // from ./src/management-system/src/frontend/components/deployments/activityInfo/ActivityStatusInformation.vue

  // TODO: image

  // TODO: current state

  // TODO: Editable state?

  // TODO: !rootElement External: boolean state
  // return (
  //   this.selectedElement &&
  //   this.selectedElement.businessObject &&
  //   this.selectedElement.businessObject.external
  // );

  // TODO: Editable progress

  // TODO: User task

  // TODO: Planned cost

  // TODO: real cost

  // TODO: Documentation

  return (
    <DisplayTable
      data={[{ title: 'Status', children: <Alert type={statusType} message={status} /> }]}
    />
  );
}

export default function InstanceInfoPanel({
  open,
  close,
  instance,
  selectedElement,
}: {
  close: () => void;
  open: boolean;
  instance?: InstanceInfo;
  selectedElement?: ElementLike;
}) {
  const resizableElementRef = useRef<ResizableElementRefType>(null);
  const breakpoints = Grid.useBreakpoint();

  const title = selectedElement?.businessObject?.name || selectedElement?.id || 'How to PROCEED?';

  if (breakpoints.xl && !open) return null;

  const tabs =
    instance && selectedElement ? (
      <Tabs
        defaultActiveKey="1"
        items={[
          {
            key: 'Status',
            label: 'Status',
            children: <Status instance={instance} element={selectedElement} />,
          },
          {
            key: 'Advanced',
            label: 'Advanced',
            children: 'How to proceed',
          },
          {
            key: 'Timing',
            label: 'Timing',
            children: 'How to proceed',
          },
          {
            key: 'Assignments',
            label: 'Assignments',
            children: 'How to proceed',
          },
          {
            key: 'Resources',
            label: 'Resources',
            children: 'How to proceed',
          },
        ]}
      />
    ) : null;

  if (breakpoints.xl)
    return (
      <ResizableElement
        initialWidth={400}
        minWidth={400}
        maxWidth={'40vw'}
        style={{
          // BPMN.io Symbol with 23 px height + 15 px offset to bottom (=> 38 px), Footer with 32px and Header with 64px, Padding of Toolbar 12px (=> Total 146px)
          height: 'calc(100vh - 150px)',
        }}
        ref={resizableElementRef}
      >
        <CollapsibleCard show={open} onCollapse={close} title={title} collapsedWidth="40px">
          {tabs}
        </CollapsibleCard>
      </ResizableElement>
    );

  return (
    <Drawer open={open} onClose={close} title={title}>
      {tabs}
    </Drawer>
  );
}
