import { ReactNode, useEffect, useState } from 'react';
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
import { getPlanDelays, getTiming, statusToType } from './instance-helpers';
import {
  getDefinitionsInfos,
  getDefinitionsVersionInformation,
  getMetaDataFromElement,
  toBpmnObject,
} from '@proceed/bpmn-helper';
import { DataGrid, DisplayTable } from './instance-info-panel';
import endpointBuilder from '@/lib/engines/endpoints/endpoint-builder';
import { generateDateString, generateDurationString, generateNumberString } from '@/lib/utils';
import type { ElementLike } from 'diagram-js/lib/core/Types';
import { ExtendedInstanceInfo } from '@/lib/data/instance';
import styles from './element-status.module.scss';
import { InstanceSelector } from './instance-selector';
import TextViewer from '@/components/text-viewer';
import { EntryText } from './entry-text';
import { getProcess } from '@/lib/data/db/process';
import { DefinitionsInfos } from '@proceed/bpmn-helper/src/getters';

type EntryTextProps = React.ComponentProps<typeof Typography.Text>;
const EntryKeyText = (props: EntryTextProps) => (
  <EntryText className={styles.ElementText + ' ' + styles.ElementKeyText} {...props} />
);
const EntryValueText = (props: EntryTextProps) => {
  return <EntryText className={styles.ElementText + ' ' + styles.ElementValueText} {...props} />;
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

export function ElementStatus({
  processId,
  element,
  version,
  instance,
}: {
  processId: string;
  element: ElementLike;
  version: { bpmn: string };
  instance?: ExtendedInstanceInfo;
}) {
  const [techDetails, setTechDetails] = useState(false);
  const [definitionsInfos, setDefinitionsInfos] = useState<DefinitionsInfos>();
  const [definitionsVersionInfos, setDefinitionsVersionInfos] = useState<{
    versionId?: string | undefined;
    name?: string | undefined;
    description?: string | undefined;
    versionBasedOn?: string | undefined;
    versionCreatedOn?: string | undefined;
  }>();
  const statusEntries: ReactNode[][] = [];

  const isRootElement = element && element.type === 'bpmn:Process';
  const metaData = getMetaDataFromElement(element.businessObject);
  const token = instance?.tokens.find((l) => l.currentFlowElementId == element.id);
  const logInfo = instance?.log.find((logEntry) => logEntry.flowElementId === element.id);

  useEffect(() => {
    async function getBpmnObject() {
      const bpmnObj = await toBpmnObject(version.bpmn);
      const defInfos = await getDefinitionsInfos(bpmnObj);
      const defVersionInfos = await getDefinitionsVersionInformation(bpmnObj);
      setDefinitionsInfos(defInfos);
      setDefinitionsVersionInfos(defVersionInfos);
    }
    getBpmnObject();
  }, [version]);

  console.log(metaData)

  // TECH DETAILS SWITCH
  statusEntries.push([
    <TechDetailsSwitch
      key="instance-techdetails-switch"
      techDetails={techDetails}
      setTechDetailsCb={setTechDetails}
    />,
  ]);
  // INSTANCE DATA
  if (isRootElement) {
    // GENERAL
    statusEntries.push([
      <EntryKeyText key="instance-heading-general" style={{ fontWeight: '600', fontSize: '.9em' }}>
        GENERAL
      </EntryKeyText>,
    ]);
    statusEntries.push([
      <EntryKeyText key="instance-name-key">Name</EntryKeyText>,
      <EntryValueText key="instance-name-value">{definitionsInfos?.name}</EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText key="instance-shortname-key">Short Name</EntryKeyText>,
      <EntryValueText key="instance-shortname-val">
        {definitionsInfos?.userDefinedId}
      </EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText key="instance-documentation-key">Documentation</EntryKeyText>,

      <div
        key="instance-documentation-val"
        style={{
          padding: 10,
          backgroundColor: 'hsla(0, 0%, 50%, 0.05)',
          // border: '1px solid #77777733',
          borderRadius: 10,
        }}
      >
        <TextViewer initialValue={element.businessObject?.documentation?.[0]?.text} />
      </div>,
    ]);
    statusEntries.push([
      <EntryKeyText key="instance-processmanager-key">Process Mangager</EntryKeyText>,
      <EntryValueText key="instance-processmanager-val">TODO</EntryValueText>,
    ]);
    if (techDetails)
      statusEntries.push([
        <TechEntryKey key="instance-id-key">ID</TechEntryKey>,
        <EntryValueText key="instance-id-val">{processId}</EntryValueText>,
      ]);

    // VERSION DATA
    statusEntries.push([
      <Space
        key="instance-heading-version"
        orientation="vertical"
        style={{ width: '100%', padding: 0, margin: 0 }}
      >
        <Divider style={{ padding: 0, margin: 0 }} />
        <EntryKeyText style={{ fontWeight: '600', fontSize: '.9em' }}>VERSION</EntryKeyText>
      </Space>,
    ]);
    statusEntries.push([
      <EntryKeyText key="instance-versionname-key">Version Name</EntryKeyText>,
      <EntryValueText key="instance-versionname-val">
        {definitionsVersionInfos?.name}
      </EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText key="instance-versiondesc-key">What changed</EntryKeyText>,
      <EntryValueText key="instance-versiondesc-val">
        {definitionsVersionInfos?.description}
      </EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText key="instance-createdon-key">Created on</EntryKeyText>,
      <EntryValueText key="instance-createdon-val">
        {definitionsVersionInfos?.versionCreatedOn}
      </EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText key="instance-basedon-key">Based on</EntryKeyText>,
      <EntryValueText key="instance-basedon-val">TODO</EntryValueText>,
    ]);
    if (techDetails)
      statusEntries.push([
        <TechEntryKey key="instance-basedonid-key">Based on ID</TechEntryKey>,
        <EntryValueText key="instance-basedonid-val">
          {definitionsVersionInfos?.versionBasedOn}
        </EntryValueText>,
      ]);

    // INITIATOR
    statusEntries.push([
      <Space
        key="instance-initiator"
        orientation="vertical"
        style={{ width: '100%', padding: 0, margin: 0 }}
      >
        <Divider style={{ padding: 0, margin: 0 }} />
        <EntryKeyText style={{ fontWeight: '600', fontSize: '.9em' }}>WHO STARTED IT</EntryKeyText>
      </Space>,
    ]);
    const initiator = instance?.processInitiator;
    if (typeof initiator === 'object') {
      statusEntries.push([
        <EntryKeyText key="instance-startedby-key">Started by</EntryKeyText>,
        <EntryValueText key="instance-startedby-val">{initiator.fullName}</EntryValueText>,
      ]);
      if (techDetails)
        statusEntries.push([
          <TechEntryKey key="instance-startusername-key">Username</TechEntryKey>,
          <EntryValueText key="instance-startusername-val">{initiator.username}</EntryValueText>,
        ]);
      if (techDetails)
        statusEntries.push([
          <TechEntryKey key="instance-startuserid-key">User ID</TechEntryKey>,
          <EntryValueText key="instance-startuserid-val">{initiator.id}</EntryValueText>,
        ]);
      statusEntries.push([
        <EntryKeyText key="instance-startuser-space-key">Workspace</EntryKeyText>,
        <EntryValueText key="instance-startuser-space-val">
          {instance?.spaceOfProcessInitiator?.name}
        </EntryValueText>,
      ]);
      if (techDetails)
        statusEntries.push([
          <TechEntryKey key="instance-startuser-spaceid-key">Workspace ID</TechEntryKey>,
          <EntryValueText key="instance-startuser-spaceid-val">
            {instance?.spaceOfProcessInitiator?.id}
          </EntryValueText>,
        ]);
    }

    // TIMING
    statusEntries.push([
      <Space
        key="instance-heading-timing"
        orientation="vertical"
        style={{ width: '100%', padding: 0, margin: 0 }}
      >
        <Divider style={{ padding: 0, margin: 0 }} />
        <EntryKeyText style={{ fontWeight: '600', fontSize: '.9em' }}>TIMING</EntryKeyText>
      </Space>,
    ]);
    if (techDetails)
      statusEntries.push([
        <TechEntryKey key="instance-runid-key">Run ID</TechEntryKey>,
        <EntryValueText key="instance-runid-val">{instance?.processInstanceId}</EntryValueText>,
      ]);
      
    const start = instance?.timing?.actual.start;
    const end = instance?.timing?.actual.end;
    const duration = instance?.timing?.actual.duration;
    const { delays, plan } = getPlanDelays({ elementMetaData: metaData, start, end, duration });
    statusEntries.push([
      <EntryKeyText key="instance-plannedduration-key">Planned duration</EntryKeyText>,
      <EntryValueText key="instance-plannedduration-val">
        {generateDurationString(plan.duration)}
        </EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText key="instance-starttime-key">Start Time</EntryKeyText>,
      <EntryValueText key="instance-starttime-val">
        {start && new Date(start).toISOString()}
      </EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText key="instance-endtime-key">End Time</EntryKeyText>,
      <EntryValueText key="instance-endtime-val">
        {end && new Date(end).toISOString()}
      </EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText key="instance-duration-key">Time so far</EntryKeyText>,
      <EntryValueText key="instance-duration-val">
        {generateDurationString(duration)}
      </EntryValueText>,
    ]);

    // ENGINE

    if (techDetails) {
      statusEntries.push([
        <Space
          key="instance-heading-engine"
          orientation="vertical"
          style={{ width: '100%', padding: 0, margin: 0 }}
        >
          <Divider style={{ padding: 0, margin: 0 }} />
          <EntryKeyText style={{ fontWeight: '600', fontSize: '.9em' }}>WHERE IT RUNS</EntryKeyText>
        </Space>,
      ]);
      statusEntries.push([
        <TechEntryKey key="instance-engine-key">Engine</TechEntryKey>,
        <EntryValueText key="instance-engine-val">engine1</EntryValueText>,
      ]);
      statusEntries.push([
        <TechEntryKey key="instance-engineid-key">Engine ID</TechEntryKey>,
        <EntryValueText key="instance-engineid-val">
          488200f1-aec4-4188-843e-e0b6de4c5ed1
        </EntryValueText>,
      ]);
    }
    // EVENT DATA
  } else {
    statusEntries.push([
      <EntryKeyText key="event-stepid-key">{'Step ID (or "Event ID"?)'}</EntryKeyText>,
      <EntryValueText key="event-stepid-val">Activity_0309v8x</EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText key="event-stepname-key">Step Name</EntryKeyText>,
      <EntryValueText key="event-stepname-val">Check vacation application</EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText key="event-docu-key">Documentation</EntryKeyText>,
      <div
        key="event-docu-val"
        style={{
          padding: 10,
          backgroundColor: '#66666605',
          border: '1px solid #0001',
          borderRadius: 10,
        }}
      >
        <TextViewer initialValue={element.businessObject?.documentation?.[0]?.text} />
      </div>,
    ]);

    statusEntries.push([
      <EntryKeyText key="event-steptype-key">Step Type</EntryKeyText>,
      <EntryValueText key="event-steptype-val">User Task</EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText key="event-prevstepid-key">Previous Step ID</EntryKeyText>,
      <EntryValueText key="event-prevstepid-val">Check vacation application</EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText key="event-actualperformer-key">Actual Performer</EntryKeyText>,
      <EntryValueText key="event-actualperformer-val">Sandra Sample</EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText key="event-actualperformername-key">Actual Performer Username</EntryKeyText>,
      <EntryValueText key="event-actualperformername-val">sansam</EntryValueText>,
    ]);
    statusEntries.push([
      <EntryKeyText key="event-actualperformername-key">Actual Performer ID</EntryKeyText>,
      <EntryValueText key="event-actualperformername-val">
        29880751-c190-4f58-b5cb-438754e9f02d
      </EntryValueText>,
    ]);
  }

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

  // Is External
  if (!isRootElement) {
    statusEntries.push([
      <EntryKeyText key="external-key">External:</EntryKeyText>,
      <Checkbox
        key="external-val"
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
        <EntryKeyText key="progres-key">Progress</EntryKeyText>,
        <Progress key="progress-val" percent={progress.value} status={progressStatus} />,
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

    statusEntries.push([
      <EntryKeyText key="prio">Priority</EntryKeyText>,
      <EntryValueText key="hkj">{priority}</EntryValueText>,
    ]);
  }

  // Activity time calculation
  const timing = getTiming({
    isRootElement,
    metaData,
    token,
    logInfo,
    instance,
  });

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
