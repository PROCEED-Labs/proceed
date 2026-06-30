import { ReactNode, useEffect, useState } from 'react';
import {
  Col,
  Divider,
  Image,
  message,
  Progress,
  ProgressProps,
  Row,
  Space,
  Typography,
} from 'antd';
import {
  getDefinitionsInfos,
  getDefinitionsVersionInformation,
  getMetaDataFromElement,
  toBpmnObject,
} from '@proceed/bpmn-helper';
import { getTiming, statusToType } from './instance-helpers';
import { generateDateString, generateDurationString, generateNumberString } from '@/lib/utils';
import styles from './element-overview.module.scss';
import { EntryText } from './entry-text';
import { ElementLike } from 'diagram-js/lib/model/Types';
import { ExtendedInstanceInfo } from '@/lib/data/instance';
import { DataGrid } from './instance-info-panel';
import { DefinitionsInfos } from '@proceed/bpmn-helper/src/getters';
import dynamic from 'next/dynamic';
import { fallbackImage } from '@/components/image-upload';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';
import { useFileManager } from '@/lib/useFileManager';
const TextViewer = dynamic(() => import('@/components/text-viewer'), { ssr: false });

export function ElementOverview({
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
  const [definitionsInfos, setDefinitionsInfos] = useState<DefinitionsInfos>();

  const [fileUrl, setFileUrl] = useState<string | undefined>();
  const { download } = useFileManager({
    entityType: EntityType.PROCESS,
    errorToasts: true,
    dontUpdateProcessArtifactsReferences: true,
  });

  useEffect(() => {
    async function getBpmnObject() {
      const bpmnObj = await toBpmnObject(version.bpmn);
      const defInfos = await getDefinitionsInfos(bpmnObj);
      setDefinitionsInfos(defInfos);
    }
    async function downloadFile() {
      // "loading" state
      setFileUrl(undefined);
      const metaData = getMetaDataFromElement(element.businessObject);
      const fileName = metaData.overviewImage;

      if (fileName === undefined) {
        return;
      }

      if (fileName.startsWith('public/')) {
        setFileUrl(fileName.replace('public/', '/'));
        return;
      }

      try {
        const result = await download({
          entityId: processId,
          filePath: fileName,
        });
        if (!result.fileUrl) throw new Error('Response does not contain fileUrl');

        setFileUrl(result.fileUrl);
      } catch (error) {
        console.error('Download failed:', error);
        message.error('Failed to download image.');
      }
    }

    downloadFile();
    getBpmnObject();
  }, [processId, version, element, download]);

  const overviewEntries: ReactNode[][] = [];
  const metaData = getMetaDataFromElement(element.businessObject);
  const isRootElement = element && element.type === 'bpmn:Process';
  const token = instance?.tokens.find((l) => l.currentFlowElementId == element.id);
  const logInfo = instance?.log.find((logEntry) => logEntry.flowElementId === element.id);
  const initiator = instance?.processInstanceInitiator;

  // Element image
  if (metaData.overviewImage) {
    overviewEntries.push([
      <div
        key="image"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          margin: 'auto',
          marginTop: '1rem',
        }}
      >
        <Image
          src={fileUrl || fallbackImage}
          fallback={fallbackImage}
          alt="Image"
          width={'100%'}
          height={'10rem'}
          style={{
            borderRadius: '6px',
            border: '1px solid #d9d9d9',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
          styles={{
            cover: {
              borderRadius: '6px',
              border: '1px solid #d9d9d9',
            },
          }}
        />
      </div>,
    ]);
  } else {
    overviewEntries.push([
      <div
        key="image"
        style={{
          width: '100%',
          height: '10rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          margin: 'auto',
          marginTop: '1rem',
          color: '#aaa',
          fontWeight: 'bold',
          fontSize: '0.8em',
          background:
            'repeating-linear-gradient(45deg, #f0f0f0, #f0f0f0 10px, #fafafa 0px, #fafafa 20px)',
          borderRadius: '6px',
          border: '1px solid #d9d9d9',
        }}
      >
        <span style={{ backgroundColor: 'white', padding: '2px 10px' }}>Process/Step image</span>
      </div>,
    ]);
  }

  if (isRootElement) {
    // Name and Shortname
    overviewEntries.push([
      <div key="instance-names" style={{ margin: 0, padding: 0 }}>
        <Typography.Title level={4} style={{ fontWeight: 'bold', margin: 0 }}>
          {definitionsInfos?.name}
        </Typography.Title>
        <EntryText
          style={{ fontWeight: '600', color: '#aaa', margin: 0 }}
          missingTextOverride="No Short Name Available"
        >
          {definitionsInfos?.userDefinedId}
        </EntryText>
      </div>,
    ]);

    // description
    overviewEntries.push([
      <div key="instance-description" style={{ fontSize: '.95em', color: '#777' }}>
        <TextViewer initialValue={element.businessObject?.documentation?.[0]?.text} />
      </div>,
    ]);
  } else {
    // Name and Shortname
    overviewEntries.push([
      <div key="instance-names" style={{ margin: 0, padding: 0 }}>
        <EntryText style={{ fontWeight: '600', color: '#aaa', margin: 0 }}>
          {definitionsInfos?.name}
        </EntryText>
        <Typography.Title level={4} style={{ fontWeight: 'bold', margin: 0 }}>
          {definitionsInfos?.userDefinedId}
        </Typography.Title>
      </div>,
    ]);

    // description
    overviewEntries.push([
      <div key="instance-description" style={{ fontSize: '.95em', color: '#777' }}>
        <TextViewer initialValue={element.businessObject?.documentation?.[0]?.text} />
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

        overviewEntries.push([
          <Progress key="progress-val" percent={progress.value} status={progressStatus} />,
        ]);
      }
    }
  }
  // time info
  const {
    actual: { start: startDate, duration },
    plan: { duration: plannedDuration },
  } = getTiming({
    isRootElement,
    metaData,
    token,
    logInfo,
    instance,
  });
  // Timing
  overviewEntries.push([
    <div
      style={{
        border: '1.5px solid #ddd',
        borderRadius: 12,
        overflow: 'hidden',
      }}
      key="instance-timing"
    >
      <div className={styles.GridContainer}>
        <div className={styles.GridCell}>
          <EntryText>Started</EntryText>
          <br />
          <EntryText>{generateDateString(startDate, true)}</EntryText>
        </div>

        <div className={styles.GridCell}>
          <EntryText>Running for</EntryText>
          <br />
          <EntryText>{generateDurationString(duration)}</EntryText>
        </div>

        <div className={styles.GridCell}>
          <EntryText>Planned</EntryText>
          <br />
          <EntryText>{generateDurationString(plannedDuration)}</EntryText>
        </div>

        <div className={styles.GridCell}>
          <EntryText>Started by</EntryText>
          <br />
          <EntryText>{typeof initiator === 'object' ? initiator.fullName : initiator}</EntryText>
        </div>
      </div>
    </div>,
  ]);

  // Budget
  overviewEntries.push([
    <EntryText
      key="instance-budgettitle"
      style={{ fontWeight: '600', fontSize: '.9em', color: 'gray' }}
    >
      BUDGET
    </EntryText>,
  ]);

  const costsPlanned = metaData.costsPlanned
    ? generateNumberString(metaData.costsPlanned.value, {
        style: 'currency',
        currency: metaData.costsPlanned.unit,
      }) || metaData.costsPlanned.value + ' ' + metaData.costsPlanned.unit
    : undefined;
  overviewEntries.push([
    <Space
      key="instance-budget"
      orientation="vertical"
      style={{
        width: '100%',
        padding: 12,
        border: 'solid',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#ddd',
        backgroundColor: '#eee',
      }}
    >
      <Row style={{ margin: 0 }}>
        <Col span={12} className={styles.ListTitle}>
          Planned
        </Col>
        <Col span={12} className={styles.ListValue}>
          <EntryText style={{ fontSize: '.9em' }}>{costsPlanned}</EntryText>
        </Col>
      </Row>
      {/* TODO add calculated */}
      <Divider style={{ margin: 0 }} />
      <Row style={{ margin: 0 }}>
        <Col span={12} className={styles.ListTitle}>
          Actual
        </Col>
        <Col span={12} className={styles.ListValue}>
          {/* TODO: add override */}
          <EntryText style={{ fontWeight: 1000 }}>{costsPlanned}</EntryText>
          {/* <Typography.Text
              style={{
                fontWeight: 1000,
                color: 'rgb(62, 147, 222)',
                marginLeft: 10,
                fontSize: '.8em',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              Override
            </Typography.Text> */}
        </Col>
      </Row>
    </Space>,
  ]);
  // ELEMENTS FOR CALCULATED VALUE
  // <Divider style={{ margin: 0 }} />
  // <Row style={{ margin: 0 }}>
  //   <Col span={12} className={styles.ListTitle}>
  //     Calculated
  //   </Col>
  //   <Col span={12} className={styles.ListValue}>
  //     {/* TODO: */}
  //     <EntryText style={{ fontSize: '.9em' }}>{costsPlanned}</EntryText>
  //   </Col>
  // </Row>

  return <DataGrid data={overviewEntries} />;
}
