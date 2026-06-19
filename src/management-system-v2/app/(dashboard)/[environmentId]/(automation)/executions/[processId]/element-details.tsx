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
import { getTiming, statusToType } from './instance-helpers';
import {
  getDefinitionsInfos,
  getDefinitionsVersionInformation,
  getMetaDataFromElement,
  toBpmnObject,
} from '@proceed/bpmn-helper';
import { DataGrid } from './instance-info-panel';
import { generateDateString, generateDurationString } from '@/lib/utils';
import type { ElementLike } from 'diagram-js/lib/core/Types';
import { ExtendedInstanceInfo } from '@/lib/data/instance';
import styles from './element-details.module.scss';
import { EntryText } from './entry-text';
import { DefinitionsInfos } from '@proceed/bpmn-helper/src/getters';
import { getProcessVersion } from '@/lib/data/processes';
import dynamic from 'next/dynamic';
import { getUserById } from '@/lib/data/users';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';
import { User } from '@/lib/data/user-schema';
const TextViewer = dynamic(() => import('@/components/text-viewer'), { ssr: false });

type PreviousVersion =
  | {
      name: string;
      id: string;
      createdOn: Date;
      description: string;
      processId: string;
      versionBasedOn: string | null;
      bpmnFilePath: string;
    }
  | null
  | undefined;

type VersionInfo = {
  versionId?: string | undefined;
  name?: string | undefined;
  description?: string | undefined;
  versionBasedOn?: string | undefined;
  versionCreatedOn?: string | undefined;
};

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

export function ElementDetails({
  processId,
  element,
  version,
  instance,
}: {
  processId: string;
  element: ElementLike;
  version: { bpmn: string };
  instance?: {
    engines: {
      id: string;
      online: boolean;
    }[];
  } & ExtendedInstanceInfo;
}) {
  const [techDetails, setTechDetails] = useState(false);
  const [definitionsInfos, setDefinitionsInfos] = useState<DefinitionsInfos>();
  const [definitionsVersionInfos, setDefinitionsVersionInfos] = useState<VersionInfo>();
  const [previousVersion, setPreviousVersion] = useState<PreviousVersion>(undefined);
  const [responsibleParty, setResponsibleParty] = useState<User[]>([]);
  const detailsEntries: ReactNode[][] = [];

  const isRootElement = element && element.type === 'bpmn:Process';
  const metaData = getMetaDataFromElement(element.businessObject);
  const token = instance?.tokens.find((l) => l.currentFlowElementId == element.id);
  const logInfo = instance?.log.find((logEntry) => logEntry.flowElementId === element.id);

  useEffect(() => {
    // using version because it contains the parent object containing some more metadata
    async function getBpmnObject() {
      const bpmnObj = await toBpmnObject(version.bpmn);
      const defInfos = await getDefinitionsInfos(bpmnObj);
      const defVersionInfos = await getDefinitionsVersionInformation(bpmnObj);
      const previous = await getProcessVersion(processId, defVersionInfos.versionBasedOn);
      // maybe to be used in the future
      // const responsible = getElementsByTagName(bpmnObj, 'proceed:ResponsibleParty');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(version.bpmn, 'text/xml');
      const responsibleIds = JSON.parse(
        xmlDoc.getElementsByTagName('proceed:responsibleParty')[0].childNodes[1].childNodes[1]
          .textContent || '',
      );
      const responsible = await asyncMap(
        responsibleIds.user,
        async (resId: string) => await getUserById(resId),
      );

      setDefinitionsInfos(defInfos);
      setDefinitionsVersionInfos(defVersionInfos);
      setPreviousVersion(previous);
      setResponsibleParty(responsible);
    }
    getBpmnObject();
  }, [processId, version]);

  // TECH DETAILS SWITCH
  detailsEntries.push([
    <TechDetailsSwitch
      key="instance-techdetails-switch"
      techDetails={techDetails}
      setTechDetailsCb={setTechDetails}
    />,
  ]);
  // INSTANCE DATA
  if (isRootElement) {
    // GENERAL
    detailsEntries.push([
      <EntryKeyText key="instance-heading-general" style={{ fontWeight: '600', fontSize: '.9em' }}>
        GENERAL
      </EntryKeyText>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="instance-name-key">Name</EntryKeyText>,
      <EntryValueText key="instance-name-value">{definitionsInfos?.name}</EntryValueText>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="instance-shortname-key">Short Name</EntryKeyText>,
      <EntryValueText key="instance-shortname-val">
        {definitionsInfos?.userDefinedId}
      </EntryValueText>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="instance-documentation-key">Documentation</EntryKeyText>,

      <div key="instance-documentation-val">
        <TextViewer initialValue={element.businessObject?.documentation?.[0]?.text} />
      </div>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="instance-processmanager-key">Process Mangager</EntryKeyText>,
      <EntryValueText key="instance-processmanager-val">
        {responsibleParty.map((e) => (!e.isGuest ? e.firstName + ' ' + e.lastName : ''))}
      </EntryValueText>,
    ]);
    if (techDetails)
      detailsEntries.push([
        <TechEntryKey key="instance-id-key">ID</TechEntryKey>,
        <EntryValueText key="instance-id-val">{processId}</EntryValueText>,
      ]);

    // VERSION DATA
    detailsEntries.push([
      <Space
        key="instance-heading-version"
        orientation="vertical"
        style={{ width: '100%', padding: 0, margin: 0 }}
      >
        <Divider style={{ padding: 0, margin: 0 }} />
        <EntryKeyText style={{ fontWeight: '600', fontSize: '.9em' }}>VERSION</EntryKeyText>
      </Space>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="instance-versionname-key">Version Name</EntryKeyText>,
      <EntryValueText key="instance-versionname-val">
        {definitionsVersionInfos?.name}
      </EntryValueText>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="instance-versiondesc-key">What changed</EntryKeyText>,
      <EntryValueText key="instance-versiondesc-val">
        {definitionsVersionInfos?.description}
      </EntryValueText>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="instance-createdon-key">Created on</EntryKeyText>,
      <EntryValueText key="instance-createdon-val">
        {definitionsVersionInfos?.versionCreatedOn}
      </EntryValueText>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="instance-basedon-key">Based on</EntryKeyText>,
      <EntryValueText key="instance-basedon-val">{previousVersion?.name}</EntryValueText>,
    ]);
    if (techDetails)
      detailsEntries.push([
        <TechEntryKey key="instance-basedonid-key">Based on ID</TechEntryKey>,
        <EntryValueText key="instance-basedonid-val">
          {definitionsVersionInfos?.versionBasedOn}
        </EntryValueText>,
      ]);

    // INITIATOR
    detailsEntries.push([
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
    detailsEntries.push([
      <EntryKeyText key="instance-startedby-key">Started by</EntryKeyText>,
      <EntryValueText key="instance-startedby-val">
        {typeof initiator === 'object' ? initiator.fullName : initiator}
      </EntryValueText>,
    ]);
    if (typeof initiator === 'object') {
      if (techDetails)
        detailsEntries.push([
          <TechEntryKey key="instance-startusername-key">Username</TechEntryKey>,
          <EntryValueText key="instance-startusername-val">{initiator.username}</EntryValueText>,
        ]);
      if (techDetails)
        detailsEntries.push([
          <TechEntryKey key="instance-startuserid-key">User ID</TechEntryKey>,
          <EntryValueText key="instance-startuserid-val">{initiator.id}</EntryValueText>,
        ]);
      detailsEntries.push([
        <EntryKeyText key="instance-startuser-space-key">Workspace</EntryKeyText>,
        <EntryValueText key="instance-startuser-space-val">
          {instance?.spaceOfProcessInitiator?.name}
        </EntryValueText>,
      ]);
      if (techDetails)
        detailsEntries.push([
          <TechEntryKey key="instance-startuser-spaceid-key">Workspace ID</TechEntryKey>,
          <EntryValueText key="instance-startuser-spaceid-val">
            {instance?.spaceOfProcessInitiator?.id}
          </EntryValueText>,
        ]);
    }

    // TIMING
    const {
      actual: { start, end, duration },
      plan: { duration: plannedDuration },
    } = getTiming({
      isRootElement,
      metaData,
      token,
      logInfo,
      instance,
    });

    detailsEntries.push([
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
      detailsEntries.push([
        <TechEntryKey key="instance-runid-key">Run ID</TechEntryKey>,
        <EntryValueText key="instance-runid-val">{instance?.processInstanceId}</EntryValueText>,
      ]);
    detailsEntries.push([
      <EntryKeyText key="instance-plannedduration-key">Planned duration</EntryKeyText>,
      <EntryValueText key="instance-plannedduration-val">
        {generateDurationString(plannedDuration)}
      </EntryValueText>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="instance-starttime-key">Start Time</EntryKeyText>,
      <EntryValueText key="instance-starttime-val">
        {start && generateDateString(start, true)}
      </EntryValueText>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="instance-endtime-key">End Time</EntryKeyText>,
      <EntryValueText key="instance-endtime-val">
        {end && generateDateString(end, true)}
      </EntryValueText>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="instance-duration-key">Time so far</EntryKeyText>,
      <EntryValueText key="instance-duration-val">
        {generateDurationString(duration)}
      </EntryValueText>,
    ]);

    // ENGINE

    if (techDetails) {
      detailsEntries.push([
        <Space
          key="instance-heading-engine"
          orientation="vertical"
          style={{ width: '100%', padding: 0, margin: 0 }}
        >
          <Divider style={{ padding: 0, margin: 0 }} />
          <EntryKeyText style={{ fontWeight: '600', fontSize: '.9em' }}>WHERE IT RUNS</EntryKeyText>
        </Space>,
      ]);
      detailsEntries.push([
        <TechEntryKey key="instance-engine-key">Engine</TechEntryKey>,
        // TODO:
        <EntryValueText key="instance-engine-val"></EntryValueText>,
      ]);
      detailsEntries.push([
        <TechEntryKey key="instance-engineid-key">Engine ID</TechEntryKey>,
        <EntryValueText key="instance-engineid-val">
          {instance?.engines.map((e: any) => e.id)}
        </EntryValueText>,
      ]);
    }
    // EVENT DATA
  } else {
    detailsEntries.push([
      <EntryKeyText key="event-stepid-key">{'Step ID (or "Event ID"?)'}</EntryKeyText>,
      <EntryValueText key="event-stepid-val">Activity_0309v8x</EntryValueText>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="event-stepname-key">Step Name</EntryKeyText>,
      <EntryValueText key="event-stepname-val">Check vacation application</EntryValueText>,
    ]);
    detailsEntries.push([
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

    detailsEntries.push([
      <EntryKeyText key="event-steptype-key">Step Type</EntryKeyText>,
      <EntryValueText key="event-steptype-val">User Task</EntryValueText>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="event-prevstepid-key">Previous Step ID</EntryKeyText>,
      <EntryValueText key="event-prevstepid-val">Check vacation application</EntryValueText>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="event-actualperformer-key">Actual Performer</EntryKeyText>,
      <EntryValueText key="event-actualperformer-val">Sandra Sample</EntryValueText>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="event-actualperformername-key">Actual Performer Username</EntryKeyText>,
      <EntryValueText key="event-actualperformername-val">sansam</EntryValueText>,
    ]);
    detailsEntries.push([
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
    detailsEntries.push([
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

      detailsEntries.push([
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

    detailsEntries.push([
      <EntryKeyText key="prio">Priority</EntryKeyText>,
      <EntryValueText key="hkj">{priority}</EntryValueText>,
    ]);
  }

  return (
    <>
      {/* <DisplayTable data={detailsEntries} /> */}
      <DataGrid data={detailsEntries} />
    </>
  );
}
