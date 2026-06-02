import { ReactNode, useState } from 'react';
import {
  Alert,
  Checkbox,
  Collapse,
  Divider,
  Progress,
  ProgressProps,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';
import { ClockCircleFilled } from '@ant-design/icons';
import { getPlanDelays, getTimeInfo, statusToType } from './instance-helpers';
import { getMetaDataFromElement } from '@proceed/bpmn-helper';
import { DataGrid, DisplayTable, RelevantInstanceInfo } from './instance-info-panel';
import endpointBuilder from '@/lib/engines/endpoints/endpoint-builder';
import { generateDateString, generateDurationString, generateNumberString } from '@/lib/utils';
import styles from './element-status.module.scss';
import { InstanceSelector } from './instance-selector';
import TextViewer from '@/components/text-viewer';

type EntryTextProps = React.ComponentProps<typeof Typography.Text>;
const EntryKeyText = (props: EntryTextProps) => (
  <Typography.Text className={styles.ElementText + ' ' + styles.ElementKeyText} {...props} />
);
const EntryValueText = (props: EntryTextProps) => {
  return props.children ? (
    <Typography.Text className={styles.ElementText + ' ' + styles.ElementValueText} {...props} />
  ) : (
    <Typography.Text
      className={styles.ElementText + ' ' + styles.ElementValueText}
      style={{ color: '#aaa', fontStyle: 'normal' }}
    >
      N/A
    </Typography.Text>
  );
};

const TechEntryKey = (props: EntryTextProps) => (
  <Space style={{ fontSize: '.9em' }}>
    <EntryKeyText {...props} />
    <Tag
      variant="outlined"
      color={'blue'}
      style={{
        width: '30px',
        height: '15px',
        fontSize: 8,
        display: 'inline-flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      TECH
    </Tag>
  </Space>
);

const TechDetailsSwitch = ({
  techDetails,
  setTechDetailsCb,
}: {
  techDetails: boolean;
  setTechDetailsCb: (checked: boolean) => void;
}) => {
  const textColor = techDetails ? '#3e93de' : '#aaa';
  return (
    <div
      style={{
        width: '100%',
        justifyContent: 'space-between',
        flexWrap: 'nowrap',
        alignItems: 'start',
        display: 'inline-flex',
        gap: 10,
        padding: '10px 20px',
        backgroundColor: 'hsla(213, 100%, 58%, 0.06)',
        borderBottom: 'solid',
        borderColor: 'hsla(213, 100%, 52%, 0.08)',
        borderWidth: 2,
      }}
    >
      <Switch onChange={(checked) => setTechDetailsCb(checked)} />
      <Space
        style={{
          width: '100%',
          justifyContent: 'space-between',
          flexWrap: 'nowrap',
          alignItems: 'start',
          display: 'inline-flex',
          gap: 10,
        }}
      >
        <Typography.Text style={{ fontSize: '.9em', fontWeight: 'bold', color: textColor }}>
          Show technical details
        </Typography.Text>

        <Typography.Text style={{ fontSize: '.9em', fontWeight: 'bold', color: '#aaa' }}>
          {techDetails ? 'IDs & system info shown' : 'IDs & system info hidden'}
        </Typography.Text>
      </Space>
    </div>
  );
};

export function ElementStatus({ info }: { info: RelevantInstanceInfo }) {
  if (!info.instance) return <InstanceSelector />;
  const [techDetails, setTechDetails] = useState(false);
  const statusEntries: ReactNode[][] = [];

  const isRootElement = info.element && info.element.type === 'bpmn:Process';
  const metaData = getMetaDataFromElement(info.element.businessObject);
  const token = info.instance?.tokens.find((l) => l.currentFlowElementId == info.element.id);
  const logInfo = info.instance?.log.find((logEntry) => logEntry.flowElementId === info.element.id);

  // TECH DETAILS SWITCH
  statusEntries.push([
    <TechDetailsSwitch techDetails={techDetails} setTechDetailsCb={setTechDetails} />,
  ]);
  if (isRootElement) {
    // GENERAL
    statusEntries.push([
      <EntryKeyText style={{ fontWeight: '600', fontSize: '.9em' }}>GENERAL</EntryKeyText>,
    ]);
    statusEntries.push([
      <EntryKeyText>Name</EntryKeyText>,
      <EntryValueText>Vacation Requests Automated</EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText>Short Name</EntryKeyText>,
      <EntryValueText>Vac-Req-Aut</EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText>Documentation</EntryKeyText>,

      <TextViewer initialValue={info.element.businessObject?.documentation?.[0]?.text} />,
    ]);
    statusEntries.push([
      <EntryKeyText>Process Mangager</EntryKeyText>,
      <EntryValueText>Sandra Sample</EntryValueText>,
    ]);
    if (techDetails)
      statusEntries.push([
        <TechEntryKey>ID</TechEntryKey>,
        <EntryValueText>_e7543fc7-6f55-4175-8ff0-5ed1d3a303ac</EntryValueText>,
      ]);

    // VERSION DATA
    statusEntries.push([
      <Space orientation="vertical" style={{ width: '100%', padding: 0, margin: 0 }}>
        <Divider style={{ padding: 0, margin: 0 }} />
        <EntryKeyText style={{ fontWeight: '600', fontSize: '.9em' }}>VERSION</EntryKeyText>
      </Space>,
    ]);
    statusEntries.push([
      <EntryKeyText>Version Name</EntryKeyText>,
      <EntryValueText>v2</EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText>What changed</EntryKeyText>,
      <EntryValueText>Version description, yes.</EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText>Created on</EntryKeyText>,
      <EntryValueText>2026-05-18T11:39:54.943Z</EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText>Based on</EntryKeyText>,
      <EntryValueText>v1</EntryValueText>,
    ]);
    if (techDetails)
      statusEntries.push([
        <TechEntryKey>Based on ID</TechEntryKey>,
        <EntryValueText>_66fac292-e026-40cb-9d96-a406e00d5ef2</EntryValueText>,
      ]);

    // INITIATOR
    statusEntries.push([
      <Space orientation="vertical" style={{ width: '100%', padding: 0, margin: 0 }}>
        <Divider style={{ padding: 0, margin: 0 }} />
        <EntryKeyText style={{ fontWeight: '600', fontSize: '.9em' }}>WHO STARTED IT</EntryKeyText>
      </Space>,
    ]);
    statusEntries.push([
      <EntryKeyText>Started by</EntryKeyText>,
      <EntryValueText>Timmy Test</EntryValueText>,
    ]);
    if (techDetails)
      statusEntries.push([
        <TechEntryKey>Username</TechEntryKey>,
        <EntryValueText>timtes</EntryValueText>,
      ]);
    if (techDetails)
      statusEntries.push([
        <TechEntryKey>User ID</TechEntryKey>,
        <EntryValueText>d0dc354a-5d8a-455d-b3f4-d8dcc09768f2</EntryValueText>,
      ]);
    statusEntries.push([
      <EntryKeyText>Workspace</EntryKeyText>,
      <EntryValueText>org1</EntryValueText>,
    ]);
    if (techDetails)
      statusEntries.push([
        <TechEntryKey>Workspace ID</TechEntryKey>,
        <EntryValueText>e1d5a6ae-667f-4d15-87f6-ec49391535d6</EntryValueText>,
      ]);

    // TIMING
    statusEntries.push([
      <Space orientation="vertical" style={{ width: '100%', padding: 0, margin: 0 }}>
        <Divider style={{ padding: 0, margin: 0 }} />
        <EntryKeyText style={{ fontWeight: '600', fontSize: '.9em' }}>TIMING</EntryKeyText>
      </Space>,
    ]);
    if (techDetails)
      statusEntries.push([
        <TechEntryKey>Run ID</TechEntryKey>,
        <EntryValueText>
          _e7543fc7-6f55-4175-8ff0-5ed1d3a303ac-_3b0e251c-8863-4371-ae3c-d63140a3b9fd-6979d78d-954c-4df7-8b08-52e137fadc17
        </EntryValueText>,
      ]);
    statusEntries.push([<EntryKeyText>Planned duration</EntryKeyText>, <EntryValueText />]);
    statusEntries.push([
      <EntryKeyText>Start Time</EntryKeyText>,
      <EntryValueText>5/20/2026, 12:39 PM</EntryValueText>,
    ]);
    statusEntries.push([<EntryKeyText>End Time</EntryKeyText>, <EntryValueText />]);
    statusEntries.push([
      <EntryKeyText>Time so far</EntryKeyText>,
      <EntryValueText>2h 47m</EntryValueText>,
    ]);

    // ENGINE

    if (techDetails) {
      statusEntries.push([
        <Space orientation="vertical" style={{ width: '100%', padding: 0, margin: 0 }}>
          <Divider style={{ padding: 0, margin: 0 }} />
          <EntryKeyText style={{ fontWeight: '600', fontSize: '.9em' }}>WHERE IT RUNS</EntryKeyText>
        </Space>,
      ]);
      statusEntries.push([
        <TechEntryKey>Engine</TechEntryKey>,
        <EntryValueText>engine1</EntryValueText>,
      ]);
      statusEntries.push([
        <TechEntryKey>Engine ID</TechEntryKey>,
        <EntryValueText>488200f1-aec4-4188-843e-e0b6de4c5ed1</EntryValueText>,
      ]);
    }
  } else {
    statusEntries.push([
      <EntryKeyText>{'Step ID (or "Event ID"?)'}</EntryKeyText>,
      <EntryValueText>Activity_0309v8x</EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText>Step Name</EntryKeyText>,
      <EntryValueText>Check vacation application</EntryValueText>,
    ]);
    statusEntries.push(['Documentation:', info.element.businessObject?.documentation?.[0]?.text]);
    statusEntries.push([
      <EntryKeyText>Step Type</EntryKeyText>,
      <EntryValueText>User Task</EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText>Previous Step ID</EntryKeyText>,
      <EntryValueText>Check vacation application</EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText>Actual Performer</EntryKeyText>,
      <EntryValueText>Sandra Sample</EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText>Actual Performer Username</EntryKeyText>,
      <EntryValueText>sansam</EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText>Actual Performer ID</EntryKeyText>,
      <EntryValueText>29880751-c190-4f58-b5cb-438754e9f02d</EntryValueText>,
    ]);
  }

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
  statusEntries.push([
    <Collapse
      size="small"
      items={[
        {
          key: '1',
          label: 'Documentation',
          children: <p>{info.element.businessObject?.documentation?.[0]?.text}</p>,
        },
      ]}
    />,
  ]);

  // Activity time calculation
  const { start, end, duration } = getTimeInfo({
    element: info.element,
    instance: info.instance,
    logInfo,
    token,
  });

  const { delays, plan } = getPlanDelays({ elementMetaData: metaData, start, end, duration });

  // Activity time
  // statusEntries.push([
  //   <Space key="started">
  //     <ClockSymbol />
  //     <EntryKeyText strong>Started:</EntryKeyText>
  //     <EntryValueText>{generateDateString(start, true)}</EntryValueText>
  //   </Space>,
  //   <Space key="planned-start">
  //     <ClockSymbol />
  //     <EntryKeyText strong>Planned Start:</EntryKeyText>
  //     <EntryValueText>{generateDateString(plan.start, true) || ''}</EntryValueText>
  //   </Space>,
  //   <Space key="start-delay">
  //     <ClockSymbol />
  //     <EntryKeyText strong>Delay:</EntryKeyText>
  //     <EntryValueText type={delays.start && delays.start >= 1000 ? 'danger' : undefined}>
  //       {generateDurationString(delays.start)}
  //     </EntryValueText>
  //   </Space>,
  // ]);

  // statusEntries.push([
  //   <Space key="duration">
  //     <ClockSymbol />
  //     <EntryKeyText strong>Duration:</EntryKeyText>
  //     <EntryValueText>{generateDurationString(duration)}</EntryValueText>
  //   </Space>,
  //   <Space key="duration-planned">
  //     <ClockSymbol />
  //     <EntryKeyText strong>Planned Duration:</EntryKeyText>
  //     <EntryValueText>{generateDurationString(plan.duration)}</EntryValueText>
  //   </Space>,
  //   <Space key="duration-delay">
  //     <ClockSymbol />
  //     <EntryKeyText strong>Delay:</EntryKeyText>
  //     <EntryValueText type={delays.duration && delays.duration >= 1000 ? 'danger' : undefined}>
  //       {generateDurationString(delays.duration)}
  //     </EntryValueText>
  //   </Space>,
  // ]);

  // statusEntries.push([
  //   <Space key="end">
  //     <ClockSymbol />
  //     <EntryKeyText strong>Ended:</EntryKeyText>
  //     <EntryValueText>{generateDateString(end, true)}</EntryValueText>
  //   </Space>,
  //   <Space key="end-planned">
  //     <ClockSymbol />
  //     <EntryKeyText strong>Planned End:</EntryKeyText>
  //     <EntryValueText>{generateDateString(plan.end, true) || ''}</EntryValueText>
  //   </Space>,
  //   <Space key="end-delay">
  //     <ClockSymbol />
  //     <EntryKeyText strong>Delay:</EntryKeyText>
  //     <EntryValueText type={delays.end && delays.end >= 1000 ? 'danger' : undefined}>
  //       {generateDurationString(delays.end)}
  //     </EntryValueText>
  //   </Space>,
  // ]);

  return (
    <>
      {/* <DisplayTable data={statusEntries} /> */}
      <DataGrid data={statusEntries} />
    </>
  );
}
