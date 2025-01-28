import ResizableElement, { ResizableElementRefType } from '@/components/ResizableElement';
import CollapsibleCard from '@/components/collapsible-card';
import { ReactNode, useRef } from 'react';
import { DeployedProcessInfo, InstanceInfo, VersionInfo } from '@/lib/engines/deployment';
import { Drawer, Grid, Tabs } from 'antd';
import type { ElementLike } from 'diagram-js/lib/core/Types';
import { ElementStatus } from './element-status';

export type RelevantInstanceInfo = {
  instance?: InstanceInfo;
  process: DeployedProcessInfo;
  element: ElementLike;
  version: VersionInfo;
};

export function DisplayTable({ data }: { data: ReactNode[][] }) {
  // TODO: make this responsive
  return (
    <table style={{ borderSpacing: '0 .5rem', borderCollapse: 'separate' }}>
      {data.map((row, idx_row) => (
        <tr key={idx_row}>
          {row.map((cell, idx_cell) => (
            <td
              key={`${idx_row}.${idx_cell}`}
              style={{ paddingRight: idx_cell < row.length - 1 ? '1rem' : '' }}
            >
              {cell}
            </td>
          ))}
        </tr>
      ))}
    </table>
  );
}

export default function InstanceInfoPanel({
  open,
  close,
  info,
}: {
  close: () => void;
  open: boolean;
  info: RelevantInstanceInfo;
}) {
  const resizableElementRef = useRef<ResizableElementRefType>(null);
  const breakpoints = Grid.useBreakpoint();

  const title = info.element?.businessObject?.name || info.element?.id || 'How to PROCEED?';

  if (breakpoints.xl && !open) return null;

  const tabs = info.element ? (
    <Tabs
      defaultActiveKey="1"
      items={[
        {
          key: 'Status',
          label: 'Status',
          children: <ElementStatus info={info} />,
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
