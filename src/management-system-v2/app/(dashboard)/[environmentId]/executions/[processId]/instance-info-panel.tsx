import ResizableElement, { ResizableElementRefType } from '@/components/ResizableElement';
import CollapsibleCard from '@/components/collapsible-card';
import { useRef } from 'react';
import { InstanceInfo } from '@/lib/engines/deployment';
import { Typography } from 'antd';
import React from 'react';

function InstanceInfoDisplay({ instance }: { instance?: InstanceInfo }) {
  return (
    <div>
      <Typography.Title>Name</Typography.Title>
      <Typography.Text></Typography.Text>
    </div>
  );
}

export default function InstanceInfoPanel({
  open,
  close,
  instance,
}: {
  close: () => void;
  open: boolean;
  instance?: InstanceInfo;
}) {
  const resizableElementRef = useRef<ResizableElementRefType>(null);

  if (open)
    return (
      <ResizableElement
        initialWidth={400}
        minWidth={300}
        maxWidth={'30vw'}
        style={{
          // BPMN.io Symbol with 23 px height + 15 px offset to bottom (=> 38 px), Footer with 32px and Header with 64px, Padding of Toolbar 12px (=> Total 146px)
          height: 'calc(100vh - 150px)',
        }}
        ref={resizableElementRef}
      >
        <CollapsibleCard show={open} onCollapse={close} title="Properties" collapsedWidth="40px">
          <InstanceInfoDisplay instance={instance} />
        </CollapsibleCard>
      </ResizableElement>
    );
}
