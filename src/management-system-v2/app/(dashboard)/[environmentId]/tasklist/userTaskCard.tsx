'use client';

import { Card, Col, Progress, Row } from 'antd';
import {
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  StarOutlined,
  FieldTimeOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { generateDateString } from '@/lib/utils';
import { transformMilisecondsToDurationValues } from '@/lib/helpers/timeHelper';

const UserTaskCard = ({
  userTaskData,
  clickHandler,
  selected = false,
}: {
  userTaskData: {
    id: number;
    name: string;
    status: string;
    owner?: string;
    startTime: number;
    endTime: number;
    priority: number;
    progress: number;
  };
  clickHandler?: () => void;
  selected?: boolean;
}) => {
  const durationValues = transformMilisecondsToDurationValues(
    +new Date() - userTaskData.startTime,
    true,
  );

  const durationString =
    ' ' +
    (durationValues.days ? `${durationValues.days}d, ` : '') +
    (durationValues.hours ? `${durationValues.hours}h, ` : '') +
    (durationValues.minutes ? `${durationValues.minutes}min` : '');

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{userTaskData.name}</span>
          <Progress type="circle" percent={userTaskData.progress} size={30} />
        </div>
      }
      bordered={false}
      style={{
        marginBottom: '1rem',
        cursor: 'pointer',
        backgroundColor: selected ? '#eae9e9' : '',
      }}
      className="shaded-card"
      styles={{
        body: {
          paddingInline: '0.75rem',
          paddingBottom: '0.5rem',
          paddingTop: '0.25rem',
          whiteSpace: 'nowrap',
        },
        header: {
          paddingInline: '0.75rem',
          paddingTop: '0.5rem',
          paddingBottom: '0.25rem',
          fontSize: '0.875rem',
          minHeight: '1rem',
        },
      }}
      onClick={() => {
        clickHandler?.();
      }}
    >
      <Row gutter={16}>
        <Col span={10}>
          <span style={{ fontSize: '0.75rem' }}>
            <UserOutlined></UserOutlined> {userTaskData.owner}
          </span>
        </Col>
        <Col span={14}>
          <span style={{ fontSize: '0.75rem' }}>
            <CalendarOutlined></CalendarOutlined>
            {' ' + generateDateString(new Date(userTaskData.startTime), true)}
          </span>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={10}>
          <span style={{ fontSize: '0.75rem' }}>
            <StarOutlined></StarOutlined> {userTaskData.priority}/10
          </span>
        </Col>
        <Col span={14}>
          <span style={{ fontSize: '0.75rem' }}>
            <FieldTimeOutlined></FieldTimeOutlined>
            {durationString}
          </span>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={10}>
          <span style={{ fontSize: '0.75rem' }}>
            <QuestionCircleOutlined></QuestionCircleOutlined> {userTaskData.status}
          </span>
        </Col>
        <Col span={14}>
          <span style={{ fontSize: '0.75rem' }}>
            <ClockCircleOutlined></ClockCircleOutlined>
            {' ' + generateDateString(new Date(userTaskData.endTime), true)}
          </span>
        </Col>
      </Row>
    </Card>
  );
};

export default UserTaskCard;
