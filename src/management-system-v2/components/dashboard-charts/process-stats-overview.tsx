import React from 'react';
import { Card, Col, Row, Typography } from 'antd';
import styles from './dashboard-charts.module.scss';

const { Text } = Typography;

interface ProcessStatPairProps {
  topLabel: string;
  topValue: number;
  bottomLabel: string;
  bottomValue: number;
  topColorClass?: string;
  bottomColorClass?: string;
}

const ProcessStatPair: React.FC<ProcessStatPairProps> = ({
  topLabel,
  topValue,
  bottomLabel,
  bottomValue,
  topColorClass,
  bottomColorClass,
}) => (
  <Col flex="1 1 320px" className={styles.statsCol}>
    <Card variant="borderless" className={styles.statsCardFull}>
      <div className={styles.statsBlockMargin}>
        <Text type="secondary">{topLabel}</Text>
        <div className={`${styles.statsValue} ${topColorClass ?? ''}`}>{topValue}</div>
      </div>
      <div>
        <Text type="secondary">{bottomLabel}</Text>
        <div className={`${styles.statsValue} ${bottomColorClass ?? ''}`}>{bottomValue}</div>
      </div>
    </Card>
  </Col>
);

interface ProcessStatsCardsProps {
  accessibleProcesses: number;
  executableProcesses: number;
  runningProcesses: number;
  pausedProcesses: number;
  completedProcesses: number;
  startedProcesses: number;
}

const ProcessStatsCards: React.FC<ProcessStatsCardsProps> = ({
  accessibleProcesses,
  executableProcesses,
  runningProcesses,
  pausedProcesses,
  completedProcesses,
  startedProcesses,
}) => {
  return (
    <Row gutter={[16, 16]} className={styles.statsRow}>
      <ProcessStatPair
        topLabel="Accessible Processes"
        topValue={accessibleProcesses}
        bottomLabel="Executable Processes"
        bottomValue={executableProcesses}
      />
      <ProcessStatPair
        topLabel="Running Processes"
        topValue={runningProcesses}
        topColorClass={styles.statsValueGreen}
        bottomLabel="Paused Processes"
        bottomValue={pausedProcesses}
        bottomColorClass={styles.statsValueOrange}
      />
      <ProcessStatPair
        topLabel="Completed Processes"
        topValue={completedProcesses}
        bottomLabel="Total Processes"
        bottomValue={startedProcesses}
      />
    </Row>
  );
};

export default ProcessStatsCards;
