import { ReactNode } from 'react';
import { Alert, Button, Checkbox, Image, Progress, ProgressProps, Space, Typography } from 'antd';
import { ClockCircleFilled } from '@ant-design/icons';
import { getPlanDelays, getTimeInfo, statusToType } from './instance-helpers';
import { getMetaDataFromElement } from '@proceed/bpmn-helper';
import { DisplayTable, RelevantInstanceInfo } from './instance-info-panel';
import endpointBuilder from '@/lib/engines/endpoints/endpoint-builder';
import { generateDateString, generateDurationString, generateNumberString } from '@/lib/utils';
import styles from './element-status.module.scss';

type EntryTextProps = React.ComponentProps<typeof Typography.Text>;
const EntryText = (props: EntryTextProps) => (
  <Typography.Text ellipsis={{ tooltip: { ...props } }} className={styles.ElementText} {...props} />
);

const ClockSymbol = () => (
  <ClockCircleFilled style={{ fontSize: '1.1rem', verticalAlign: 'middle' }} />
);

export function ElementStatus({ info }: { info: RelevantInstanceInfo }) {
  const statusEntries: ReactNode[][] = [];

  const isRootElement = info.element && info.element.type === 'bpmn:Process';
  const metaData = getMetaDataFromElement(info.element.businessObject);
  const token = info.instance?.tokens.find((l) => l.currentFlowElementId == info.element.id);
  const logInfo = info.instance?.log.find((logEntry) => logEntry.flowElementId === info.element.id);

  if (!info.instance) {
    return (
      <>
        <Typography.Title style={{ marginBottom: 20, marginTop: 5 }}>
          Let's select some instances!
        </Typography.Title>
        <Space.Compact orientation="vertical">
          <Button style={{ justifyContent: 'left' }}>1. Instance: 5/22/2026, 4:11:49 PM</Button>
          <Button style={{ justifyContent: 'left' }}>2. Instance: 5/22/2026, 4:10:34 PM</Button>
          <Button style={{ justifyContent: 'left' }}>3. Instance: 5/22/2026, 4:07:23 PM</Button>
          <Button style={{ justifyContent: 'left' }}>4. Instance: 5/22/2026, 3:51:33 PM</Button>
          <Button style={{ justifyContent: 'left' }}>5. Instance: 5/21/2026, 8:41:49 PM</Button>
          <Button style={{ justifyContent: 'left' }}>6. Instance: 5/22/2026, 7:11:49 PM</Button>
        </Space.Compact>
      </>
    );
  }

  if (isRootElement) {
    statusEntries.push([
      <EntryText>Name</EntryText>,
      <EntryText>Vacation Requests Automated</EntryText>,
    ]);
    statusEntries.push([<EntryText>Short Name</EntryText>, <EntryText>Vac-Req-Aut</EntryText>]);
    statusEntries.push([
      <EntryText>ID</EntryText>,
      <EntryText>_e7543fc7-6f55-4175-8ff0-5ed1d3a303ac</EntryText>,
    ]);
    statusEntries.push([<EntryText>Version Name</EntryText>, <EntryText>v1</EntryText>]);
    statusEntries.push([
      <EntryText>Version Description</EntryText>,
      <EntryText>Version description, yes.</EntryText>,
    ]);
    statusEntries.push([
      <EntryText>Version Based on</EntryText>,
      <EntryText>_66fac292-e026-40cb-9d96-a406e00d5ef2</EntryText>,
    ]);
    statusEntries.push([
      <EntryText>Version Created on</EntryText>,
      <EntryText>2026-05-18T11:39:54.943Z</EntryText>,
    ]);
    statusEntries.push([
      <EntryText>Instance ID</EntryText>,
      <EntryText>
        _e7543fc7-6f55-4175-8ff0-5ed1d3a303ac-_3b0e251c-8863-4371-ae3c-d63140a3b9fd-6979d78d-954c-4df7-8b08-52e137fadc17
      </EntryText>,
    ]);
    statusEntries.push([<EntryText>Initiator Name</EntryText>, <EntryText>Timmy Test</EntryText>]);
    statusEntries.push([
      <EntryText>Initiator ID</EntryText>,
      <EntryText>d0dc354a-5d8a-455d-b3f4-d8dcc09768f2</EntryText>,
    ]);
    statusEntries.push([<EntryText>Initiator Username</EntryText>, <EntryText>timtes</EntryText>]);
    statusEntries.push([<EntryText>Initiator Space</EntryText>, <EntryText>org1</EntryText>]);
    statusEntries.push([
      <EntryText>Initiator Space ID</EntryText>,
      <EntryText>e1d5a6ae-667f-4d15-87f6-ec49391535d6</EntryText>,
    ]);
    statusEntries.push([
      <EntryText>Start Time</EntryText>,
      <EntryText>5/20/2026, 12:39 PM</EntryText>,
    ]);
    statusEntries.push([<EntryText>Engine</EntryText>, <EntryText>engine1</EntryText>]);
    statusEntries.push([
      <EntryText>Engine ID</EntryText>,
      <EntryText>488200f1-aec4-4188-843e-e0b6de4c5ed1</EntryText>,
    ]);
  } else {
    statusEntries.push([
      <EntryText>{'Step ID (or "Event ID"?)'}</EntryText>,
      <EntryText>Activity_0309v8x</EntryText>,
    ]);
    statusEntries.push([
      <EntryText>Step Name</EntryText>,
      <EntryText>Check vacation application</EntryText>,
    ]);
    statusEntries.push([<EntryText>Step Type</EntryText>, <EntryText>User Task</EntryText>]);
    statusEntries.push([
      <EntryText>Previous Step ID</EntryText>,
      <EntryText>Check vacation application</EntryText>,
    ]);
    statusEntries.push([
      <EntryText>Actual Performer</EntryText>,
      <EntryText>Sandra Sample</EntryText>,
    ]);
    statusEntries.push([
      <EntryText>Actual Performer Username</EntryText>,
      <EntryText>sansam</EntryText>,
    ]);
    statusEntries.push([
      <EntryText>Actual Performer ID</EntryText>,
      <EntryText>29880751-c190-4f58-b5cb-438754e9f02d</EntryText>,
    ]);
  }

  // Element image
  if (metaData.overviewImage)
    statusEntries.push([
      'Image',
      <div
        key="image"
        style={{
          width: '75%',
          display: 'flex',
          justifyContent: 'center',
          margin: 'auto',
          marginTop: '1rem',
        }}
      >
        {/** TODO: correct image url */}
        <Image
          // TODO: use engine endpoint to get the image
          alt="Image linked to the element"
          src={endpointBuilder('get', '/resources/process/:definitionId/images/:fileName', {
            pathParams: {
              definitionId: info.process.definitionId,
              fileName: metaData.overviewImage,
            },
          })}
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
    status && statusType && <Alert type={statusType} title={status} showIcon />,
  ]);

  // from ./src/management-system/src/frontend/components/deployments/activityInfo/ActivityStatusInformation.vue
  // TODO: Editable state?

  // Is External
  if (!isRootElement) {
    statusEntries.push([
      'External:',
      <Checkbox
        key="external"
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
        <Progress key="progress" percent={progress.value} status={progressStatus} />,
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

  // Budget
  const costs: { value: string; unit: string } | undefined = metaData['costsPlanned'];
  statusEntries.push([
    'Budget:',
    costs &&
      generateNumberString(+costs.value, {
        style: 'currency',
        currency: costs.unit,
      }),
  ]);

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

  // Activity time calculation
  const { start, end, duration } = getTimeInfo({
    element: info.element,
    instance: info.instance,
    logInfo,
    token,
  });

  const { delays, plan } = getPlanDelays({ elementMetaData: metaData, start, end, duration });

  // adding an empty line for padding
  statusEntries.push([]);
  // Activity time
  // statusEntries.push([
  //   <Space key="started">
  //     <ClockSymbol />
  //     <EntryText strong>Started:</EntryText>
  //     <EntryText>{generateDateString(start, true)}</EntryText>
  //   </Space>,
  //   <Space key="planned-start">
  //     <ClockSymbol />
  //     <EntryText strong>Planned Start:</EntryText>
  //     <EntryText>{generateDateString(plan.start, true) || ''}</EntryText>
  //   </Space>,
  //   <Space key="start-delay">
  //     <ClockSymbol />
  //     <EntryText strong>Delay:</EntryText>
  //     <EntryText type={delays.start && delays.start >= 1000 ? 'danger' : undefined}>
  //       {generateDurationString(delays.start)}
  //     </EntryText>
  //   </Space>,
  // ]);

  // statusEntries.push([
  //   <Space key="duration">
  //     <ClockSymbol />
  //     <EntryText strong>Duration:</EntryText>
  //     <EntryText>{generateDurationString(duration)}</EntryText>
  //   </Space>,
  //   <Space key="duration-planned">
  //     <ClockSymbol />
  //     <EntryText strong>Planned Duration:</EntryText>
  //     <EntryText>{generateDurationString(plan.duration)}</EntryText>
  //   </Space>,
  //   <Space key="duration-delay">
  //     <ClockSymbol />
  //     <EntryText strong>Delay:</EntryText>
  //     <EntryText type={delays.duration && delays.duration >= 1000 ? 'danger' : undefined}>
  //       {generateDurationString(delays.duration)}
  //     </EntryText>
  //   </Space>,
  // ]);

  // statusEntries.push([
  //   <Space key="end">
  //     <ClockSymbol />
  //     <EntryText strong>Ended:</EntryText>
  //     <EntryText>{generateDateString(end, true)}</EntryText>
  //   </Space>,
  //   <Space key="end-planned">
  //     <ClockSymbol />
  //     <EntryText strong>Planned End:</EntryText>
  //     <EntryText>{generateDateString(plan.end, true) || ''}</EntryText>
  //   </Space>,
  //   <Space key="end-delay">
  //     <ClockSymbol />
  //     <EntryText strong>Delay:</EntryText>
  //     <EntryText type={delays.end && delays.end >= 1000 ? 'danger' : undefined}>
  //       {generateDurationString(delays.end)}
  //     </EntryText>
  //   </Space>,
  // ]);

  return <DisplayTable data={statusEntries} />;
}
