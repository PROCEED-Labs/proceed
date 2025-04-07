'use client';

import React from 'react';
import { Card, Col, Progress, Row, Tooltip, Typography } from 'antd';
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
import { ExtendedTaskListEntry } from './user-task-view';

const OwnerInfo: React.FC<{ task: ExtendedTaskListEntry }> = ({ task }) => {
  let owner = '';

  if (task.actualOwner.length === 1) {
    owner = task.actualOwner[0].name || task.actualOwner[0].userName || '<unknown>';
  } else if (task.actualOwner.length > 1) {
    owner = task.actualOwner.map(({ name, userName }) => name || userName).join(' | ');
  }

  return (
    <Tooltip title={owner}>
      <UserOutlined />{' '}
      <Typography.Text ellipsis style={{ fontSize: 'inherit' }}>
        {owner}
      </Typography.Text>
    </Tooltip>
  );
};

const UserTaskCard = ({
  userTaskData,
  clickHandler,
  selected = false,
}: {
  userTaskData: ExtendedTaskListEntry;
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{userTaskData.name}</span>
          <Progress type="circle" percent={userTaskData.progress} size={30} />
        </div>
      }
      bordered={false}
      style={{
        width: '100%',
        cursor: 'pointer',
        backgroundColor: selected ? '#eae9e9' : '',
      }}
      className="shaded-card"
      styles={{
        body: {
          paddingInline: '0.75rem',
          paddingBlock: '0.5rem',
          whiteSpace: 'nowrap',
        },
        header: {
          paddingInline: '0.75rem',
          paddingBlock: '0.25rem',
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
            <OwnerInfo task={userTaskData} />
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
            <QuestionCircleOutlined></QuestionCircleOutlined> {userTaskData.state}
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
