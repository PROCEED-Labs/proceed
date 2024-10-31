import ResizableElement, { ResizableElementRefType } from '@/components/ResizableElement';
import CollapsibleCard from '@/components/collapsible-card';
import { ReactNode, useRef } from 'react';
import { DeployedProcessInfo, InstanceInfo, VersionInfo } from '@/lib/engines/deployment';
import { Alert, Checkbox, Drawer, Grid, Image, Progress, ProgressProps, Tabs } from 'antd';
import React from 'react';
import type { ElementLike } from 'diagram-js/lib/core/Types';
import { statusToType } from './instance-helpers';
import { getMetaDataFromElement } from '@proceed/bpmn-helper';
import { generateRequestUrl } from '@/lib/engines/endpoints';

type RelevantInfo = {
  instance?: InstanceInfo;
  process: DeployedProcessInfo & { name: string };
  element: ElementLike;
  version: VersionInfo;
};

function DisplayTable({ data }: { data: ReactNode[][] }) {
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

function Status({ info }: { info: RelevantInfo }) {
  const statusEntries: ReactNode[][] = [];

  const isRootElement = info.element && info.element.type === 'bpmn:Process';
  const metaData = getMetaDataFromElement(info.element.businessObject);
  const token = info.instance?.tokens.find((l) => l.currentFlowElementId == info.element.id);
  const logInfo = info.instance?.log.find((logEntry) => logEntry.flowElementId === info.element.id);

  // Element image
  if (metaData.overviewImage)
    statusEntries.push([
      'Image',
      <div
        style={{
          width: '75%',
          display: 'flex',
          justifyContent: 'center',
          margin: 'auto',
          marginTop: '1rem',
        }}
      >
        <Image
          src={generateRequestUrl(
            { id: '', ip: 'localhost', port: 33029 },
            `/resources/process/${info.process.definitionId}/images/${metaData.overviewImage}`,
          )}
        />
      </div>,
    ]);

  // Element status
  let status = undefined;
  if (isRootElement && info.instance) {
    status = info.instance.instanceState[0];
  } else if (info.element && info.instance) {
    const elementInfo = info.instance.log.find((l) => l.flowElementId == info.element.id);
    if (elementInfo) {
      status = elementInfo.executionState;
    } else {
      const tokenInfo = info.instance.tokens.find((l) => l.currentFlowElementId == info.element.id);
      status = tokenInfo ? tokenInfo.currentFlowNodeState : 'WAITING';
    }
  }
  const statusType = status && statusToType(status);

  statusEntries.push([
    'Current state:',
    status && statusType && <Alert type={statusType} message={status} showIcon />,
  ]);

  // from ./src/management-system/src/frontend/components/deployments/activityInfo/ActivityStatusInformation.vue
  // TODO: Editable state?

  // Is External
  if (!isRootElement) {
    statusEntries.push([
      'External:',
      <Checkbox
        disabled
        value={info.element.businessObject && info.element.businessObject.external}
      />,
    ]);
  }

  // Progress
  // TODO: editable progress
  // see src/management-system/src/frontend/components/deployments/activityInfo/ProgressSetter.vue
  if (info.instance && !isRootElement) {
    let progress:
      | { value: number; manual: boolean; milestoneCalculatedProgress?: number }
      | undefined = undefined;
    if (token && token.currentFlowNodeProgress) {
      let milestoneCalculatedProgress = 0;
      if (token.milestones && Object.keys(token.milestones).length > 0) {
        const milestoneProgressValues = Object.values(token.milestones);
        milestoneCalculatedProgress =
          milestoneProgressValues.reduce((acc, milestoneVal) => acc + milestoneVal) /
          milestoneProgressValues.length;
      }

      progress = {
        ...token.currentFlowNodeProgress,
        milestoneCalculatedProgress,
      };
    } else if (logInfo?.progress) {
      progress = logInfo.progress;
    }

    if (progress) {
      let progressStatus: ProgressProps['status'] = 'normal';
      if (statusType === 'success') progressStatus = 'success';
      else if (statusType === 'error') progressStatus = 'exception';

      statusEntries.push([
        'Progress',
        <Progress percent={progress.value} status={progressStatus} />,
      ]);
    }
  }

  // User task
  // TODO: editable priority
  if (info.element.type === 'bpmn:UserTask') {
    let priority: number | undefined = undefined;

    if (info.instance) {
      if (token) priority = token.priority;
      else if (logInfo) priority = logInfo.priority;
    } else {
      priority = metaData['defaultPriority'];
    }

    statusEntries.push(['Priority:', priority]);
  }

  // Planned costs
  // TODO: Costs currency
  statusEntries.push(['Planned Costs:', metaData['costsPlanned']]);

  // Real Costs
  // TODO: Set real costs
  if (info.instance && !isRootElement) {
    let costs: string | undefined = undefined;
    if (token) costs = token.costsRealSetByOwner;
    else if (logInfo) costs = logInfo.costsRealSetByOwner;

    statusEntries.push(['Real Costs:', costs]);
  }

  // Documentation
  statusEntries.push(['Documentation:', info.element.businessObject?.documentation?.[0]?.text]);

  return <DisplayTable data={statusEntries} />;
}

export default function InstanceInfoPanel({
  open,
  close,
  info,
}: {
  close: () => void;
  open: boolean;
  info: RelevantInfo;
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
          children: <Status info={info} />,
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
