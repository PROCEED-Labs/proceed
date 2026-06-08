import { ReactNode } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Col,
  Image,
  Progress,
  ProgressProps,
  Row,
  Space,
  Tag,
  Typography,
} from 'antd';
import { ClockCircleFilled } from '@ant-design/icons';
import { getPlanDelays, getTimeInfo, statusToType } from './instance-helpers';
import { getMetaDataFromElement } from '@proceed/bpmn-helper';
import { DisplayTable, RelevantInstanceInfo } from './instance-info-panel';
import endpointBuilder from '@/lib/engines/endpoints/endpoint-builder';
import { generateDateString, generateDurationString, generateNumberString } from '@/lib/utils';
import styles from './element-timing.module.scss';
import { InstanceSelector } from './instance-selector';
import { EntryText } from './entry-text';

type EntryTextProps = React.ComponentProps<typeof Typography.Text>;
const TimetableEntryText = (props: EntryTextProps) => (
  <Typography.Text
    ellipsis={{ tooltip: { ...props } }}
    style={{
      wordBreak: 'normal',
    }}
    {...props}
  />
);

const ClockSymbol = () => (
  <ClockCircleFilled style={{ fontSize: '1.1rem', verticalAlign: 'middle' }} />
);

export function ElementTiming({ info }: { info: RelevantInstanceInfo }) {
  if (!info.instance) return <InstanceSelector />;
  const timingEntries: ReactNode[][] = [];

  const metaData = getMetaDataFromElement(info.element.businessObject);
  const token = info.instance?.tokens.find((l) => l.currentFlowElementId == info.element.id);
  const logInfo = info.instance?.log.find((logEntry) => logEntry.flowElementId === info.element.id);

  // Activity time calculation
  const { start, end, duration } = getTimeInfo({
    element: info.element,
    instance: info.instance,
    logInfo,
    token,
  });

  const { delays, plan } = getPlanDelays({ elementMetaData: metaData, start, end, duration });

  // adding an empty line for padding
  timingEntries.push([]);
  // Activity time
  timingEntries.push([
    <Space key="started">
      <ClockSymbol />
      <TimetableEntryText strong>Started:</TimetableEntryText>
      <TimetableEntryText>{generateDateString(start, true)}</TimetableEntryText>
    </Space>,
    <Space key="planned-start">
      <ClockSymbol />
      <TimetableEntryText strong>Planned Start:</TimetableEntryText>
      <TimetableEntryText>{generateDateString(plan.start, true) || ''}</TimetableEntryText>
    </Space>,
    <Space key="start-delay">
      <ClockSymbol />
      <TimetableEntryText strong>Delay:</TimetableEntryText>
      <TimetableEntryText type={delays.start && delays.start >= 1000 ? 'danger' : undefined}>
        {generateDurationString(delays.start)}
      </TimetableEntryText>
    </Space>,
  ]);

  timingEntries.push([
    <Space key="duration">
      <ClockSymbol />
      <TimetableEntryText strong>Duration:</TimetableEntryText>
      <TimetableEntryText>{generateDurationString(duration)}</TimetableEntryText>
    </Space>,
    <Space key="duration-planned">
      <ClockSymbol />
      <TimetableEntryText strong>Planned Duration:</TimetableEntryText>
      <TimetableEntryText>{generateDurationString(plan.duration)}</TimetableEntryText>
    </Space>,
    <Space key="duration-delay">
      <ClockSymbol />
      <TimetableEntryText strong>Delay:</TimetableEntryText>
      <TimetableEntryText type={delays.duration && delays.duration >= 1000 ? 'danger' : undefined}>
        {generateDurationString(delays.duration)}
      </TimetableEntryText>
    </Space>,
  ]);

  timingEntries.push([
    <Space key="end">
      <ClockSymbol />
      <TimetableEntryText strong>Ended:</TimetableEntryText>
      <TimetableEntryText>{generateDateString(end, true)}</TimetableEntryText>
    </Space>,
    <Space key="end-planned">
      <ClockSymbol />
      <TimetableEntryText strong>Planned End:</TimetableEntryText>
      <TimetableEntryText>{generateDateString(plan.end, true) || ''}</TimetableEntryText>
    </Space>,
    <Space key="end-delay">
      <ClockSymbol />
      <TimetableEntryText strong>Delay:</TimetableEntryText>
      <TimetableEntryText type={delays.end && delays.end >= 1000 ? 'danger' : undefined}>
        {generateDurationString(delays.end)}
      </TimetableEntryText>
    </Space>,
  ]);

  const activityLog: [string, 'INFO' | 'WARN', string][] = [
    ['09:14:02', 'INFO', 'Process started by m.chen'],
    ['09:15:02', 'INFO', "ZStep 'Receive Application' started"],
    ['09:16:13', 'INFO', "Step 'Receive Application' completed"],
    ['09:18:23', 'INFO', "Gateway 'Application complete?' yes"],
    ['09:23:13', 'INFO', "Step 'Credit Check' started"],
    ['09:19:35', 'WARN', 'Credit Bureau response delayed (retry 1/3)'],
    ['09:25:54', 'INFO', "Step 'Credit Check' completed"],
    ['09:35:23', 'INFO', "Step 'Manager Approval' started"],
  ];

  const tagStatuus: Record<'INFO' | 'WARN', string> = {
    INFO: 'processing',
    WARN: 'warning',
  };

  return (
    <>
      <table
        style={{
          borderSpacing: '0 .5rem',
          borderCollapse: 'separate',
        }}
      >
        <colgroup>
          <col style={{ width: 150 }} />
          <col />
        </colgroup>
        <tbody>
          {timingEntries.map((row, idx_row) => (
            <tr key={idx_row}>
              {row.map((cell, idx_cell) => (
                <td
                  key={`${idx_row}.${idx_cell}`}
                  style={{
                    paddingRight: idx_cell < row.length - 1 ? '1rem' : '',
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div
        className={styles.GridContainer}
        style={{ border: 'solid 1px #ddd', borderRadius: 12, marginBlock: 15 }}
      >
        {activityLog.map((row) => (
          <Row className={styles.GridCell}>
            <Col flex="70px" style={{ display: 'flex', justifyContent: 'center' }}>
              {row[0]}
            </Col>

            <Col flex="70px" style={{ display: 'flex', justifyContent: 'center' }}>
              <Tag color={tagStatuus[row[1]]}>{row[1]}</Tag>
            </Col>

            <Col flex="auto" style={{ padding: '0 10px' }}>
              {row[2]}
            </Col>
          </Row>
        ))}
      </div>
    </>
  );
}
