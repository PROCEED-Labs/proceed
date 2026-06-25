import { ReactNode } from 'react';
import { Col, Row, Tag, Typography } from 'antd';
import { ClockCircleFilled } from '@ant-design/icons';
import styles from './element-activity.module.scss';
import { ElementLike } from 'diagram-js/lib/model/Types';
import { ExtendedInstanceInfo } from '@/lib/data/instance';

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

export function ElementActivity({
  processId,
  element,
  instance,
}: {
  processId: string;
  element?: ElementLike;
  instance?: ExtendedInstanceInfo;
}) {
  const activityEntries: ReactNode[][] = [];

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
          {activityEntries.map((row, idx_row) => (
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
        {activityLog.map((row, idx_row) => (
          <Row key={'activity' + idx_row} className={styles.GridCell}>
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
