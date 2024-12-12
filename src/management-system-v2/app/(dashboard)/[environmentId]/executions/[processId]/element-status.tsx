import { ReactNode } from 'react';
import { Alert, Checkbox, Image, Progress, ProgressProps, Space, Typography } from 'antd';
import { ClockCircleFilled } from '@ant-design/icons';
import { getPlanDelays, getTimeInfo, statusToType } from './instance-helpers';
import { getMetaDataFromElement } from '@proceed/bpmn-helper';
import { DisplayTable, RelevantInstanceInfo } from './instance-info-panel';
import { endpointBuilder } from '@/lib/engines/endpoint';

function transformMillisecondsToTimeFormat(milliseconds: number | undefined) {
  if (!milliseconds || milliseconds < 0 || milliseconds < 1000) return;

  const days = Math.floor(milliseconds / (3600000 * 24));
  milliseconds -= days * (3600000 * 24);
  const hours = Math.floor(milliseconds / 3600000);
  milliseconds -= hours * 3600000;
  // Minutes part from the difference
  const minutes = Math.floor(milliseconds / 60000);
  milliseconds -= minutes * 60000;
  //Seconds part from the difference
  const seconds = Math.floor(milliseconds / 1000);
  milliseconds -= seconds * 1000;

  return `${days} Days, ${hours}h, ${minutes}min, ${seconds}s`;
}

export function ElementStatus({ info }: { info: RelevantInstanceInfo }) {
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
        {/** TODO: correct image url */}
        <Image
          // TODO: use engine endpoint to get the image
          src={endpointBuilder('get', '/resources/process/:definitionId/images/:fileName', {
            definitionId: info.process.definitionId,
            fileName: metaData.overviewImage,
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

  // Activity time calculation
  const { start, end, duration } = getTimeInfo({
    element: info.element,
    instance: info.instance,
    logInfo,
    token,
  });

  const { delays, plan } = getPlanDelays({ elementMetaData: metaData, start, end, duration });

  // Activity time
  statusEntries.push([
    <Space>
      <ClockCircleFilled style={{ fontSize: '1rem' }} />
      <Typography.Text strong>Started:</Typography.Text>
      <Typography.Text>{start?.toLocaleString()}</Typography.Text>
    </Space>,
    <Space>
      <ClockCircleFilled style={{ fontSize: '1rem' }} />
      <Typography.Text strong>Planned Start:</Typography.Text>
      <Typography.Text>{plan.start?.toLocaleString() || ''}</Typography.Text>
    </Space>,
    <Space>
      <ClockCircleFilled style={{ fontSize: '1rem' }} />
      <Typography.Text strong>Delay:</Typography.Text>
      <Typography.Text type={delays.start && delays.start >= 1000 ? 'danger' : undefined}>
        {transformMillisecondsToTimeFormat(delays.start)}
      </Typography.Text>
    </Space>,
  ]);

  statusEntries.push([
    <Space>
      <ClockCircleFilled style={{ fontSize: '1rem' }} />
      <Typography.Text strong>Duration:</Typography.Text>
      <Typography.Text>{transformMillisecondsToTimeFormat(duration)}</Typography.Text>
    </Space>,
    <Space>
      <ClockCircleFilled style={{ fontSize: '1rem' }} />
      <Typography.Text strong>Planned Duration:</Typography.Text>
      <Typography.Text>{transformMillisecondsToTimeFormat(plan.duration)}</Typography.Text>
    </Space>,
    <Space>
      <ClockCircleFilled style={{ fontSize: '1rem' }} />
      <Typography.Text strong>Delay:</Typography.Text>
      <Typography.Text type={delays.duration && delays.duration >= 1000 ? 'danger' : undefined}>
        {transformMillisecondsToTimeFormat(delays.duration)}
      </Typography.Text>
    </Space>,
  ]);

  statusEntries.push([
    <Space>
      <ClockCircleFilled style={{ fontSize: '1rem' }} />
      <Typography.Text strong>Ended:</Typography.Text>
      <Typography.Text>{end?.toLocaleString()}</Typography.Text>
    </Space>,
    <Space>
      <ClockCircleFilled style={{ fontSize: '1rem' }} />
      <Typography.Text strong>Planned End:</Typography.Text>
      <Typography.Text>{plan.end?.toLocaleString() || ''}</Typography.Text>
    </Space>,
    <Space>
      <ClockCircleFilled style={{ fontSize: '1rem' }} />
      <Typography.Text strong>Delay:</Typography.Text>
      <Typography.Text type={delays.end && delays.end >= 1000 ? 'danger' : undefined}>
        {transformMillisecondsToTimeFormat(delays.end)}
      </Typography.Text>
    </Space>,
  ]);

  return <DisplayTable data={statusEntries} />;
}
