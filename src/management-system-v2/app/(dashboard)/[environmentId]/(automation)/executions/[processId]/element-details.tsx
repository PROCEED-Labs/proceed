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
  getElementById,
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
  }, [processId, version, element]);

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
        <Space>
          {responsibleParty.map((e) =>
            !e.isGuest ? (
              <Tag key={'instance-processmanager-val' + e.id} color={'purple'}>
                {e.firstName + ' ' + e.lastName}
              </Tag>
            ) : undefined,
          )}
        </Space>
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
        <Tag color={'purple'}>{typeof initiator === 'object' ? initiator.fullName : initiator}</Tag>
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
    // GENERAL
    detailsEntries.push([
      <EntryKeyText key="event-heading-general" style={{ fontWeight: '600', fontSize: '.9em' }}>
        GENERAL
      </EntryKeyText>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="event-stepname-key">Name</EntryKeyText>,
      <EntryValueText key="event-stepname-val">{element.businessObject?.name}</EntryValueText>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="event-steptype-key">Type</EntryKeyText>,
      <EntryValueText key="event-steptype-val">{element.type.split(':')[1]}</EntryValueText>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="event-docu-key">Description</EntryKeyText>,
      <div key="event-docu-val">
        {element.businessObject?.documentation?.[0].text ? (
          <TextViewer initialValue={element.businessObject?.documentation?.[0]?.text} />
        ) : (
          <EntryText />
        )}
      </div>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="event-prevstepid-key">Comes after</EntryKeyText>,
      <EntryValueText key="event-prevstepid-val">
        {element.businessObject.incoming && (
          <Space>
            {element.businessObject.incoming.map((e: any) => (
              <Tag color={'geekblue'} key={'previousStep' + e.sourceRef.$type}>
                {e.sourceRef.$type.split(':')[1]}
              </Tag>
            ))}
          </Space>
        )}
      </EntryValueText>,
    ]);
    if (techDetails) {
      detailsEntries.push([
        <TechEntryKey key="event-stepid-key">{'Step ID'}</TechEntryKey>,
        <EntryValueText key="event-stepid-val">
          <Tag color={'geekblue'}>{element.id}</Tag>
        </EntryValueText>,
      ]);
      detailsEntries.push([
        <TechEntryKey key="event-prevstepid-key">{'Previous step ID'}</TechEntryKey>,
        <EntryValueText key="event-prevstepid-val">
          {element.businessObject.incoming && (
            <Space>
              {element.businessObject.incoming.map((e: any) => (
                <Tag color={'geekblue'} key={'previousStep' + e.sourceRef.id}>
                  {e.sourceRef.id}
                </Tag>
              ))}
            </Space>
          )}
        </EntryValueText>,
      ]);
    }

    // PEOPLE
    detailsEntries.push([
      <Space
        key="event-heading-people"
        orientation="vertical"
        style={{ width: '100%', padding: 0, margin: 0 }}
      >
        <Divider style={{ padding: 0, margin: 0 }} />
        <EntryKeyText style={{ fontWeight: '600', fontSize: '.9em' }}>PEOPLE</EntryKeyText>
      </Space>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="event-actualperformer-key">Assigned to</EntryKeyText>,
      <EntryValueText key="event-actualperformer-val">
        {!!logInfo?.performers?.user?.length && (
          <Space>
            {logInfo?.performers?.user?.map((e) =>
              !e.isGuest ? (
                <Tag color={'purple'} key={e.id + 'assigned'}>
                  {e.fullName}
                </Tag>
              ) : undefined,
            )}
          </Space>
        )}
      </EntryValueText>,
    ]);

    detailsEntries.push([
      <EntryKeyText key="event-actualperformer-key">Done Bye</EntryKeyText>,
      <EntryValueText key="event-actualperformer-val">
        {logInfo?.actualOwner?.map((e) => (
          <Tag color={'purple'} key={e.id + 'doneby'}>
            {e.fullName}
          </Tag>
        ))}
      </EntryValueText>,
    ]);

    if (techDetails) {
      detailsEntries.push([
        <TechEntryKey key="event-actualperformername-key">Username</TechEntryKey>,
        <EntryValueText key="event-actualperformername-val">
          {logInfo?.actualOwner?.map((e) => e.username).toString()}
        </EntryValueText>,
      ]);
      detailsEntries.push([
        <TechEntryKey key="event-actualperformername-key">User ID</TechEntryKey>,
        <EntryValueText key="event-actualperformername-val">
          {logInfo?.actualOwner?.map((e) => e.id).toString()}
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
        key="event-heading-timing"
        orientation="vertical"
        style={{ width: '100%', padding: 0, margin: 0 }}
      >
        <Divider style={{ padding: 0, margin: 0 }} />
        <EntryKeyText style={{ fontWeight: '600', fontSize: '.9em' }}>TIMING</EntryKeyText>
      </Space>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="event-plannedduration-key">Planned duration</EntryKeyText>,
      <EntryValueText key="event-plannedduration-val">
        {plannedDuration && generateDurationString(plannedDuration)}
      </EntryValueText>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="event-starttime-key">Start time</EntryKeyText>,
      <EntryValueText key="event-starttime-val">
        {start && generateDateString(start, true)}
      </EntryValueText>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="event-endtime-key">End time</EntryKeyText>,
      <EntryValueText key="event-endtime-val">
        {end && generateDateString(end, true)}
      </EntryValueText>,
    ]);
    detailsEntries.push([
      <EntryKeyText key="event-duration-key">Time so far</EntryKeyText>,
      <EntryValueText key="event-duration-val">
        {duration && generateDurationString(duration)}
      </EntryValueText>,
    ]);

    // OTHER
    detailsEntries.push([
      <Space
        key="event-heading-other"
        orientation="vertical"
        style={{ width: '100%', padding: 0, margin: 0 }}
      >
        <Divider style={{ padding: 0, margin: 0 }} />
        <EntryKeyText style={{ fontWeight: '600', fontSize: '.9em' }}>OTHER</EntryKeyText>
      </Space>,
    ]);
  }

  // Is External
  if (!isRootElement) {
    detailsEntries.push([
      <EntryKeyText key="external-key">Runs outside this system</EntryKeyText>,
      <Checkbox
        key="external-val"
        disabled
        value={element.businessObject && element.businessObject.external}
      />,
    ]);
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
      <EntryValueText key="hkj">
        <Tag color={'geekblue'}>{priority}</Tag>
      </EntryValueText>,
    ]);
  }

  return (
    <>
      {/* <DisplayTable data={detailsEntries} /> */}
      <DataGrid data={detailsEntries} />
    </>
  );
}
