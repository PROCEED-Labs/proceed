import { ReactNode } from 'react';
import { Alert, Button, Checkbox, Image, Progress, ProgressProps, Space, Typography } from 'antd';
import { ClockCircleFilled } from '@ant-design/icons';
import { getPlanDelays, getTimeInfo, statusToType } from './instance-helpers';
import { getMetaDataFromElement } from '@proceed/bpmn-helper';
import { DisplayTable, RelevantInstanceInfo } from './instance-info-panel';
import endpointBuilder from '@/lib/engines/endpoints/endpoint-builder';
import { generateDateString, generateDurationString, generateNumberString } from '@/lib/utils';
import styles from './element-status.module.scss';

type EntryTextProps = React.ComponentProps<typeof Typography.Text>;
const EntryText = (props: EntryTextProps) => (
  <Typography.Text ellipsis={{ tooltip: { ...props } }} className={styles.ElementText} {...props} />
);

const ClockSymbol = () => (
  <ClockCircleFilled style={{ fontSize: '1.1rem', verticalAlign: 'middle' }} />
);

export function ElementTiming({ info }: { info: RelevantInstanceInfo }) {
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
      <EntryText strong>Started:</EntryText>
      <EntryText>{generateDateString(start, true)}</EntryText>
    </Space>,
    <Space key="planned-start">
      <ClockSymbol />
      <EntryText strong>Planned Start:</EntryText>
      <EntryText>{generateDateString(plan.start, true) || ''}</EntryText>
    </Space>,
    <Space key="start-delay">
      <ClockSymbol />
      <EntryText strong>Delay:</EntryText>
      <EntryText type={delays.start && delays.start >= 1000 ? 'danger' : undefined}>
        {generateDurationString(delays.start)}
      </EntryText>
    </Space>,
  ]);

  timingEntries.push([
    <Space key="duration">
      <ClockSymbol />
      <EntryText strong>Duration:</EntryText>
      <EntryText>{generateDurationString(duration)}</EntryText>
    </Space>,
    <Space key="duration-planned">
      <ClockSymbol />
      <EntryText strong>Planned Duration:</EntryText>
      <EntryText>{generateDurationString(plan.duration)}</EntryText>
    </Space>,
    <Space key="duration-delay">
      <ClockSymbol />
      <EntryText strong>Delay:</EntryText>
      <EntryText type={delays.duration && delays.duration >= 1000 ? 'danger' : undefined}>
        {generateDurationString(delays.duration)}
      </EntryText>
    </Space>,
  ]);

  timingEntries.push([
    <Space key="end">
      <ClockSymbol />
      <EntryText strong>Ended:</EntryText>
      <EntryText>{generateDateString(end, true)}</EntryText>
    </Space>,
    <Space key="end-planned">
      <ClockSymbol />
      <EntryText strong>Planned End:</EntryText>
      <EntryText>{generateDateString(plan.end, true) || ''}</EntryText>
    </Space>,
    <Space key="end-delay">
      <ClockSymbol />
      <EntryText strong>Delay:</EntryText>
      <EntryText type={delays.end && delays.end >= 1000 ? 'danger' : undefined}>
        {generateDurationString(delays.end)}
      </EntryText>
    </Space>,
  ]);

  return (
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
  );
}
