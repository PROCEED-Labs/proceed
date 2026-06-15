import { ReactNode, useEffect, useState } from 'react';
import { Col, Divider, Menu, Row, Space, Typography } from 'antd';
import { InstanceSelector } from './instance-selector';
import { getDefinitionsInfos, getMetaDataFromElement, toBpmnObject } from '@proceed/bpmn-helper';
import ImageSelectionSection from '../../../processes/[mode]/[processId]/image-selection-section';
import TextViewer from '@/components/text-viewer';
import { getPlanDelays, getTimeInfo, getTiming } from './instance-helpers';
import { generateDateString, generateDurationString, generateNumberString } from '@/lib/utils';
import styles from './element-overwiew.module.scss';
import { EntryText } from './entry-text';
import { ElementLike } from 'diagram-js/lib/model/Types';
import { ExtendedInstanceInfo } from '@/lib/data/instance';
import { DataGrid } from './instance-info-panel';
import { DefinitionsInfos } from '@proceed/bpmn-helper/src/getters';

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
  useEffect(() => {
    async function getBpmnObject() {
      const bpmnObj = await toBpmnObject(version.bpmn);
      const defInfos = await getDefinitionsInfos(bpmnObj);
      setDefinitionsInfos(defInfos);
    }
    getBpmnObject();
  }, [version]);

  if (!instance) return <InstanceSelector />;

  const overviewEntries: ReactNode[][] = [];
  const metaData = getMetaDataFromElement(element.businessObject);
  const isRootElement = element && element.type === 'bpmn:Process';
  const token = instance?.tokens.find((l) => l.currentFlowElementId == element.id);
  const logInfo = instance?.log.find((logEntry) => logEntry.flowElementId === element.id);

  const initiator = instance?.processInitiator;

  // Element image
  if (metaData.overviewImage) {
    overviewEntries.push([
      <div
        key="image"
        style={{
          // width: '75%',
          height: '7.5rem',
          display: 'flex',
          justifyContent: 'center',
          margin: 'auto',
          marginTop: '1rem',
          // overflow: 'hidden',
        }}
      >
        {/** TODO: correct image url */}
        <ImageSelectionSection
          imageFilePath={metaData.overviewImage}
          onImageUpdate={() => {}}
          disabled={true}
        />
      </div>,
    ]);
  } else {
    overviewEntries.push([
      <div
        key="image"
        style={{
          width: '75%',
          height: '7.5rem',
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
        <EntryText style={{ fontWeight: '600', color: '#aaa', margin: 0 }}>
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
    // TODO:
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
            <EntryText style={{ fontSize: '.9em' }}>
              {metaData.costsPlanned
                ? generateNumberString(metaData.costsPlanned.value, {
                    style: 'currency',
                    currency: metaData.costsPlanned.unit,
                  })
                : metaData.costsPlanned.value + ' ' + metaData.costsPlanned.unit}
            </EntryText>
          </Col>
        </Row>
        <Divider style={{ margin: 0 }} />
        <Row style={{ margin: 0 }}>
          <Col span={12} className={styles.ListTitle}>
            Calculated
          </Col>

          <Col span={12} className={styles.ListValue}>
            <EntryText style={{ fontSize: '.9em' }}>TODO</EntryText>
          </Col>
        </Row>
        <Divider style={{ margin: 0 }} />
        <Row style={{ margin: 0 }}>
          <Col span={12} className={styles.ListTitle}>
            Actual
          </Col>
          <Col span={12} className={styles.ListValue}>
            <EntryText style={{ fontWeight: 1000 }}>TODO</EntryText>
            <Typography.Text
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
            </Typography.Text>
          </Col>
        </Row>
      </Space>,
    ]);
  } else {
  }

  return <DataGrid data={overviewEntries} />;
}
