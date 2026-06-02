import { ReactNode } from 'react';
import { Alert, Checkbox, Image, Progress, ProgressProps, Space, Typography } from 'antd';
import { ClockCircleFilled } from '@ant-design/icons';
import { getPlannedTimeInfo, statusToType } from './instance-helpers';
import { getMetaDataFromElement } from '@proceed/bpmn-helper';
import { DisplayTable } from './instance-info-panel';
import endpointBuilder from '@/lib/engines/endpoints/endpoint-builder';
import { generateDateString, generateDurationString, generateNumberString } from '@/lib/utils';
import type { ElementLike } from 'diagram-js/lib/core/Types';
import { ExtendedInstanceInfo } from '@/lib/data/instance';

export function ElementStatus({
  processId,
  element,
  instance,
}: {
  processId: string;
  element: ElementLike;
  instance?: ExtendedInstanceInfo;
}) {
  const statusEntries: ReactNode[][] = [];

  const isRootElement = element && element.type === 'bpmn:Process';
  const metaData = getMetaDataFromElement(element.businessObject);
  const token = instance?.tokens.find((l) => l.currentFlowElementId == element.id);
  const logInfo = instance?.log.find((logEntry) => logEntry.flowElementId === element.id);

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
              definitionId: processId,
              fileName: metaData.overviewImage,
            },
          })}
        />
      </div>,
    ]);

  // Element status
  let status = undefined;
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
        value={element.businessObject && element.businessObject.external}
      />,
    ]);
  }

  // Progress
  // TODO: editable progress
  // see src/management-system/src/frontend/components/deployments/activityInfo/ProgressSetter.vue
  if (instance && !isRootElement) {
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
  if (element.type === 'bpmn:UserTask') {
    let priority: number | undefined = undefined;

    if (instance) {
      if (token) priority = token.priority;
      else if (logInfo) priority = logInfo.priority;
    } else {
      priority = metaData['defaultPriority'];
    }

    statusEntries.push(['Priority:', priority]);
  }

  // Planned costs
  const costs: { value: string; unit: string } | undefined = metaData['costsPlanned'];
  statusEntries.push([
    'Planned Costs:',
    costs &&
      generateNumberString(+costs.value, {
        style: 'currency',
        currency: costs.unit,
      }),
  ]);

  // Documentation
  statusEntries.push(['Documentation:', element.businessObject?.documentation?.[0]?.text]);

  let timing: NonNullable<ExtendedInstanceInfo['tokens'][number]['timing']> = {
    actual: { start: undefined, end: undefined, duration: undefined },
    plan: { start: undefined, end: undefined, duration: undefined },
    delays: { start: undefined, end: undefined, duration: undefined },
  };

  if (logInfo) {
    if (logInfo.timing) timing = logInfo.timing;
  } else if (token) {
    if (token.timing) timing = token.timing;
  } else if (instance && isRootElement) {
    if (instance.timing) timing = instance.timing;
  } else {
    timing.plan = getPlannedTimeInfo(metaData);
  }

  // Real Costs
  // TODO: Set real costs
  if (instance) {
    let costs: string | undefined = undefined;
    if (token)
      costs =
        token.costsRealSetByOwner &&
        generateNumberString(+token.costsRealSetByOwner.value, {
          style: 'currency',
          currency: token.costsRealSetByOwner.unit,
        });
    else if (logInfo)
      costs =
        logInfo.costsRealSetByOwner &&
        generateNumberString(+logInfo.costsRealSetByOwner.value, {
          style: 'currency',
          currency: logInfo.costsRealSetByOwner.unit,
        });
    else {
      costs = instance.executionCosts
        ?.map((c) =>
          generateNumberString(+c.value, {
            style: 'currency',
            currency: c.unit,
          }),
        )
        .join(' + ');
    }

    statusEntries.push(['Real Costs:', costs]);
  }

  // Activity time
  statusEntries.push([
    <Space key="started">
      <ClockCircleFilled style={{ fontSize: '1rem' }} />
      <Typography.Text strong>Started:</Typography.Text>
      <Typography.Text>{generateDateString(timing.actual.start, true)}</Typography.Text>
    </Space>,
    <Space key="planned-start">
      <ClockCircleFilled style={{ fontSize: '1rem' }} />
      <Typography.Text strong>Planned Start:</Typography.Text>
      <Typography.Text>{generateDateString(timing.plan.start, true) || ''}</Typography.Text>
    </Space>,
    <Space key="start-delay">
      <ClockCircleFilled style={{ fontSize: '1rem' }} />
      <Typography.Text strong>Delay:</Typography.Text>
      <Typography.Text
        type={timing.delays.start && timing.delays.start >= 1000 ? 'danger' : undefined}
      >
        {generateDurationString(timing.delays.start)}
      </Typography.Text>
    </Space>,
  ]);

  statusEntries.push([
    <Space key="duration">
      <ClockCircleFilled style={{ fontSize: '1rem' }} />
      <Typography.Text strong>Duration:</Typography.Text>
      <Typography.Text>{generateDurationString(timing.actual.duration)}</Typography.Text>
    </Space>,
    <Space key="duration-planned">
      <ClockCircleFilled style={{ fontSize: '1rem' }} />
      <Typography.Text strong>Planned Duration:</Typography.Text>
      <Typography.Text>{generateDurationString(timing.plan.duration)}</Typography.Text>
    </Space>,
    <Space key="duration-delay">
      <ClockCircleFilled style={{ fontSize: '1rem' }} />
      <Typography.Text strong>Delay:</Typography.Text>
      <Typography.Text
        type={timing.delays.duration && timing.delays.duration >= 1000 ? 'danger' : undefined}
      >
        {generateDurationString(timing.delays.duration)}
      </Typography.Text>
    </Space>,
  ]);

  statusEntries.push([
    <Space key="end">
      <ClockCircleFilled style={{ fontSize: '1rem' }} />
      <Typography.Text strong>Ended:</Typography.Text>
      <Typography.Text>{generateDateString(timing.actual.end, true)}</Typography.Text>
    </Space>,
    <Space key="end-planned">
      <ClockCircleFilled style={{ fontSize: '1rem' }} />
      <Typography.Text strong>Planned End:</Typography.Text>
      <Typography.Text>{generateDateString(timing.plan.end, true) || ''}</Typography.Text>
    </Space>,
    <Space key="end-delay">
      <ClockCircleFilled style={{ fontSize: '1rem' }} />
      <Typography.Text strong>Delay:</Typography.Text>
      <Typography.Text type={timing.delays.end && timing.delays.end >= 1000 ? 'danger' : undefined}>
        {generateDurationString(timing.delays.end)}
      </Typography.Text>
    </Space>,
  ]);

  return <DisplayTable data={statusEntries} />;
}
