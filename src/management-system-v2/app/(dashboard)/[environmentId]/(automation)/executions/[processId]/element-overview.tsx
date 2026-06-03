import { ReactNode } from 'react';
import { Col, Divider, Menu, Row, Space, Typography } from 'antd';
import { DataGrid, DisplayTable, RelevantInstanceInfo } from './instance-info-panel';
import { InstanceSelector } from './instance-selector';
import { getMetaDataFromElement } from '@proceed/bpmn-helper';
import ImageSelectionSection from '../../../processes/[mode]/[processId]/image-selection-section';
import TextViewer from '@/components/text-viewer';
import { getPlanDelays, getTimeInfo } from './instance-helpers';
import { generateDateString, generateDurationString } from '@/lib/utils';
import styles from './element-overwiew.module.scss';
import { EntryText } from './entry-text';

export function ElementOverview({ info }: { info: RelevantInstanceInfo }) {
  if (!info.instance) return <InstanceSelector />;
  const overviewEntries: ReactNode[][] = [];
  const metaData = getMetaDataFromElement(info.element.businessObject);
  const isRootElement = info.element && info.element.type === 'bpmn:Process';
  const token = info.instance?.tokens.find((l) => l.currentFlowElementId == info.element.id);
  const logInfo = info.instance?.log.find((logEntry) => logEntry.flowElementId === info.element.id);

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
      <div style={{ margin: 0, padding: 0 }}>
        <Typography.Title level={4} style={{ fontWeight: 'bold', margin: 0 }}>
          Vacation Requests Automated
        </Typography.Title>
        <EntryText style={{ fontWeight: '600', color: '#aaa', margin: 0 }}>Vac-Req-Aut</EntryText>
      </div>,
    ]);

    // description
    overviewEntries.push([
      <div style={{ fontSize: '.95em', color: '#777' }}>
        <TextViewer initialValue={info.element.businessObject?.documentation?.[0]?.text} />
      </div>,
    ]);

    // time info
    const { start, end, duration } = getTimeInfo({
      element: info.element,
      instance: info.instance,
      logInfo,
      token,
    });
    const { delays, plan } = getPlanDelays({ elementMetaData: metaData, start, end, duration });

    // Timing
    overviewEntries.push([
      <div
        style={{
          border: '1.5px solid #ddd',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div className={styles.GridContainer}>
          <div className={styles.GridCell}>
            <EntryText>Started</EntryText>
            <br />
            <EntryText>{generateDateString(start, true)}</EntryText>
          </div>

          <div className={styles.GridCell}>
            <EntryText>Running for</EntryText>
            <br />
            <EntryText>{generateDurationString(duration)}</EntryText>
          </div>

          <div className={styles.GridCell}>
            <EntryText>Planned</EntryText>
            <br />
            <EntryText>{generateDurationString(plan.duration)}</EntryText>
          </div>

          <div className={styles.GridCell}>
            <EntryText>Started by</EntryText>
            <br />
            <EntryText>Timmy Test</EntryText>
          </div>
        </div>
      </div>,
    ]);

    // Budget
    overviewEntries.push([
      <EntryText style={{ fontWeight: '600', fontSize: '.9em', color: 'gray' }}>BUDGET</EntryText>,
    ]);
    overviewEntries.push([
      <Space
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
            <EntryText style={{ fontSize: '.9em' }}>$500</EntryText>
          </Col>
        </Row>
        <Divider style={{ margin: 0 }} />
        <Row style={{ margin: 0 }}>
          <Col span={12} className={styles.ListTitle}>
            Calculated
          </Col>

          <Col span={12} className={styles.ListValue}>
            <EntryText style={{ fontSize: '.9em' }}>$520</EntryText>
          </Col>
        </Row>
        <Divider style={{ margin: 0 }} />
        <Row style={{ margin: 0 }}>
          <Col span={12} className={styles.ListTitle}>
            Actual
          </Col>
          <Col span={12} className={styles.ListValue}>
            <EntryText style={{ fontWeight: 1000 }}>$520</EntryText>
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
