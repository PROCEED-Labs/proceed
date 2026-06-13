import React from 'react';
import { Card, Col, Row, Typography } from 'antd';
import styles from './dashboard-charts.module.scss';

const { Text } = Typography;

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
      <Col flex="1 1 320px" className={styles.statsCol}>
        <Card variant="borderless" className={styles.statsCardFull}>
          <div className={styles.statsBlockMargin}>
            <Text type="secondary">Accessible Processes</Text>
            <div className={styles.statsValue}>{accessibleProcesses}</div>
          </div>

          <div>
            <Text type="secondary">Executable Processes</Text>
            <div className={styles.statsValue}>{executableProcesses}</div>
          </div>
        </Card>
      </Col>

      <Col flex="1 1 320px" className={styles.statsCol}>
        <Card variant="borderless" className={styles.statsCardFull}>
          <div className={styles.statsBlockMargin}>
            <Text type="secondary">Running Processes</Text>
            <div className={`${styles.statsValue} ${styles.statsValueGreen}`}>
              {runningProcesses}
            </div>
          </div>

          <div>
            <Text type="secondary">Paused Processes</Text>
            <div className={`${styles.statsValue} ${styles.statsValueOrange}`}>
              {pausedProcesses}
            </div>
          </div>
        </Card>
      </Col>

      <Col flex="1 1 320px" className={styles.statsCol}>
        <Card variant="borderless" className={styles.statsCardFull}>
          <div className={styles.statsBlockMargin}>
            <Text type="secondary">Completed Processes</Text>
            <div className={styles.statsValue}>{completedProcesses}</div>
          </div>

          <div>
            <Text type="secondary">Total Processes</Text>
            <div className={styles.statsValue}>{startedProcesses}</div>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default ProcessStatsCards;
