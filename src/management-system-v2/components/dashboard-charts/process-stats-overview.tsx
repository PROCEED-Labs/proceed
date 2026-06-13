import React from 'react';
import { Card, Col, Row, Typography } from 'antd';
import { MdPlayArrow, MdPause, MdCheckCircle, MdRocket } from 'react-icons/md';

const { Text } = Typography;

const COLORS = {
  success: '#52c41a',
  warning: '#fa8c16',
  error: '#f5222d',
  purple: '#722ed1',
  blue: '#1677ff',
  green: '#52c41a',
  orange: '#fa8c16',
  red: '#f5222d',
  gray: '#8c8c8c',
};

interface ProcessStatsCardsProps {
  accessibleProcesses: number;
  executableProcesses: number;
  runningProcesses: number;
  pausedProcesses: number;
  completedProcesses: number;
  startedProcesses: number;
  type: 'user' | 'manager';
}

const ProcessStatsCards: React.FC<ProcessStatsCardsProps> = ({
  accessibleProcesses,
  executableProcesses,
  runningProcesses,
  pausedProcesses,
  completedProcesses,
  startedProcesses,
  type,
}) => {
  return (
    <Row
      gutter={[16, 16]}
      style={{
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
      }}
    >
      <Col
        flex="1 1 320px"
        style={{
          minWidth: '280px',
        }}
      >
        <Card bordered={false} style={{ height: '100%' }}>
          <div style={{ marginBottom: '16px' }}>
            <Text type="secondary">Accessible Processes</Text>
            <div style={{ fontSize: '24px', fontWeight: 600 }}>{accessibleProcesses}</div>
          </div>

          <div>
            <Text type="secondary">Executable Processes</Text>
            <div style={{ fontSize: '24px', fontWeight: 600 }}>{executableProcesses}</div>
          </div>
        </Card>
      </Col>

      <Col
        flex="1 1 320px"
        style={{
          minWidth: '280px',
        }}
      >
        <Card bordered={false} style={{ height: '100%' }}>
          <div style={{ marginBottom: '16px' }}>
            <Text type="secondary">Running Processes</Text>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 600,
                color: COLORS.green,
              }}
            >
              {runningProcesses}
            </div>
          </div>

          <div>
            <Text type="secondary">Paused Processes</Text>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 600,
                color: COLORS.orange,
              }}
            >
              {pausedProcesses}
            </div>
          </div>
        </Card>
      </Col>

      <Col
        flex="1 1 320px"
        style={{
          minWidth: '280px',
        }}
      >
        <Card bordered={false} style={{ height: '100%' }}>
          <div style={{ marginBottom: '16px' }}>
            <Text type="secondary">Completed Processes</Text>
            <div style={{ fontSize: '24px', fontWeight: 600 }}>{completedProcesses}</div>
          </div>

          <div>
            <Text type="secondary">Total Processes</Text>
            <div style={{ fontSize: '24px', fontWeight: 600 }}>{startedProcesses}</div>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default ProcessStatsCards;
